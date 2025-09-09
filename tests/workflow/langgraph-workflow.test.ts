import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LangGraphWorkflow } from '../../src/workflow/langgraph-workflow';
import { TestExecutorAgent } from '../../src/agents/test-executor';
import { AnalysisAgent } from '../../src/agents/analysis-agent';
import { LangChainAIService } from '../../src/ai/langchain-service';
import { AIProviderConfig, TestResult, TestAnalysis } from '../../src/types/workflow';
import { MCPClientConfig } from '../../src/types/mcp';

// Mock the agent and service modules
vi.mock('../../src/agents/test-executor');
vi.mock('../../src/agents/analysis-agent');
vi.mock('../../src/ai/langchain-service');

describe('LangGraphWorkflow', () => {
  let workflow: LangGraphWorkflow;
  let mockExecutorProcess: any;
  let mockAnalysisProcess: any;

  const mockAiConfig: AIProviderConfig = {
    provider: 'openai',
    apiKey: 'test-key',
    model: 'gpt-4',
  };

  const mockMcpConfig: MCPClientConfig = {
    command: 'npx',
    args: ['@playwright/mcp@latest'],
    timeout: 5000,
    retries: 3,
    retryDelay: 1000,
  };

  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const mockMarkdownInput = `
# Test Login
## Test Steps
- Navigate to login page
- Click login
`;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the return value of the agent constructors
    mockExecutorProcess = vi.fn();
    vi.mocked(TestExecutorAgent).mockImplementation(
      () =>
        ({
          process: mockExecutorProcess,
        }) as any
    );

    mockAnalysisProcess = vi.fn();
    vi.mocked(AnalysisAgent).mockImplementation(
      () =>
        ({
          process: mockAnalysisProcess,
        }) as any
    );

    vi.mocked(LangChainAIService).mockImplementation(
      () =>
        ({
          initialize: vi.fn().mockResolvedValue(undefined),
        }) as any
    );

    workflow = new LangGraphWorkflow({
      aiProvider: mockAiConfig,
      mcpConfig: mockMcpConfig,
      logger: mockLogger,
    });
  });

  it('should throw an error if run is called before initialization', async () => {
    await expect(workflow.run(mockMarkdownInput)).rejects.toThrow(
      'Workflow not initialized. Call initialize() first.'
    );
  });

  it('should successfully run the full workflow on a valid input', async () => {
    const mockTestResult: Partial<TestResult> = { status: 'passed' };
    mockExecutorProcess.mockResolvedValue(mockTestResult);

    const mockAnalysisResult: Partial<TestAnalysis> = { summary: 'All good' };
    mockAnalysisProcess.mockResolvedValue(mockAnalysisResult);

    await workflow.initialize();
    const finalState = await workflow.run(mockMarkdownInput);

    expect(mockExecutorProcess).toHaveBeenCalledOnce();
    expect(mockAnalysisProcess).toHaveBeenCalledOnce();
    expect(finalState.error).toBeUndefined();
    expect(finalState.executionResult).toEqual(mockTestResult);
    expect(finalState.analysis).toEqual(mockAnalysisResult);
    expect(finalState.currentStep).toBe('complete');
  });

  it('should handle a failure in the execution node', async () => {
    const error = new Error('Execution failed');
    mockExecutorProcess.mockRejectedValue(error);

    await workflow.initialize();
    const finalState = await workflow.run(mockMarkdownInput);

    expect(mockExecutorProcess).toHaveBeenCalledOnce();
    expect(mockAnalysisProcess).not.toHaveBeenCalled();
    expect(finalState.error).toBe('Test execution failed: Execution failed');
    expect(finalState.currentStep).toBe('complete');
  });

  it('should handle a failure in the analysis node', async () => {
    const mockTestResult: Partial<TestResult> = { status: 'passed' };
    mockExecutorProcess.mockResolvedValue(mockTestResult);

    const error = new Error('Analysis failed');
    mockAnalysisProcess.mockRejectedValue(error);

    await workflow.initialize();
    const finalState = await workflow.run(mockMarkdownInput);

    expect(mockExecutorProcess).toHaveBeenCalledOnce();
    expect(mockAnalysisProcess).toHaveBeenCalledOnce();
    expect(finalState.error).toBe('Analysis failed: Analysis failed');
    expect(finalState.currentStep).toBe('complete');
  });

  it('should handle a failure in the parsing node', async () => {
    // Pass an invalid input type to force an error in the parser
    const invalidInput = null as any;

    await workflow.initialize();
    const finalState = await workflow.run(invalidInput);

    expect(mockExecutorProcess).not.toHaveBeenCalled();
    expect(mockAnalysisProcess).not.toHaveBeenCalled();
    expect(finalState.error).toContain('Markdown parsing failed');
    expect(finalState.currentStep).toBe('complete');
  });
});
