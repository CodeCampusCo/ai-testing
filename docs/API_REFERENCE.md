# API Reference Guide

## Overview

This document provides comprehensive API documentation for the AI-Powered E2E Test Framework, including MCP integration, AI agent interfaces, and programmatic usage.

## 1. CLI Commands

### 1.1 my-cli-generate

Interactive test generation command.

#### Syntax
```bash
my-cli-generate [options]
```

#### Options
| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--url <url>` | string | Target website URL for analysis | - |
| `--project-name <name>` | string | Name for new project | - |
| `--init` | boolean | Initialize new project structure | false |
| `--template <type>` | string | Use predefined template (ecommerce, admin, mobile, api) | - |
| `--output-dir <path>` | string | Output directory for generated files | ./projects |
| `--config <path>` | string | Custom configuration file path | - |
| `--ai-model <model>` | string | Override default AI model | - |
| `--headless` | boolean | Run browser analysis in headless mode | true |
| `--verbose` | boolean | Enable verbose logging | false |
| `--doctor` | boolean | Run system diagnostics | false |
| `--help` | boolean | Show help information | false |

#### Examples
```bash
# Interactive mode
my-cli-generate

# Analyze specific website
my-cli-generate --url "https://example.com" --project-name "example-tests"

# Initialize with template
my-cli-generate --template "ecommerce" --project-name "shop-tests"

# Custom configuration
my-cli-generate --config "./custom-config.yml" --verbose
```

#### Return Codes
- `0`: Success
- `1`: General error
- `2`: Invalid arguments
- `3`: MCP connection failed
- `4`: AI provider error
- `5`: File system error

### 1.2 my-cli-run

Test execution command.

#### Syntax
```bash
my-cli-run [options]
```

#### Options
| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--project <name>` | string | Project directory name | Required |
| `--scenario <name>` | string | Specific test scenario to run | All scenarios |
| `--config <path>` | string | Configuration file path | project/config.yml |
| `--env <environment>` | string | Environment to run against | default |
| `--browser <type>` | string | Browser type (chromium, firefox, webkit) | chromium |
| `--headed` | boolean | Run in headed mode | false |
| `--parallel <count>` | number | Number of parallel executions | 1 |
| `--retry <count>` | number | Retry attempts on failure | 3 |
| `--output <format>` | string | Output format (json, html, junit) | json |
| `--output-dir <path>` | string | Report output directory | ./test-results |
| `--timeout <ms>` | number | Test timeout in milliseconds | 30000 |
| `--verbose` | boolean | Enable verbose logging | false |
| `--dry-run` | boolean | Validate tests without execution | false |

#### Examples
```bash
# Run all tests in project
my-cli-run --project "ecommerce-tests"

# Run specific scenario
my-cli-run --project "ecommerce-tests" --scenario "login-test"

# Run in headed mode for debugging
my-cli-run --project "ecommerce-tests" --headed --verbose

# Run against staging environment
my-cli-run --project "ecommerce-tests" --env "staging"

# Parallel execution
my-cli-run --project "ecommerce-tests" --parallel 3
```

## 2. MCP Server Integration

### 2.1 Playwright MCP Commands

The framework communicates with Playwright MCP server using these commands:

#### Browser Management
```typescript
interface BrowserCommands {
  // Launch browser instance
  launchBrowser(options: LaunchOptions): Promise<BrowserContext>;
  
  // Close browser
  closeBrowser(contextId: string): Promise<void>;
  
  // Create new page
  newPage(contextId: string): Promise<PageInfo>;
}

interface LaunchOptions {
  browserType: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  locale?: string;
}
```

#### Page Navigation
```typescript
interface NavigationCommands {
  // Navigate to URL
  goto(pageId: string, url: string, options?: GotoOptions): Promise<void>;
  
  // Go back in history
  goBack(pageId: string): Promise<void>;
  
  // Reload page
  reload(pageId: string): Promise<void>;
  
  // Wait for page load
  waitForLoadState(pageId: string, state: 'load' | 'domcontentloaded' | 'networkidle'): Promise<void>;
}

interface GotoOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
}
```

#### Element Interaction
```typescript
interface InteractionCommands {
  // Click element
  click(pageId: string, selector: string, options?: ClickOptions): Promise<void>;
  
  // Fill input field
  fill(pageId: string, selector: string, value: string): Promise<void>;
  
  // Select option
  selectOption(pageId: string, selector: string, value: string | string[]): Promise<void>;
  
  // Check checkbox
  check(pageId: string, selector: string): Promise<void>;
  
  // Uncheck checkbox
  uncheck(pageId: string, selector: string): Promise<void>;
}

interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delay?: number;
  force?: boolean;
  timeout?: number;
}
```

