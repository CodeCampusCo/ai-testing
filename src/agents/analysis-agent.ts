import { AIAgent, AgentError } from './base.js';
import { TestResult, TestAnalysis, TestScenario } from '../types/workflow.js';
import { LangChainAIService } from '../ai/langchain-service.js';

interface AnalysisInput {
  scenario: TestScenario;
  result: TestResult;
}

export class AnalysisAgent extends AIAgent<AnalysisInput, TestAnalysis> {
  name = 'TestAnalysis';
  description = 'Analyzes test results and provides insights and recommendations';

  constructor(aiService: LangChainAIService, logger: any) {
    super(aiService, logger);
  }

  async process(input: AnalysisInput): Promise<TestAnalysis> {
    this.logger.info(`Analyzing test results for scenario: ${input.scenario.id}`);

    try {
      // Generate basic analysis
      const basicAnalysis = this.generateBasicAnalysis(input);

      // Use AI for detailed insights
      const aiInsights = await this.generateAIInsights(input, basicAnalysis);

      const analysis: TestAnalysis = {
        summary: aiInsights.summary,
        passed: basicAnalysis.passed ?? false,
        issues: basicAnalysis.issues ?? [],
        suggestions: aiInsights.suggestions,
        performanceMetrics: basicAnalysis.performanceMetrics ?? {
          totalDuration: 0,
          averageStepDuration: 0,
        },
        accessibilityScore: basicAnalysis.accessibilityScore ?? 0,
        tokenUsage: this.aiService.getTotalTokenUsage(),
      };

      this.logger.info(
        `Analysis complete: ${analysis.passed ? 'PASSED' : 'FAILED'} ` +
          `(${analysis.issues.length} issues, accessibility: ${analysis.accessibilityScore}%)`
      );

      return analysis;
    } catch (error) {
      throw new AgentError(
        `Failed to analyze test results: ${error instanceof Error ? error.message : error}`,
        this.name,
        error instanceof Error ? error : undefined
      );
    }
  }

  private generateBasicAnalysis(input: AnalysisInput): Partial<TestAnalysis> {
    const { result } = input;

    // Calculate performance metrics
    const performanceMetrics = {
      totalDuration: result.duration,
      averageStepDuration: result.steps.length > 0 ? result.duration / result.steps.length : 0,
      slowestStep: this.findSlowestStep(result),
    };

    // Calculate accessibility score
    const accessibilityScore = this.calculateAccessibilityScore(result);

    // Identify issues
    const issues: string[] = [];

    if (result.status === 'failed') {
      issues.push(`Test failed: ${result.error || 'Unknown error'}`);
    }

    result.steps.forEach(step => {
      if (step.status === 'failed') {
        issues.push(`Step "${step.stepId}" failed: ${step.error}`);
      }
    });

    if (result.accessibility?.issues) {
      result.accessibility.issues.forEach(issue => {
        if (issue.severity === 'high') {
          issues.push(`Accessibility: ${issue.description}`);
        }
      });
    }

    // Performance issues
    if (performanceMetrics.totalDuration > 30000) {
      issues.push(`Test took too long: ${performanceMetrics.totalDuration}ms`);
    }

    result.steps.forEach(step => {
      if (step.duration > 10000) {
        issues.push(`Step "${step.stepId}" was slow: ${step.duration}ms`);
      }
    });

    return {
      passed: result.status === 'passed',
      issues,
      performanceMetrics,
      accessibilityScore,
    };
  }

  private async generateAIInsights(
    input: AnalysisInput,
    basicAnalysis: Partial<TestAnalysis>
  ): Promise<Pick<TestAnalysis, 'summary' | 'suggestions'>> {
    const userPrompt = this.buildUserPrompt(input, basicAnalysis);
    const insights = await this.aiService.analyzeTestResults(userPrompt);

    return {
      summary: insights.summary || 'Analysis completed',
      suggestions: Array.isArray(insights.suggestions) ? insights.suggestions : [],
    };
  }

