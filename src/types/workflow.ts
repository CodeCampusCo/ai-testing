// AI Testing Workflow Types

export interface TestScenario {
  id: string;
  description: string;
  steps: TestStep[];
  expectedOutcomes: ExpectedOutcome[];
  metadata?: {
    priority: 'low' | 'medium' | 'high';
    tags: string[];
    estimatedDuration?: number;
  };
}

export interface TestStep {
  id: string;
  action: 'navigate' | 'click' | 'type' | 'wait' | 'verify' | 'screenshot';
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
  currentStep: 'generate' | 'execute' | 'analyze' | 'complete';
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