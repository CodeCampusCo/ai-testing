import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from '../../src/agents/analysis-agent';
import { LangChainAIService } from '../../src/ai/langchain-service';
import { TestScenario, TestResult } from '../../src/types/workflow';
import { AIAgent } from '../../src/agents/base';

// Mock dependencies
vi.mock('../../src/ai/langchain-service');

describe('AnalysisAgent', () => {
  let analysisAgent: AnalysisAgent;
  let mockAiService: InstanceType<typeof LangChainAIService>;
  let mockLogger;

  const mockScenario: TestScenario = {
    id: 'test-1',
    description: 'A mock test scenario',
    steps: [],
    expectedOutcomes: [],
  };

  const mockPassedResult: TestResult = {
    scenarioId: 'test-1',
    status: 'passed',
    startTime: new Date(),
    endTime: new Date(Date.now() + 5000),
    duration: 5000,
    steps: [
      { stepId: 'step-1', description: 'Step 1', status: 'passed', duration: 2000 },
      { stepId: 'step-2', description: 'Step 2', status: 'passed', duration: 3000 },
    ],
    screenshots: [],
  };

  const mockFailedResult: TestResult = {
    ...mockPassedResult,
    status: 'failed',
    error: 'Main test error',
    steps: [
      { stepId: 'step-1', description: 'Step 1', status: 'passed', duration: 2000 },
      {
        stepId: 'step-2',
        description: 'Step 2',
        status: 'failed',
        duration: 3000,
        error: 'Step 2 failed',
      },
    ],
    accessibility: {
      elementsFound: 10,
      interactableElements: 5,
      issues: [
        {
          type: 'missing_label',
          severity: 'high',
          element: 'button',
          description: 'Missing label',
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const mockAiServiceInstance = {
      process: vi.fn(),
    };
    vi.mocked(LangChainAIService).mockImplementation(() => mockAiServiceInstance as any);

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    mockAiService = new LangChainAIService({} as any, mockLogger);
    analysisAgent = new AnalysisAgent(mockAiService, mockLogger);
  });

  it('should generate a positive analysis for a passed test', async () => {
    const aiResponse = {
      summary: 'The test passed successfully with good performance.',
      suggestions: ['Consider adding more assertions.'],
    };
    vi.spyOn(AIAgent.prototype as any, 'callAI').mockResolvedValue(JSON.stringify(aiResponse));

    const analysis = await analysisAgent.process({
      scenario: mockScenario,
      result: mockPassedResult,
    });

    expect(analysis.passed).toBe(true);
    expect(analysis.summary).toBe(aiResponse.summary);
    expect(analysis.suggestions).toEqual(aiResponse.suggestions);
    expect(analysis.issues).toEqual([]);
    expect(analysis.performanceMetrics.totalDuration).toBe(5000);
  });

  it('should generate a detailed analysis for a failed test', async () => {
    const aiResponse = {
      summary: 'The test failed due to a critical error on step 2.',
      suggestions: [
        'Check the selector for the element in step 2.',
        'Improve accessibility by adding labels.',
      ],
    };
    vi.spyOn(AIAgent.prototype as any, 'callAI').mockResolvedValue(JSON.stringify(aiResponse));

    const analysis = await analysisAgent.process({
      scenario: mockScenario,
      result: mockFailedResult,
    });

    expect(analysis.passed).toBe(false);
    expect(analysis.summary).toBe(aiResponse.summary);
    expect(analysis.suggestions).toEqual(aiResponse.suggestions);
    expect(analysis.issues).toHaveLength(3);
    expect(analysis.issues).toContain('Test failed: Main test error');
    expect(analysis.issues).toContain('Step "step-2" failed: Step 2 failed');
    expect(analysis.issues).toContain('Accessibility: Missing label');
    expect(analysis.accessibilityScore).toBeLessThan(100);
  });

  it('should identify performance issues in basic analysis', async () => {
    const slowResult: TestResult = {
      ...mockPassedResult,
      duration: 35000, // slow total
      steps: [
        { stepId: 'step-1', description: 'Step 1', status: 'passed', duration: 23000 }, // slow step
        { stepId: 'step-2', description: 'Step 2', status: 'passed', duration: 12000 }, // slow step
      ],
    };
    const aiResponse = { summary: 'Performance issues detected.', suggestions: [] };
    vi.spyOn(AIAgent.prototype as any, 'callAI').mockResolvedValue(JSON.stringify(aiResponse));

    const analysis = await analysisAgent.process({ scenario: mockScenario, result: slowResult });

    expect(analysis.issues).toContain('Test took too long: 35000ms');
    expect(analysis.issues).toContain('Step "step-1" was slow: 23000ms');
    expect(analysis.issues).toContain('Step "step-2" was slow: 12000ms');
    expect(analysis.performanceMetrics.slowestStep).toBe('step-1 (23000ms)');
  });

  it('should handle malformed JSON from AI gracefully', async () => {
    const malformedJson = '{"summary": "Test passed", "suggestions": [';
    vi.spyOn(AIAgent.prototype as any, 'callAI').mockResolvedValue(malformedJson);

    await expect(
      analysisAgent.process({ scenario: mockScenario, result: mockPassedResult })
    ).rejects.toThrow('Invalid JSON response from AI');
  });
});
