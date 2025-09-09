import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createModel } from '../../../src/ai/models/model-factory.js';
import { AIProviderConfig } from '../../../src/types/workflow.js';

// Mock the actual model classes
vi.mock('@langchain/openai', () => ({ ChatOpenAI: vi.fn() }));
vi.mock('@langchain/anthropic', () => ({ ChatAnthropic: vi.fn() }));
vi.mock('@langchain/google-genai', () => ({ ChatGoogleGenerativeAI: vi.fn() }));

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

describe('Model Factory', () => {
  let mockLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = {
      debug: vi.fn(),
      error: vi.fn(),
    };
  });

  it('should create a ChatOpenAI model for the openai provider', async () => {
    const config: AIProviderConfig = {
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-test',
    };
    await createModel(config, mockLogger);
    expect(ChatOpenAI).toHaveBeenCalledWith({
      apiKey: 'test-key',
      model: 'gpt-test',
      temperature: 0.1,
      maxTokens: 2000,
    });
  });

  it('should create a ChatAnthropic model for the anthropic provider', async () => {
    const config: AIProviderConfig = {
      provider: 'anthropic',
      apiKey: 'test-key',
      model: 'claude-test',
    };
    await createModel(config, mockLogger);
    expect(ChatAnthropic).toHaveBeenCalledWith({
      apiKey: 'test-key',
      model: 'claude-test',
      temperature: 0.1,
      maxTokens: 2000,
    });
  });

  it('should create a ChatGoogleGenerativeAI model for the google provider', async () => {
    const config: AIProviderConfig = {
      provider: 'google',
      apiKey: 'test-key',
      model: 'gemini-test',
    };
    await createModel(config, mockLogger);
    expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: 'test-key',
      model: 'gemini-test',
      temperature: 0.1,
      maxOutputTokens: 2000,
    });
  });

  it('should throw an error for an unsupported provider', async () => {
    const config: AIProviderConfig = {
      provider: 'unsupported' as any,
      apiKey: 'test-key',
      model: 'test-model',
    };
    await expect(createModel(config, mockLogger)).rejects.toThrow(
      'Unsupported AI provider: unsupported'
    );
  });
});
