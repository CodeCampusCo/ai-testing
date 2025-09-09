import { AIProviderConfig } from '../../types/workflow.js';

export async function createModel(
  config: AIProviderConfig,
  logger: {
    debug: (msg: string, ...args: any[]) => void;
    error: (msg: string, ...args: any[]) => void;
  }
) {
  logger.debug(`Initializing AI model for provider: ${config.provider}`);
  try {
    switch (config.provider) {
      case 'openai':
        const { ChatOpenAI } = await import('@langchain/openai');
        return new ChatOpenAI({
          apiKey: config.apiKey,
          model: config.model || 'gpt-4',
          temperature: config.temperature || 0.1,
          maxTokens: config.maxTokens || 2000,
        });
      case 'anthropic':
        const { ChatAnthropic } = await import('@langchain/anthropic');
        return new ChatAnthropic({
          apiKey: config.apiKey,
          model: config.model || 'claude-3-sonnet-20240229',
          temperature: config.temperature || 0.1,
          maxTokens: config.maxTokens || 2000,
        });
      case 'google':
        const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
        return new ChatGoogleGenerativeAI({
          apiKey: config.apiKey,
          model: config.model || 'gemini-pro',
          temperature: config.temperature || 0.1,
          maxOutputTokens: config.maxTokens || 2000,
        });
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  } catch (error) {
    logger.error(`Failed to initialize AI model: ${error}`);
    throw error;
  }
}
