import { AIProviderConfig } from '../types/workflow.js';

// Base Agent Interface
export interface BaseAgent<TInput, TOutput> {
  name: string;
  description: string;
  process(input: TInput): Promise<TOutput>;
}

// Base AI Agent with Provider Support
export abstract class AIAgent<TInput, TOutput> implements BaseAgent<TInput, TOutput> {
  abstract name: string;
  abstract description: string;

  constructor(
    protected config: AIProviderConfig,
    protected logger: {
      debug: (msg: string, ...args: any[]) => void;
      info: (msg: string, ...args: any[]) => void;
      warn: (msg: string, ...args: any[]) => void;
      error: (msg: string, ...args: any[]) => void;
    }
  ) {}

  abstract process(input: TInput): Promise<TOutput>;

  protected async callAI(prompt: string, systemPrompt?: string): Promise<string> {
    this.logger.debug(`AI Call (${this.config.provider}): ${prompt.substring(0, 100)}...`);
    
    try {
      switch (this.config.provider) {
        case 'openai':
          return await this.callOpenAI(prompt, systemPrompt);
        case 'anthropic':
          return await this.callAnthropic(prompt, systemPrompt);
        case 'google':
          return await this.callGoogle(prompt, systemPrompt);
        default:
          throw new Error(`Unsupported AI provider: ${this.config.provider}`);
      }
    } catch (error) {
      this.logger.error(`AI call failed: ${error}`);
      throw error;
    }
  }

  private async callOpenAI(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: this.config.apiKey });
      
      const messages: Array<{role: 'system' | 'user', content: string}> = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await openai.chat.completions.create({
        model: this.config.model || 'gpt-4',
        messages: messages as any,
        temperature: this.config.temperature || 0.1,
        max_tokens: this.config.maxTokens || 2000,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      throw new Error(`OpenAI API error: ${error}`);
    }
  }

  private async callAnthropic(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const { Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: this.config.apiKey });

      const fullPrompt = systemPrompt ? `${systemPrompt}\n\nHuman: ${prompt}\n\nAssistant:` : `Human: ${prompt}\n\nAssistant:`;

      const response = await client.completions.create({
        model: this.config.model || 'claude-2',
        max_tokens_to_sample: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.1,
        prompt: fullPrompt
      });

      return response.completion || '';
    } catch (error) {
      throw new Error(`Anthropic API error: ${error}`);
    }
  }

  private async callGoogle(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.config.apiKey);
      const model = genAI.getGenerativeModel({ model: this.config.model || 'gemini-pro' });

      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      throw new Error(`Google AI API error: ${error}`);
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