// AI Testing Workflow Types

export interface TestScenario {
  id: string;
  description: string;
  steps: TestStep[];
  expectedOutcomes: ExpectedOutcome[];
  rawSteps?: string[]; // Raw step text for AI processing
  rawOutcomes?: string[]; // Raw outcome text for AI processing
  metadata?: {
    priority: 'low' | 'medium' | 'high';
    tags?: string[];
    estimatedDuration?: number;
    source?: string;
  };
}

export interface TestStep {
  id: string;
  action: 'navigate' | 'click' | 'type' | 'fill' | 'wait' | 'verify' | 'screenshot' | 'custom';
  target?: string;
  value?: string;
  description: string;
  timeout?: number;
}

export interface ExpectedOutcome {
  id: string;
  type: 'element_exists' | 'text_contains' | 'url_matches' | 'page_title' | 'custom';
  target?: string;
  value?: string;
  description: string;
}

export interface TestResult {
  scenarioId: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  startTime: Date;
  endTime: Date;
  duration: number;
  steps: StepResult[];
  screenshots: string[];
  error?: string;
  accessibility?: AccessibilityReport;
}

export interface StepResult {
  stepId: string;
  description: string; // The original natural language step
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  actualValue?: string;
  screenshot?: string;
}

export interface AccessibilityReport {
  elementsFound: number;
  interactableElements: number;
  issues: AccessibilityIssue[];
}

export interface AccessibilityIssue {
  type: 'missing_label' | 'low_contrast' | 'keyboard_trap' | 'other';
  severity: 'low' | 'medium' | 'high';
  element: string;
  description: string;
}

// AI Agent State Types
export interface WorkflowState {
  input: string;
  scenario?: TestScenario;
  executionResult?: TestResult;
  analysis?: TestAnalysis;
  currentStep: 'generate' | 'parse' | 'execute' | 'analyze' | 'complete';
  error?: string;
}

export interface TestAnalysis {
  summary: string;
  passed: boolean;
  issues: string[];
  suggestions: string[];
  performanceMetrics: {
    totalDuration: number;
    averageStepDuration: number;
    slowestStep?: string;
  };
  accessibilityScore: number;
}

// AI Provider Configuration
export interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'google';
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

// MCP Response Types
export interface MCPContentItem {
  type: 'text' | 'image';
  text?: string;
  data?: string; // base64 data for images
  mimeType?: string;
}

export interface MCPResponse {
  content?: MCPContentItem[];
}