#### Element Queries
```typescript
interface QueryCommands {
  // Get element text content
  textContent(pageId: string, selector: string): Promise<string | null>;
  
  // Get element attribute
  getAttribute(pageId: string, selector: string, name: string): Promise<string | null>;
  
  // Check if element is visible
  isVisible(pageId: string, selector: string): Promise<boolean>;
  
  // Check if element is enabled
  isEnabled(pageId: string, selector: string): Promise<boolean>;
  
  // Wait for element
  waitForSelector(pageId: string, selector: string, options?: WaitOptions): Promise<void>;
}

interface WaitOptions {
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
  timeout?: number;
}
```

#### Accessibility Snapshots
```typescript
interface AccessibilityCommands {
  // Take accessibility snapshot
  accessibilitySnapshot(pageId: string, options?: SnapshotOptions): Promise<AccessibilityTree>;
  
  // Get accessibility info for element
  accessibilityInfo(pageId: string, selector: string): Promise<AccessibilityNode>;
}

interface SnapshotOptions {
  interestingOnly?: boolean;
  includeOrientation?: boolean;
}

interface AccessibilityTree {
  role: string;
  name?: string;
  value?: string;
  description?: string;
  children?: AccessibilityNode[];
}

interface AccessibilityNode {
  role: string;
  name?: string;
  value?: string;
  description?: string;
  level?: number;
  disabled?: boolean;
  expanded?: boolean;
  focused?: boolean;
  modal?: boolean;
  multiline?: boolean;
  multiselectable?: boolean;
  readonly?: boolean;
  required?: boolean;
  selected?: boolean;
}
```

### 2.2 MCP Client Implementation

```typescript
import { MCPClient } from '@mcp/client';

export class PlaywrightMCPClient {
  private client: MCPClient;
  private isConnected = false;

  constructor(private config: MCPConfig) {
    this.client = new MCPClient({
      serverCommand: config.command,
      serverArgs: config.args
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    
    try {
      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      throw new MCPConnectionError(`Failed to connect to MCP server: ${error.message}`);
    }
  }

  async executeCommand<T = any>(command: string, params: object = {}): Promise<T> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const result = await this.client.callTool(command, params);
      return result as T;
    } catch (error) {
      throw new MCPExecutionError(`Command '${command}' failed: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }
}
```

## 3. AI Agent APIs

### 3.1 Scenario Generation Agent

```typescript
interface ScenarioGenerationAgent {
  analyzeWebsite(url: string, options?: AnalysisOptions): Promise<WebsiteAnalysis>;
  generateScenarios(analysis: WebsiteAnalysis, preferences?: GenerationPreferences): Promise<TestScenario[]>;
  createTestFiles(scenarios: TestScenario[], projectConfig: ProjectConfig): Promise<GeneratedFiles>;
}

interface AnalysisOptions {
  depth?: 'shallow' | 'deep';
  includeSubpages?: boolean;
  maxPages?: number;
  excludePatterns?: string[];
}

interface WebsiteAnalysis {
  url: string;
  title: string;
  description?: string;
  pages: PageAnalysis[];
  forms: FormAnalysis[];
  interactiveElements: ElementAnalysis[];
  authenticationRequired: boolean;
  ecommerceFeatures: EcommerceFeatures;
}

interface PageAnalysis {
  url: string;
  title: string;
  accessibilityTree: AccessibilityTree;
  forms: FormAnalysis[];
  links: LinkAnalysis[];
  buttons: ButtonAnalysis[];
}

interface TestScenario {
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  steps: TestStep[];
  expectedResults: string[];
  testData?: Record<string, any>;
  tags: string[];
}

interface TestStep {
  action: string;
  description: string;
  target?: string;
  value?: string;
  waitCondition?: string;
}
```

### 3.2 Test Execution Agent

```typescript
interface TestExecutionAgent {
  parseTestScenario(filePath: string): Promise<ParsedScenario>;
  planExecution(scenario: ParsedScenario, config: ProjectConfig): Promise<ExecutionPlan>;
  executeTest(plan: ExecutionPlan): Promise<TestResult>;
  handleFailure(failure: TestFailure, context: ExecutionContext): Promise<RecoveryAction>;
}

interface ParsedScenario {
  metadata: ScenarioMetadata;
  steps: ParsedTestStep[];
  assertions: ParsedAssertion[];
  testData: Record<string, any>;
}

