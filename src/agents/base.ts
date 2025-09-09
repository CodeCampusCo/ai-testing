import { LangChainAIService } from '../ai/langchain-service.js';

// Base Agent Interface
export interface BaseAgent<TInput, TOutput> {
  name: string;
  description: string;
  process(input: TInput): Promise<TOutput>;
}

// Base AI Agent - Refactored to use a central LangChainAIService
export abstract class AIAgent<TInput, TOutput> implements BaseAgent<TInput, TOutput> {
  abstract name: string;
  abstract description: string;

  constructor(
    protected aiService: LangChainAIService,
    protected logger: {
      debug: (msg: string, ...args: any[]) => void;
      info: (msg: string, ...args: any[]) => void;
      warn: (msg: string, ...args: any[]) => void;
      error: (msg: string, ...args: any[]) => void;
    }
  ) {}

  abstract process(input: TInput): Promise<TOutput>;

  /**
   * Unified method to call the AI using the central LangChainAIService.
   */
  protected async callAI(prompt: string, systemPrompt?: string): Promise<string> {
    this.logger.debug(`AI Call: ${prompt.substring(0, 100)}...`);
    try {
      return await this.aiService.process(prompt, systemPrompt);
    } catch (error) {
      this.logger.error(`AI call failed: ${error}`);
      throw error;
    }
  }

  protected parseJSON<T>(jsonString: string): T {
    try {
      // Clean up common JSON formatting issues
      const cleaned = jsonString
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .replace(/^```\s*/i, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (error) {
      this.logger.error(`JSON parsing failed: ${error}`);
      this.logger.debug(`Raw string: ${jsonString}`);
      throw new Error(`Invalid JSON response from AI: ${error}`);
    }
  }
}

// Error Types
export class AgentError extends Error {
  constructor(
    message: string,
    public readonly agentName: string,
    public readonly cause?: Error
  ) {
    super(`[${agentName}] ${message}`);
    this.name = 'AgentError';
  }
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: Error
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'AIProviderError';
  }
}