  private buildUserPrompt(input: AnalysisInput, basicAnalysis: Partial<TestAnalysis>): string {
    const { scenario, result } = input;

    let prompt = `Analyze this test execution:\n\n`;

    // Test scenario info
    prompt += `**Test Scenario:**\n`;
    prompt += `- ID: ${scenario.id}\n`;
    prompt += `- Description: ${scenario.description}\n`;
    prompt += `- Steps: ${scenario.steps.length}\n`;
    prompt += `- Priority: ${scenario.metadata?.priority || 'unknown'}\n\n`;

    // Execution results
    prompt += `**Execution Results:**\n`;
    prompt += `- Status: ${result.status}\n`;
    prompt += `- Duration: ${result.duration}ms\n`;
    prompt += `- Steps executed: ${result.steps.length}\n`;
    prompt += `- Screenshots taken: ${result.screenshots.length}\n`;

    if (result.error) {
      prompt += `- Error: ${result.error}\n`;
    }

    // Step details
    prompt += `\n**Step Results:**\n`;
    result.steps.forEach((step, index) => {
      let breakdown = '';
      if (step.durationBreakdown) {
        breakdown = ` (AI: ${step.durationBreakdown.ai}ms, MCP: ${step.durationBreakdown.mcp}ms)`;
      }
      prompt += `${index + 1}. ${step.stepId}: ${step.status} (${step.duration}ms)${breakdown}`;
      if (step.error) {
        prompt += ` - Error: ${step.error}`;
      }
      prompt += `\n`;
    });

    // Performance metrics
    if (basicAnalysis.performanceMetrics) {
      prompt += `\n**Performance:**\n`;
      prompt += `- Total duration: ${basicAnalysis.performanceMetrics.totalDuration}ms\n`;
      prompt += `- Average step duration: ${basicAnalysis.performanceMetrics.averageStepDuration.toFixed(0)}ms\n`;
      if (basicAnalysis.performanceMetrics.slowestStep) {
        prompt += `- Slowest step: ${basicAnalysis.performanceMetrics.slowestStep}\n`;
      }
    }

    // Accessibility info
    if (result.accessibility) {
      prompt += `\n**Accessibility:**\n`;
      prompt += `- Elements found: ${result.accessibility.elementsFound}\n`;
      prompt += `- Interactable elements: ${result.accessibility.interactableElements}\n`;
      prompt += `- Issues: ${result.accessibility.issues.length}\n`;
      if (result.accessibility.issues.length > 0) {
        result.accessibility.issues.forEach(issue => {
          prompt += `  - ${issue.severity}: ${issue.description}\n`;
        });
      }
    }

    // Issues summary
    if (basicAnalysis.issues && basicAnalysis.issues.length > 0) {
      prompt += `\n**Identified Issues:**\n`;
      basicAnalysis.issues.forEach((issue, index) => {
        prompt += `${index + 1}. ${issue}\n`;
      });
    }

    prompt += `\nProvide a comprehensive analysis with specific, actionable recommendations for improving this test and the application being tested.`;

    return prompt;
  }

  private findSlowestStep(result: TestResult): string | undefined {
    if (result.steps.length === 0) return undefined;

    const slowest = result.steps.reduce((prev, current) =>
      prev.duration > current.duration ? prev : current
    );

    return `${slowest.stepId} (${slowest.duration}ms)`;
  }

  private calculateAccessibilityScore(result: TestResult): number {
    if (!result.accessibility) return 0;

    const { elementsFound, interactableElements, issues } = result.accessibility;

    if (elementsFound === 0) return 0;

    // Base score
    let score = 100;

    // Deduct points for issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    // Bonus for good interactable element coverage
    if (interactableElements > 0) {
      const interactableRatio = interactableElements / elementsFound;
      if (interactableRatio > 0.1) {
        score += 5; // Bonus for having good interactive content
      }
    }

    return Math.max(0, Math.min(100, score));
  }
}
