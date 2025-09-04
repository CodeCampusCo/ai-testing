// Simplified AI Test Workflow without complex LangGraph dependencies
import { WorkflowState, TestScenario, TestResult, TestAnalysis, AIProviderConfig } from '../types/workflow.js';
import { MCPClientConfig } from '../types/mcp.js';
import { ScenarioGeneratorAgent } from '../agents/scenario-generator.js';
import { TestExecutorAgent } from '../agents/test-executor.js';
import { AnalysisAgent } from '../agents/analysis-agent.js';

export interface SimpleTestWorkflowConfig {
  aiProvider: AIProviderConfig;
  mcpConfig: MCPClientConfig;
  logger?: {
    debug: (msg: string, ...args: any[]) => void;
    info: (msg: string, ...args: any[]) => void;
    warn: (msg: string, ...args: any[]) => void;
    error: (msg: string, ...args: any[]) => void;
  };
}

export class SimpleTestWorkflow {
  private scenarioAgent: ScenarioGeneratorAgent;
  private executorAgent: TestExecutorAgent;
  private analysisAgent: AnalysisAgent;
  private logger: SimpleTestWorkflowConfig['logger'];

  constructor(private config: SimpleTestWorkflowConfig) {
    this.logger = config.logger || this.createDefaultLogger();
    
    // Initialize agents
    this.scenarioAgent = new ScenarioGeneratorAgent(config.aiProvider, this.logger);
    this.executorAgent = new TestExecutorAgent(config.mcpConfig, this.logger);
    this.analysisAgent = new AnalysisAgent(config.aiProvider, this.logger);
  }

  private createDefaultLogger() {
    return {
      debug: (msg: string, ...args: any[]) => console.log(`[DEBUG] ${msg}`, ...args),
      info: (msg: string, ...args: any[]) => console.log(`[INFO] ${msg}`, ...args),
      warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${msg}`, ...args),
      error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args)
    };
  }

  async run(input: string): Promise<WorkflowState> {
    this.logger?.info('Starting test workflow...');
    
    let state: WorkflowState = {
      input,
      currentStep: 'generate'
    };

    try {
      // Step 1: Generate Scenario
      state = await this.generateScenario(state);
      if (state.error) return state;

      // Step 2: Execute Test  
      state = await this.executeTest(state);
      if (state.error) return state;

      // Step 3: Analyze Results
      state = await this.analyzeResults(state);

      return state;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger?.error(`Workflow execution failed: ${errorMessage}`);
      
      return {
        ...state,
        currentStep: 'complete',
        error: `Workflow execution failed: ${errorMessage}`
      };
    }
  }

  async runStreaming(input: string, onUpdate?: (state: WorkflowState) => void): Promise<WorkflowState> {
    this.logger?.info('Starting streaming test workflow...');
    
    let state: WorkflowState = {
      input,
      currentStep: 'generate'
    };

    const updateState = (newState: Partial<WorkflowState>) => {
      state = { ...state, ...newState };
      if (onUpdate) {
        onUpdate(state);
      }
      return state;
    };

    try {
      // Step 1: Generate Scenario
      updateState({ currentStep: 'generate' });
      state = await this.generateScenario(state);
      updateState(state);
      if (state.error) return state;

      // Step 2: Execute Test  
      updateState({ currentStep: 'execute' });
      state = await this.executeTest(state);
      updateState(state);
      if (state.error) return state;

      // Step 3: Analyze Results
      updateState({ currentStep: 'analyze' });
      state = await this.analyzeResults(state);
      updateState({ ...state, currentStep: 'complete' });

      return state;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger?.error(`Streaming workflow execution failed: ${errorMessage}`);
      
      const finalState = {
        ...state,
        currentStep: 'complete' as const,
        error: `Streaming workflow execution failed: ${errorMessage}`
      };
      updateState(finalState);
      return finalState;
    }
  }

  private async generateScenario(state: WorkflowState): Promise<WorkflowState> {
    this.logger?.info('Generating test scenario...');
    
    try {
      // Parse input - could be just description or structured input
      const input = this.parseInput(state.input);
      
      const scenario = await this.scenarioAgent.process(input);
      
      return {
        ...state,
        scenario,
        currentStep: 'execute',
        error: undefined
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger?.error(`Scenario generation failed: ${errorMessage}`);
      
      return {
        ...state,
        currentStep: 'complete',
        error: `Scenario generation failed: ${errorMessage}`
      };
    }
  }

  private async executeTest(state: WorkflowState): Promise<WorkflowState> {
    this.logger?.info('Executing test...');
    
    if (!state.scenario) {
      return {
        ...state,
        currentStep: 'complete',
        error: 'No scenario available for execution'
      };
    }
    
    try {
      const executionResult = await this.executorAgent.process(state.scenario);
      
      return {
        ...state,
        executionResult,
        currentStep: 'analyze',
        error: undefined
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger?.error(`Test execution failed: ${errorMessage}`);
      
      return {
        ...state,
        currentStep: 'complete',
        error: `Test execution failed: ${errorMessage}`
      };
    }
  }

  private async analyzeResults(state: WorkflowState): Promise<WorkflowState> {
    this.logger?.info('Analyzing results...');
    
    if (!state.scenario || !state.executionResult) {
      return {
        ...state,
        currentStep: 'complete',
        error: 'Missing scenario or execution results for analysis'
      };
    }
    
    try {
      const analysis = await this.analysisAgent.process({
        scenario: state.scenario,
        result: state.executionResult
      });
      
      return {
        ...state,
        analysis,
        currentStep: 'complete',
        error: undefined
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger?.error(`Results analysis failed: ${errorMessage}`);
      
      return {
        ...state,
        currentStep: 'complete',
        error: `Results analysis failed: ${errorMessage}`,
        analysis: {
          summary: 'Analysis failed due to error',
          passed: state.executionResult?.status === 'passed',
          issues: [errorMessage],
          suggestions: ['Check logs for detailed error information'],
          performanceMetrics: {
            totalDuration: state.executionResult?.duration || 0,
            averageStepDuration: 0,
          },
          accessibilityScore: 0
        }
      };
    }
  }

  private parseInput(input: string): {
    description: string;
    url?: string;
    userStory?: string;
    acceptanceCriteria?: string[];
  } {
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed === 'object' && parsed.description) {
        return parsed;
      }
    } catch {
      // Not JSON, treat as simple description
    }
    
    // Simple parsing for common patterns
    const lines = input.split('\n').filter(line => line.trim());
    let description = input;
    let url: string | undefined;
    const acceptanceCriteria: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Extract URL
      if (trimmed.startsWith('URL:') || trimmed.startsWith('url:')) {
        url = trimmed.substring(4).trim();
        continue;
      }
      
      // Extract acceptance criteria
      if (trimmed.startsWith('- ') || /^\d+\./.test(trimmed)) {
        acceptanceCriteria.push(trimmed.replace(/^[-\d.]\s*/, ''));
        continue;
      }
    }
    
    // If we found structured content, use first line as description
    if (url || acceptanceCriteria.length > 0) {
      description = lines[0] || input;
    }
    
    return {
      description,
      url,
      acceptanceCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : undefined
    };
  }
}

// Export utility function to create workflow  
export function createSimpleTestWorkflow(config: SimpleTestWorkflowConfig): SimpleTestWorkflow {
  return new SimpleTestWorkflow(config);
}