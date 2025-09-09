import { StateGraph, START, END, StateGraphArgs } from '@langchain/langgraph';
import {
  AIProviderConfig,
  TestAnalysis,
  TestResult,
  TestScenario,
  WorkflowState,
} from '../types/workflow.js';
import { MCPClientConfig } from '../types/mcp.js';
import { TestExecutorAgent } from '../agents/test-executor.js';
import { AnalysisAgent } from '../agents/analysis-agent.js';
import { ParsingAgent } from '../agents/parsing-agent.js';
import { StepProgressManager } from '../ui/step-progress.js';

// Configuration for the new workflow class
export interface LangGraphWorkflowConfig {
  aiProvider: AIProviderConfig;
  mcpConfig: MCPClientConfig;
  logger?: {
    debug: (msg: string, ...args: any[]) => void;
    info: (msg: string, ...args: any[]) => void;
    warn: (msg: string, ...args: any[]) => void;
    error: (msg: string, ...args: any[]) => void;
  };
  progressManager?: StepProgressManager;
}

// Define the state channels using the correct type from StateGraphArgs
const graphState: StateGraphArgs<WorkflowState>['channels'] = {
  input: {
    value: (x, y) => y,
    default: () => '',
  },
  scenario: {
    value: (x, y) => y,
  },
  executionResult: {
    value: (x, y) => y,
  },
  analysis: {
    value: (x, y) => y,
  },
  error: {
    value: (x, y) => y,
  },
  currentStep: {
    value: (x, y) => y,
    default: () => 'generate',
  },
};

// Agent instances will be held here
let executorAgent: TestExecutorAgent;
let analysisAgent: AnalysisAgent;
let parsingAgent: ParsingAgent;

// Node functions
const executeTestNode = async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
  if (!state.scenario) {
    return { error: 'No scenario to execute', currentStep: 'complete' };
  }
  try {
    const executionResult = await executorAgent.process(state.scenario);
    return { executionResult, currentStep: 'analyze' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { error: `Test execution failed: ${errorMessage}`, currentStep: 'complete' };
  }
};

const analyzeResultsNode = async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
  if (!state.scenario || !state.executionResult) {
    return { error: 'Missing data for analysis', currentStep: 'complete' };
  }
  try {
    const analysis = await analysisAgent.process({
      scenario: state.scenario,
      result: state.executionResult,
    });
    return { analysis, currentStep: 'complete' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { error: `Analysis failed: ${errorMessage}`, currentStep: 'complete' };
  }
};

// This new node parses markdown input when generation is skipped
const parseInputNode = async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
  try {
    const scenario = await parsingAgent.process(state.input);
    return { scenario, currentStep: 'execute' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { error: `Markdown parsing failed: ${errorMessage}`, currentStep: 'complete' };
  }
};

// Conditional routing function
const decideNextStep = (state: WorkflowState): 'execute' | 'analyze' | '__end__' => {
  if (state.error) {
    return '__end__';
  }
  // Simplified: The currentStep is already the desired next step.
  return state.currentStep as 'execute' | 'analyze';
};

// Build the graph
const workflow = new StateGraph({ channels: graphState })
  .addNode('parse', parseInputNode)
  .addNode('execute', executeTestNode)
  .addNode('analyze', analyzeResultsNode);

workflow.addEdge(START, 'parse');

// After parsing, decide if we can execute or if we should end due to a parsing error.
workflow.addConditionalEdges(
  'parse',
  (state: WorkflowState) => {
    if (state.error || !state.scenario) {
      return END; // Use the predefined END channel
    }
    return 'execute';
  },
  {
    execute: 'execute',
    [END]: END,
  }
);

workflow.addConditionalEdges('execute', decideNextStep, {
  analyze: 'analyze',
  __end__: END,
});
workflow.addEdge('analyze', END);

// Compile the graph
const app = workflow.compile();

import { LangChainAIService } from '../ai/langchain-service.js';

// ... (rest of the file)

export class LangGraphWorkflow {
  private logger: {
    debug: (msg: string, ...args: any[]) => void;
    info: (msg: string, ...args: any[]) => void;
    warn: (msg: string, ...args: any[]) => void;
    error: (msg: string, ...args: any[]) => void;
  };
  private aiService: LangChainAIService;
  private isInitialized = false;

  constructor(private config: LangGraphWorkflowConfig) {
    const effectiveLogger = config.logger || this.createDefaultLogger();
    this.logger = effectiveLogger;
    this.aiService = new LangChainAIService(config.aiProvider, effectiveLogger);
  }

  async initialize() {
    if (this.isInitialized) return;
    await this.aiService.initialize();

    executorAgent = new TestExecutorAgent(
      this.config.mcpConfig,
      this.aiService,
      this.logger,
      this.config.progressManager
    );
    analysisAgent = new AnalysisAgent(this.aiService, this.logger);
    parsingAgent = new ParsingAgent(this.aiService, this.logger);
    this.isInitialized = true;
  }

  private createDefaultLogger() {
    return {
      debug: (msg: string, ...args: any[]) => console.log(`[DEBUG] ${msg}`, ...args),
      info: (msg: string, ...args: any[]) => console.log(`[INFO] ${msg}`, ...args),
      warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${msg}`, ...args),
      error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
    };
  }

  async run(input: string): Promise<WorkflowState> {
    if (!this.isInitialized) {
      throw new Error('Workflow not initialized. Call initialize() first.');
    }
    this.logger?.info('Running LangGraph workflow...');
    const initialState: WorkflowState = {
      input,
      currentStep: 'parse',
    };

    const finalState = await app.invoke(initialState);
    this.logger?.info('LangGraph workflow complete.');
    return finalState;
  }

  async runStreaming(
    input: string,
    onUpdate?: (state: WorkflowState) => void
  ): Promise<WorkflowState> {
    if (!this.isInitialized) {
      throw new Error('Workflow not initialized. Call initialize() first.');
    }
    this.logger?.info('Running LangGraph streaming workflow...');
    const initialState: WorkflowState = {
      input,
      currentStep: 'parse',
    };

    let finalState: WorkflowState = initialState;
    for await (const event of await app.stream(initialState)) {
      // The event object has a complex structure, we are interested in the state of the nodes
      const nodeName = Object.keys(event)[0];
      if (nodeName) {
        const nodeState = event[nodeName];
        finalState = { ...finalState, ...nodeState };
        if (onUpdate) {
          onUpdate(finalState);
        }
      }
    }

    this.logger?.info('LangGraph streaming workflow complete.');
    return finalState;
  }
}
