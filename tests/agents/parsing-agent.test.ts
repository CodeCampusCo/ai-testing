import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ParsingAgent } from '../../src/agents/parsing-agent';
import { LangChainAIService } from '../../src/ai/langchain-service';
import { ParsedScenarioSchema } from '../../src/ai/langchain-service';
import { z } from 'zod';

// Mock dependencies
vi.mock('../../src/ai/langchain-service');

describe('ParsingAgent', () => {
  let parsingAgent: ParsingAgent;
  let mockAiService: InstanceType<typeof LangChainAIService>;
  let mockLogger;

  beforeEach(() => {
    vi.clearAllMocks();

    const mockAiServiceInstance = {
      parseScenario: vi.fn(),
    };
    vi.mocked(LangChainAIService).mockImplementation(() => mockAiServiceInstance as any);

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    mockAiService = new LangChainAIService({} as any, mockLogger);
    parsingAgent = new ParsingAgent(mockAiService, mockLogger);
  });

  it('should correctly process valid markdown and construct a TestScenario', async () => {
    const mockParsedData: z.infer<typeof ParsedScenarioSchema> = {
      description: 'Test Description',
      rawSteps: ['Step 1'],
      rawOutcomes: ['Outcome 1'],
    };
    vi.mocked(mockAiService.parseScenario).mockResolvedValue(mockParsedData);

    const result = await parsingAgent.process('mock markdown');

    expect(mockAiService.parseScenario).toHaveBeenCalledWith('mock markdown');
    expect(result.description).toBe('Test Description');
    expect(result.rawSteps).toEqual(['Step 1']);
    expect(result.rawOutcomes).toEqual(['Outcome 1']);
    expect(result.id).toMatch(/^test-\d+$/);
    expect(result.steps).toEqual([]);
    expect(result.expectedOutcomes).toEqual([]);
  });

  it('should throw an error if AI returns no rawSteps', async () => {
    const mockParsedData: z.infer<typeof ParsedScenarioSchema> = {
      description: 'Test Description',
      rawSteps: [],
      rawOutcomes: ['Outcome 1'],
    };
    vi.mocked(mockAiService.parseScenario).mockResolvedValue(mockParsedData);

    await expect(parsingAgent.process('mock markdown')).rejects.toThrow(
      'The test scenario must contain at least one test step. AI failed to identify steps.'
    );
  });

  it('should handle errors from the AI service', async () => {
    vi.mocked(mockAiService.parseScenario).mockRejectedValue(new Error('AI Error'));

    await expect(parsingAgent.process('mock markdown')).rejects.toThrow('AI Error');
  });
});
