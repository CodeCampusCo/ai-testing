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