interface ExecutionPlan {
  scenarioId: string;
  steps: ExecutionStep[];
  setup: SetupStep[];
  teardown: TeardownStep[];
  retryPolicy: RetryPolicy;
}

interface ExecutionStep {
  id: string;
  type: 'navigation' | 'interaction' | 'assertion' | 'wait';
  mcpCommand: MCPCommand;
  validation: ValidationRule[];
  timeout: number;
}

interface TestResult {
  scenarioId: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration: number;
  steps: StepResult[];
  screenshots: Screenshot[];
  logs: LogEntry[];
  aiInsights?: AIInsights;
}
```

### 3.3 Report Analysis Agent

```typescript
interface ReportAnalysisAgent {
  analyzeTestResults(results: TestResult[]): Promise<TestReport>;
  generateInsights(results: TestResult[]): Promise<AIInsights>;
  suggestImprovements(results: TestResult[]): Promise<Improvement[]>;
  detectPatterns(results: TestResult[]): Promise<Pattern[]>;
}

interface TestReport {
  summary: TestSummary;
  results: TestResult[];
  insights: AIInsights;
  recommendations: Recommendation[];
  performanceMetrics: PerformanceMetrics;
  accessibilityFindings: AccessibilityFinding[];
}

interface AIInsights {
  overallAssessment: string;
  keyFindings: string[];
  riskAreas: RiskArea[];
  performanceObservations: string[];
  accessibilityObservations: string[];
  suggestedOptimizations: string[];
}

interface Recommendation {
  type: 'test_improvement' | 'performance' | 'accessibility' | 'reliability';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  implementation: string;
}
```

## 4. Configuration API

### 4.1 Configuration Schema

```typescript
interface FrameworkConfig {
  project: ProjectConfig;
  browser: BrowserConfig;
  authentication?: AuthConfig;
  testData?: Record<string, any>;
  environments?: Record<string, EnvironmentConfig>;
  execution?: ExecutionConfig;
  reporting?: ReportingConfig;
  ai?: AIConfig;
}

interface ProjectConfig {
  name: string;
  description?: string;
  baseUrl: string;
  timeout: number;
  version?: string;
}

interface BrowserConfig {
  type: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  viewport: { width: number; height: number };
  deviceEmulation?: DeviceEmulation;
  launchOptions?: Record<string, any>;
}

interface AuthConfig {
  method: 'form' | 'oauth' | 'token' | 'cookies';
  username?: string;
  password?: string;
  loginUrl?: string;
  successIndicator?: string;
  tokenEndpoint?: string;
  clientId?: string;
  clientSecret?: string;
}

interface ExecutionConfig {
  retryCount: number;
  retryDelay: number;
  parallel: boolean;
  maxParallel?: number;
  screenshotOnFailure: boolean;
  videoRecording?: boolean;
  tracing?: boolean;
}
```

### 4.2 Configuration Validation

```typescript
import { z } from 'zod';

const configSchema = z.object({
  project: z.object({
    name: z.string().min(1),
    baseUrl: z.string().url(),
    timeout: z.number().positive().default(30000)
  }),
  browser: z.object({
    type: z.enum(['chromium', 'firefox', 'webkit']).default('chromium'),
    headless: z.boolean().default(true),
    viewport: z.object({
      width: z.number().positive().default(1280),
      height: z.number().positive().default(720)
    })
  })
});

export function validateConfig(config: any): FrameworkConfig {
  try {
    return configSchema.parse(config);
  } catch (error) {
    throw new ConfigValidationError('Invalid configuration', error.errors);
  }
}
```

## 5. Error Handling API

### 5.1 Error Types

```typescript
// Base error class
export abstract class FrameworkError extends Error {
  abstract readonly code: string;
  abstract readonly category: ErrorCategory;
  readonly timestamp: Date;
  readonly retryable: boolean;

  constructor(
    message: string,
    public readonly details?: any,
    retryable = false
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.retryable = retryable;
  }
}

// Specific error types
export class MCPConnectionError extends FrameworkError {
  readonly code = 'MCP_CONNECTION_FAILED';
  readonly category = ErrorCategory.MCP_SERVER;
}

export class AIProviderError extends FrameworkError {
  readonly code = 'AI_PROVIDER_ERROR';
  readonly category = ErrorCategory.AI_PROVIDER;
}

export class TestExecutionError extends FrameworkError {
  readonly code = 'TEST_EXECUTION_FAILED';
  readonly category = ErrorCategory.TEST_EXECUTION;
}

