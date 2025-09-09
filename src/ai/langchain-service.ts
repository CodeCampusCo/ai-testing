import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { z } from 'zod';
import { AIProviderConfig } from '../types/workflow.js';
import {
  buildAnalysisPrompt,
  buildBatchVerifyOutcomesPrompt,
  buildMCPCommandsPrompt,
  buildParseScenarioPrompt,
} from './prompts/prompt-factory.js';
import { createModel } from './models/model-factory.js';

// Schemas for structured outputs
export const MCPCallSchema = z.object({
  tool: z.string(),
  args: z.any(),
});

export const MCPCallsSchema = z.array(MCPCallSchema);

export const BatchVerificationResultSchema = z.array(
  z.object({
    description: z.string(),
    status: z.enum(['passed', 'failed']),
    error: z.string().optional(),
  })
);

export const ParsedScenarioSchema = z.object({
  description: z.string().describe('The main title or description of the test scenario.'),
  rawSteps: z
    .array(z.string())
    .describe('An array of strings, each representing a single test step.'),
  rawOutcomes: z
    .array(z.string())
    .describe('An array of strings, each representing an expected outcome.'),
});

export const AIAnalysisSchema = z.object({
  summary: z.string(),
  suggestions: z.array(z.string()),
});

// LangChain-based AI Service
export class LangChainAIService {
  private model: any;
  private logger: any;
  private totalTokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  constructor(
    private config: AIProviderConfig,
    logger: {
      debug: (msg: string, ...args: any[]) => void;
      info: (msg: string, ...args: any[]) => void;
      warn: (msg: string, ...args: any[]) => void;
      error: (msg: string, ...args: any[]) => void;
    }
  ) {
    this.logger = logger;
  }

  async initialize() {
    if (this.model) return; // Already initialized
    this.model = await createModel(this.config, this.logger);
  }

  public getTotalTokenUsage() {
    return this.totalTokenUsage;
  }

  private _getTokenTrackingCallback() {
    return new (class extends BaseCallbackHandler {
      name = 'TokenUsageCallback';
      constructor(private usageAccumulator: any) {
        super();
      }
      async handleLLMEnd(output: any) {
        if (output.llmOutput?.tokenUsage) {
          const usage = output.llmOutput.tokenUsage;
          this.usageAccumulator.inputTokens += usage.inputTokens ?? usage.promptTokens ?? 0;
          this.usageAccumulator.outputTokens += usage.outputTokens ?? usage.completionTokens ?? 0;
          this.usageAccumulator.totalTokens += usage.totalTokens ?? 0;
        }
      }
    })(this.totalTokenUsage);
  }

  // [Refactored for Testability]
  // Generate MCP commands from test step
  async generateMCPCommands(
    step: string,
    context: any
  ): Promise<Array<{ tool: string; args: any }>> {
    const { prompt, systemPrompt } = buildMCPCommandsPrompt(step, context);
    try {
      this.logger.debug(`LangChain: Generating MCP commands for step: ${step}`);
      const modelWithStructuredOutput = this.model.withStructuredOutput(MCPCallsSchema);
      const messages: BaseMessage[] = [new SystemMessage(systemPrompt), new HumanMessage(prompt)];
      const result = await modelWithStructuredOutput.invoke(messages, {
        callbacks: [this._getTokenTrackingCallback()],
      });
      return result;
    } catch (error) {
      this.logger.error(`LangChain MCP generation failed: ${error}`);
      throw new Error(`Failed to generate MCP commands: ${error}`);
    }
  }

  // [New Method]
  // Parse a markdown test scenario into a structured object
  async parseScenario(markdownContent: string): Promise<z.infer<typeof ParsedScenarioSchema>> {
    const { prompt, systemPrompt } = buildParseScenarioPrompt(markdownContent);
    try {
      this.logger.debug(`LangChain: Parsing scenario markdown...`);
      const modelWithStructuredOutput = this.model.withStructuredOutput(ParsedScenarioSchema);
      const messages: BaseMessage[] = [new SystemMessage(systemPrompt), new HumanMessage(prompt)];
      const result = await modelWithStructuredOutput.invoke(messages, {
        callbacks: [this._getTokenTrackingCallback()],
      });
      return result;
    } catch (error) {
      this.logger.error(`LangChain scenario parsing failed: ${error}`);
      throw new Error(`Failed to parse scenario from markdown: ${error}`);
    }
  }

  async batchVerifyOutcomes(
    outcomes: string[],
    pageState: any
  ): Promise<z.infer<typeof BatchVerificationResultSchema>> {
    const { prompt, systemPrompt } = buildBatchVerifyOutcomesPrompt(outcomes, pageState);
    try {
      this.logger.debug(`LangChain: Batch verifying ${outcomes.length} outcomes...`);
      const modelWithStructuredOutput = this.model.withStructuredOutput(
        BatchVerificationResultSchema
      );
      const messages: BaseMessage[] = [new SystemMessage(systemPrompt), new HumanMessage(prompt)];
      const result = await modelWithStructuredOutput.invoke(messages, {
        callbacks: [this._getTokenTrackingCallback()],
      });
      return result;
    } catch (error) {
      this.logger.error(`LangChain batch verification failed: ${error}`);
      throw new Error(`Failed to batch verify outcomes: ${error}`);
    }
  }

  async analyzeTestResults(analysisInput: string): Promise<z.infer<typeof AIAnalysisSchema>> {
    const { prompt, systemPrompt } = buildAnalysisPrompt(analysisInput);
    try {
      this.logger.debug(`LangChain: Analyzing test results...`);
      const modelWithStructuredOutput = this.model.withStructuredOutput(AIAnalysisSchema);
      const messages: BaseMessage[] = [new SystemMessage(systemPrompt), new HumanMessage(prompt)];
      const result = await modelWithStructuredOutput.invoke(messages, {
        callbacks: [this._getTokenTrackingCallback()],
      });
      return result;
    } catch (error) {
      this.logger.error(`LangChain analysis failed: ${error}`);
      throw new Error(`Failed to analyze test results: ${error}`);
    }
  }
}
