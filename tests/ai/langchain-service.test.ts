import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LangChainAIService } from '../../src/ai/langchain-service';
import { AIProviderConfig } from '../../src/types/workflow';

// We only need to mock the top-level class now, not the internals.
vi.mock('@langchain/openai', () => ({ ChatOpenAI: vi.fn() }));
vi.mock('@langchain/anthropic', () => ({ ChatAnthropic: vi.fn() }));
vi.mock('@langchain/google-genai', () => ({ ChatGoogleGenerativeAI: vi.fn() }));

import { ChatOpenAI } from '@langchain/openai';

describe('LangChainAIService', () => {
  let aiService: LangChainAIService;
  let mockLogger;

  const createService = (config: AIProviderConfig) => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    return new LangChainAIService(config, mockLogger);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    aiService = createService({ provider: 'openai', apiKey: 'key', model: 'gpt-test' });
  });

  // Initialize tests remain the same as they were correct.
  describe('initialize', () => {
    it('should initialize OpenAI model correctly', async () => {
      await aiService.initialize();
      expect(ChatOpenAI).toHaveBeenCalledWith({
        apiKey: 'key',
        model: 'gpt-test',
        temperature: 0.1,
        maxTokens: 2000,
      });
    });
  });

  describe('Prompt Builders', () => {
    it('should build the MCP commands prompt correctly', () => {
      const { prompt, systemPrompt } = aiService.buildMCPCommandsPrompt('test step', {
        url: '/home',
      });
      expect(systemPrompt).toContain('You are an expert E2E testing assistant.');
      expect(prompt).toContain('Test Step: test step');
      expect(prompt).toContain('URL: /home');
    });

    it('should build the verify outcome prompt correctly', () => {
      const { prompt, systemPrompt } = aiService.buildVerifyOutcomePrompt('test outcome', {
        elements: [],
      });
      expect(systemPrompt).toContain('You are an expert web testing assistant.');
      expect(prompt).toContain('Expected Outcome: test outcome');
      expect(prompt).toContain('Current Page Elements:\nnone');
    });
  });

  describe('generateMCPCommands', () => {
    it('should call process and parse the result', async () => {
      const mcpCalls = [{ tool: 'browser_navigate', args: { url: '/' } }];
      const processSpy = vi.spyOn(aiService, 'process').mockResolvedValue(JSON.stringify(mcpCalls));

      const result = await aiService.generateMCPCommands('step', {});

      expect(processSpy).toHaveBeenCalledOnce();
      expect(result).toEqual(mcpCalls);
    });

    it('should throw an error if process fails', async () => {
      vi.spyOn(aiService, 'process').mockRejectedValue(new Error('AI error'));
      await expect(aiService.generateMCPCommands('step', {})).rejects.toThrow(
        'Failed to generate MCP commands'
      );
    });
  });

  describe('verifyOutcome', () => {
    it('should return true for a successful verification', async () => {
      const verification = { result: true, reasoning: 'Looks good.' };
      vi.spyOn(aiService, 'process').mockResolvedValue(JSON.stringify(verification));

      const result = await aiService.verifyOutcome('outcome', {});
      expect(result).toBe(true);
    });

    it('should return false for a failed verification', async () => {
      const verification = { result: false, reasoning: 'Not found.' };
      vi.spyOn(aiService, 'process').mockResolvedValue(JSON.stringify(verification));

      const result = await aiService.verifyOutcome('outcome', {});
      expect(result).toBe(false);
    });

    it('should return false if process fails', async () => {
      vi.spyOn(aiService, 'process').mockRejectedValue(new Error('AI error'));
      const result = await aiService.verifyOutcome('outcome', {});
      expect(result).toBe(false);
    });
  });
});