export class ConfigValidationError extends FrameworkError {
  readonly code = 'CONFIG_VALIDATION_FAILED';
  readonly category = ErrorCategory.CONFIGURATION;
}

export enum ErrorCategory {
  CONFIGURATION = 'configuration',
  NETWORK = 'network',
  AI_PROVIDER = 'ai_provider',
  MCP_SERVER = 'mcp_server',
  TEST_EXECUTION = 'test_execution',
  VALIDATION = 'validation'
}
```

### 5.2 Error Recovery

```typescript
interface ErrorRecoveryStrategy {
  canRecover(error: FrameworkError): boolean;
  recover(error: FrameworkError, context: any): Promise<RecoveryResult>;
}

interface RecoveryResult {
  success: boolean;
  action: 'retry' | 'skip' | 'alternative' | 'abort';
  message?: string;
  data?: any;
}

export class DefaultRecoveryStrategy implements ErrorRecoveryStrategy {
  canRecover(error: FrameworkError): boolean {
    return error.retryable && error.category !== ErrorCategory.CONFIGURATION;
  }

  async recover(error: FrameworkError, context: any): Promise<RecoveryResult> {
    switch (error.category) {
      case ErrorCategory.NETWORK:
        return { success: true, action: 'retry', message: 'Retrying after network error' };
      
      case ErrorCategory.TEST_EXECUTION:
        return { success: true, action: 'alternative', message: 'Trying alternative approach' };
      
      default:
        return { success: false, action: 'abort', message: 'Unrecoverable error' };
    }
  }
}
```

## 6. Plugin API

### 6.1 Plugin Interface

```typescript
interface FrameworkPlugin {
  name: string;
  version: string;
  initialize(framework: Framework): Promise<void>;
  beforeTest?(context: TestContext): Promise<void>;
  afterTest?(context: TestContext, result: TestResult): Promise<void>;
  beforeStep?(context: StepContext): Promise<void>;
  afterStep?(context: StepContext, result: StepResult): Promise<void>;
  cleanup?(): Promise<void>;
}

interface TestContext {
  scenarioId: string;
  projectConfig: ProjectConfig;
  browser: BrowserContext;
  variables: Record<string, any>;
}

interface StepContext extends TestContext {
  stepId: string;
  step: ExecutionStep;
}
```

### 6.2 Example Plugin

```typescript
export class ScreenshotPlugin implements FrameworkPlugin {
  name = 'screenshot-plugin';
  version = '1.0.0';

  async initialize(framework: Framework): Promise<void> {
    console.log('Screenshot plugin initialized');
  }

  async beforeTest(context: TestContext): Promise<void> {
    // Take screenshot before test starts
    await context.browser.screenshot({ path: `before-${context.scenarioId}.png` });
  }

  async afterTest(context: TestContext, result: TestResult): Promise<void> {
    // Take screenshot after test completes
    await context.browser.screenshot({ path: `after-${context.scenarioId}.png` });
  }

  async afterStep(context: StepContext, result: StepResult): Promise<void> {
    // Take screenshot after failed steps
    if (result.status === 'failed') {
      await context.browser.screenshot({ 
        path: `failed-${context.scenarioId}-${context.stepId}.png` 
      });
    }
  }
}
```

## 7. Programmatic Usage

### 7.1 Framework Instance

```typescript
import { Framework } from 'ai-e2e-test-framework';

const framework = new Framework({
  aiProvider: 'openai',
  aiApiKey: process.env.AI_API_KEY,
  mcpConfig: {
    command: 'npx',
    args: ['@playwright/mcp@latest']
  }
});

// Generate tests programmatically
const scenarios = await framework.generateScenarios({
  url: 'https://example.com',
  projectName: 'example-tests'
});

// Execute tests programmatically
const results = await framework.executeTests({
  project: 'example-tests',
  scenarios: ['login-test', 'purchase-flow']
});

// Generate report
const report = await framework.generateReport(results);
```

### 7.2 Custom Agent Implementation

```typescript
import { BaseAgent } from 'ai-e2e-test-framework';

export class CustomAnalysisAgent extends BaseAgent {
  async analyze(input: any): Promise<any> {
    // Custom analysis logic
    const result = await this.aiProvider.analyze(input);
    
    // Custom processing
    return this.processResult(result);
  }

  private processResult(result: any): any {
    // Custom processing logic
    return result;
  }
}

// Use custom agent
const framework = new Framework({
  agents: {
    analysis: new CustomAnalysisAgent()
  }
});
```

This API reference provides comprehensive information for integrating and extending the AI-Powered E2E Test Framework.