import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestExecutorAgent } from '../../src/agents/test-executor';
import { LangChainAIService } from '../../src/ai/langchain-service';
import { PlaywrightMCPClient } from '../../src/mcp/browser';
import { TestScenario, TestResult, AIProviderConfig } from '../../src/types/workflow';
import { promises as fs } from 'fs';

// Mock dependencies
vi.mock('../../src/ai/langchain-service');
vi.mock('../../src/mcp/browser');
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
  },
}));

describe('TestExecutorAgent', () => {
  let testExecutor: TestExecutorAgent;
  let mockAiService: InstanceType<typeof LangChainAIService>;
  let mockBrowser: InstanceType<typeof PlaywrightMCPClient>;
  let mockLogger;
  let mockProgressManager;

  const mockMcpConfig = {
    command: 'npx',
    args: ['@playwright/mcp@latest'],
    timeout: 5000,
    retries: 3,
    retryDelay: 1000,
    cleanState: true,
  };

  const mockAiConfig: AIProviderConfig = {
    provider: 'openai',
    apiKey: 'test-key',
    model: 'gpt-4',
  };

  const mockScenario: TestScenario = {
    id: 'test-1',
    description: 'A mock test scenario',
    steps: [],
    expectedOutcomes: [],
    rawSteps: ['Step 1: Go to homepage', 'Step 2: Click login'],
    rawOutcomes: ['Outcome 1: User is logged in'],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // We need to mock the constructor of PlaywrightMCPClient to control its instance
    const mockBrowserInstance = {
      connect: vi.fn().mockResolvedValue(undefined),
      clearBrowserState: vi.fn().mockResolvedValue(undefined),
      getSnapshot: vi.fn().mockResolvedValue({ accessibilityTree: 'mock-snapshot' }),
      callTool: vi.fn().mockResolvedValue({}),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(PlaywrightMCPClient).mockImplementation(() => mockBrowserInstance as any);

    const mockAiServiceInstance = {
      generateMCPCommands: vi
        .fn()
        .mockResolvedValue([{ tool: 'browser_navigate', args: { url: '/' } }]),
      verifyOutcome: vi.fn().mockResolvedValue(true),
    };
    vi.mocked(LangChainAIService).mockImplementation(() => mockAiServiceInstance as any);

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    mockProgressManager = {
      startStep: vi.fn(),
      succeedStep: vi.fn(),
      failStep: vi.fn(),
      finish: vi.fn(),
    };

    testExecutor = new TestExecutorAgent(
      mockMcpConfig,
      new LangChainAIService(mockAiConfig, mockLogger),
      mockLogger,
      mockProgressManager
    );

    // Assign mocked instances for assertion
    mockBrowser = (testExecutor as any).browser;
    mockAiService = (testExecutor as any).aiService;
  });

  it('should successfully execute a test scenario', async () => {
    const result = await testExecutor.process(mockScenario);

    expect(result.status).toBe('passed');
    expect(mockBrowser.connect).toHaveBeenCalledOnce();
    expect(mockBrowser.clearBrowserState).toHaveBeenCalledOnce();
    expect(mockAiService.generateMCPCommands).toHaveBeenCalledTimes(2);
    // 2 calls for steps, 1 for final screenshot
    expect(mockBrowser.callTool).toHaveBeenCalledTimes(3);
    expect(mockBrowser.callTool).toHaveBeenCalledWith(
      'browser_take_screenshot',
      expect.any(Object)
    );
    expect(mockAiService.verifyOutcome).toHaveBeenCalledOnce();
    expect(mockBrowser.disconnect).toHaveBeenCalledOnce();
    expect(mockProgressManager.succeedStep).toHaveBeenCalledTimes(2);
    expect(result.steps.length).toBe(2);
    expect(result.steps[0].status).toBe('passed');
    expect(result.steps[1].status).toBe('passed');
  });

  it('should handle test failure during step execution', async () => {
    const error = new Error('Step failed');
    vi.mocked(mockAiService.generateMCPCommands).mockRejectedValueOnce(error);

    const result = await testExecutor.process(mockScenario);

    expect(result.status).toBe('failed');
    expect(result.error).toBeUndefined(); // Error is on the step, not the whole result
    expect(result.steps.length).toBe(1);
    expect(result.steps[0].status).toBe('failed');
    expect(result.steps[0].error).toBe('Step failed');
    expect(mockAiService.verifyOutcome).not.toHaveBeenCalled();
    expect(mockBrowser.disconnect).toHaveBeenCalledOnce();
    expect(mockProgressManager.failStep).toHaveBeenCalledOnce();
  });

  it('should handle failure during outcome verification', async () => {
    vi.mocked(mockAiService.verifyOutcome).mockResolvedValue(false);

    const result = await testExecutor.process(mockScenario);

    expect(result.status).toBe('failed');
    expect(result.error).toContain('Outcome verification failed');
    expect(mockBrowser.disconnect).toHaveBeenCalledOnce();
  });

  it('should handle general processing error', async () => {
    const error = new Error('Connection failed');
    vi.mocked(mockBrowser.connect).mockRejectedValue(error);

    const result = await testExecutor.process(mockScenario);

    expect(result.status).toBe('error');
    expect(result.error).toBe('Connection failed');
    expect(mockBrowser.disconnect).toHaveBeenCalledOnce();
  });

  it('should not clear browser state if cleanState is false', async () => {
    const config = { ...mockMcpConfig, cleanState: false };
    testExecutor = new TestExecutorAgent(
      config,
      new LangChainAIService(mockAiConfig, mockLogger),
      mockLogger,
      mockProgressManager
    );

    await testExecutor.process(mockScenario);

    // We need to get the new mockBrowser instance associated with the new testExecutor
    const newMockBrowser = (testExecutor as any).browser;
    expect(newMockBrowser.clearBrowserState).not.toHaveBeenCalled();
  });
});
