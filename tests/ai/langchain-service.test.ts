import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { LangChainAIService } from '../../src/ai/langchain-service';
import { AIProviderConfig } from '../../src/types/workflow';
import {
  buildBatchVerifyOutcomesPrompt,
  buildMCPCommandsPrompt,
} from '../../src/ai/prompts/prompt-factory';
import { createModel } from '../../src/ai/models/model-factory';

// Mock the model factory
vi.mock('../../src/ai/models/model-factory');

describe('LangChainAIService', () => {
  let aiService: LangChainAIService;
  let mockLogger;
  let mockModel;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create a mock model with a mock invoke method
    mockModel = {
      withStructuredOutput: vi.fn().mockReturnThis(),
      invoke: vi.fn(),
    };

    // Mock createModel to return our mock model
    (createModel as Mock).mockResolvedValue(mockModel);

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    aiService = new LangChainAIService(
      { provider: 'openai', apiKey: 'key', model: 'gpt-test' },
      mockLogger
    );
    // Initialize the service to ensure it gets the mock model
    await aiService.initialize();
  });

  describe('Prompt Builders', () => {
    it('should build the MCP commands prompt correctly', () => {
      const { prompt, systemPrompt } = buildMCPCommandsPrompt('test step', {
        url: '/home',
      });
      expect(systemPrompt).toContain('You are an expert E2E testing assistant.');
      expect(prompt).toContain('Test Step: test step');
      expect(prompt).toContain('URL: /home');
    });

    it('should build the batch verify outcomes prompt correctly', () => {
      const { prompt, systemPrompt } = buildBatchVerifyOutcomesPrompt(['outcome 1'], {
        elements: [],
      });
      expect(systemPrompt).toContain('You are an expert web testing assistant.');
      expect(prompt).toContain('Expected Outcomes:\n1. outcome 1');
      expect(prompt).toContain('Current Page Elements:\nnone');
    });
  });

  describe('generateMCPCommands', () => {
    it('should call the model and return the structured result', async () => {
      const mcpCalls = [{ tool: 'browser_navigate', args: { url: '/' } }];
      mockModel.invoke.mockResolvedValue(mcpCalls);

      const result = await aiService.generateMCPCommands('step', {});

      expect(mockModel.withStructuredOutput).toHaveBeenCalledOnce();
      expect(mockModel.invoke).toHaveBeenCalledOnce();
      expect(result).toEqual(mcpCalls);
    });

    it('should throw an error if model invocation fails', async () => {
      mockModel.invoke.mockRejectedValue(new Error('AI error'));
      await expect(aiService.generateMCPCommands('step', {})).rejects.toThrow(
        'Failed to generate MCP commands'
      );
    });
  });

  describe('batchVerifyOutcomes', () => {
    it('should call the model and return the structured result', async () => {
      const outcomes = [{ description: 'outcome 1', status: 'passed' }];
      mockModel.invoke.mockResolvedValue(outcomes);

      const result = await aiService.batchVerifyOutcomes(['outcome 1'], {});

      expect(mockModel.withStructuredOutput).toHaveBeenCalledOnce();
      expect(mockModel.invoke).toHaveBeenCalledOnce();
      expect(result).toEqual(outcomes);
    });

    it('should throw an error if model invocation fails', async () => {
      mockModel.invoke.mockRejectedValue(new Error('AI error'));
      await expect(aiService.batchVerifyOutcomes(['outcome 1'], {})).rejects.toThrow(
        'Failed to batch verify outcomes'
      );
    });
  });
});
