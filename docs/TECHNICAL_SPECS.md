# Technical Specifications: AI-Powered E2E Test Framework

## 1. Architecture Overview

### 1.1 High-Level Architecture

```mermaid
graph TB
    A[CLI Interface] --> B[Simple Workflow Engine]
    B --> C[ScenarioGeneratorAgent]
    B --> D[TestExecutorAgent] 
    B --> E[AnalysisAgent]
    
    C --> F[Multi-Provider AI<br/>OpenAI | Anthropic | Google]
    D --> G[Dynamic MCP Client]
    E --> F
    
    G --> H[@playwright/mcp Server]
    H --> I[Browser Engines<br/>Chrome | Firefox | Safari]
    
    J[Natural Language Input] --> B
    K[Configuration] --> B
    
    B --> L[JSON Test Reports]
    B --> M[Screenshots & Snapshots]
```

### 1.2 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **CLI Interface** | User interaction, command parsing, input validation |
| **LangGraph.js Orchestrator** | Agent coordination, workflow management, state handling |
| **Scenario Generation Agent** | Website analysis, test scenario creation, .md/.yml generation |
| **Test Execution Agent** | Natural language to MCP command translation, test execution |
| **Report Analysis Agent** | Test result processing, insight generation, recommendations |
| **Playwright MCP Server** | Browser automation via accessibility snapshots |

## 2. Technical Stack

### 2.1 Core Dependencies

```json
{
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@langchain/langgraph": "^0.0.26",
    "@playwright/mcp": "latest",
    "commander": "^11.0.0",
    "inquirer": "^9.0.0",
    "yaml": "^2.3.0",
    "zod": "^3.22.0",
    "openai": "^4.0.0",
    "anthropic": "^0.20.0",
    "@google/generative-ai": "^0.1.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^18.0.0",
    "vitest": "^1.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### 2.2 MCP Integration

#### Server Configuration
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

#### Client Connection
```typescript
import { MCPClient } from '@mcp/client';

class PlaywrightMCPClient {
  private client: MCPClient;
  
  async connect() {
    this.client = new MCPClient({
      serverCommand: 'npx',
      serverArgs: ['@playwright/mcp@latest']
    });
    await this.client.connect();
  }
  
  async executeCommand(command: string, params: object) {
    return await this.client.callTool(command, params);
  }
}
```

## 3. Data Flow Architecture

### 3.1 Test Generation Flow

```
User Input → Website Analysis → AI Processing → Scenario Generation → File Creation
     ↓              ↓               ↓                ↓               ↓
   CLI Args → MCP Snapshot → GPT-4 Analysis → .md Template → .yml Config
```

### 3.2 Test Execution Flow

```
Test Files → Parsing → AI Translation → MCP Commands → Browser Actions → Results
     ↓         ↓           ↓              ↓              ↓            ↓
   .md/.yml → AST → Natural Language → Playwright → Accessibility → Reports
```

## 4. Agent Implementations

### 4.1 Scenario Generation Agent

```typescript
interface ScenarioGenerationAgent {
  analyzeWebsite(url: string): Promise<WebsiteAnalysis>;
  generateScenarios(analysis: WebsiteAnalysis): Promise<TestScenario[]>;
  createTestFiles(scenarios: TestScenario[], config: ProjectConfig): Promise<void>;
}

class ScenarioGenerationAgentImpl implements ScenarioGenerationAgent {
  constructor(
    private mcpClient: PlaywrightMCPClient,
    private aiProvider: AIProvider
  ) {}
  
  async analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
    const snapshot = await this.mcpClient.takeSnapshot(url);
    const analysis = await this.aiProvider.analyze(
      `Analyze this accessibility tree for testable elements: ${snapshot}`
    );
    return this.parseAnalysis(analysis);
  }
}
```

### 4.2 Test Execution Agent

```typescript
interface TestExecutionAgent {
  parseTestScenario(filePath: string): Promise<TestSteps[]>;
  executeTest(steps: TestSteps[], config: ProjectConfig): Promise<TestResult>;
  handleRetries(failedStep: TestStep, context: ExecutionContext): Promise<TestStep>;
}

class TestExecutionAgentImpl implements TestExecutionAgent {
  async executeTest(steps: TestSteps[], config: ProjectConfig): Promise<TestResult> {
    const browser = await this.mcpClient.launchBrowser(config.browser);
    
    for (const step of steps) {
      try {
        const mcpCommand = await this.translateToMCP(step);
        await this.mcpClient.executeCommand(mcpCommand.command, mcpCommand.params);
      } catch (error) {
        const retryStep = await this.handleRetries(step, { browser, config });
        if (retryStep) {
          await this.executeStep(retryStep);
        } else {
          throw error;
        }
      }
    }
  }
}
```

## 5. Configuration Management

### 5.1 Environment Configuration

```typescript
interface EnvironmentConfig {
  aiProvider: 'openai' | 'anthropic' | 'google';
  aiModel: string;
  aiApiKey: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  mcpClientConfig?: string;
}

const environmentSchema = z.object({
  AI_PROVIDER: z.enum(['openai', 'anthropic', 'google']).default('openai'),
  AI_MODEL: z.string().optional(),
  AI_API_KEY: z.string(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  MCP_CLIENT_CONFIG: z.string().optional()
});
```

### 5.2 Project Configuration Schema

```typescript
const projectConfigSchema = z.object({
  project: z.object({
    name: z.string(),
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
  }),
  authentication: z.object({
    username: z.string().optional(),
    password: z.string().optional(),
    loginUrl: z.string().optional()
  }).optional()
});
```

## 6. Error Handling Strategy

### 6.1 Error Categories

```typescript
enum ErrorCategory {
  CONFIGURATION = 'configuration',
  NETWORK = 'network', 
  AI_PROVIDER = 'ai_provider',
  MCP_SERVER = 'mcp_server',
  TEST_EXECUTION = 'test_execution',
  VALIDATION = 'validation'
}

interface FrameworkError {
  category: ErrorCategory;
  code: string;
  message: string;
  details?: object;
  suggestions?: string[];
  retryable: boolean;
}
```

### 6.2 Retry Mechanisms

```typescript
class RetryManager {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (!this.isRetryable(error) || attempt === options.maxAttempts) {
          throw error;
        }
        
        await this.delay(options.backoffMs * Math.pow(2, attempt - 1));
      }
    }
    
    throw lastError;
  }
}
```

## 7. Performance Optimizations

### 7.1 Accessibility Snapshot Caching

```typescript
class SnapshotCache {
  private cache = new Map<string, CachedSnapshot>();
  
  async getSnapshot(url: string, options: SnapshotOptions): Promise<AccessibilitySnapshot> {
    const key = this.generateKey(url, options);
    const cached = this.cache.get(key);
    
    if (cached && !this.isExpired(cached)) {
      return cached.snapshot;
    }
    
    const snapshot = await this.mcpClient.takeSnapshot(url, options);
    this.cache.set(key, {
      snapshot,
      timestamp: Date.now(),
      ttl: options.cacheTtl || 300000 // 5 minutes
    });
    
    return snapshot;
  }
}
```

### 7.2 AI Token Optimization

```typescript
class TokenOptimizer {
  optimizePrompt(originalPrompt: string, context: PromptContext): string {
    // Remove redundant information
    const deduplicated = this.removeDuplicates(originalPrompt);
    
    // Compress accessibility data
    const compressed = this.compressAccessibilityData(deduplicated, context);
    
    // Apply context-aware truncation
    return this.truncateIntelligently(compressed, context.maxTokens);
  }
  
  estimateTokenCost(prompt: string, model: string): number {
    const tokenCount = this.countTokens(prompt, model);
    return tokenCount * this.getModelPricing(model);
  }
}
```

## 8. Testing Strategy

### 8.1 Unit Testing

```typescript
// Agent unit tests
describe('ScenarioGenerationAgent', () => {
  it('should generate valid test scenarios from accessibility snapshot', async () => {
    const mockSnapshot = createMockSnapshot();
    const agent = new ScenarioGenerationAgentImpl(mockMcpClient, mockAI);
    
    const scenarios = await agent.generateScenarios(mockSnapshot);
    
    expect(scenarios).toHaveLength(3);
    expect(scenarios[0].steps).toBeDefined();
    expect(scenarios[0].assertions).toBeDefined();
  });
});
```

### 8.2 Integration Testing

```typescript
// MCP integration tests
describe('PlaywrightMCP Integration', () => {
  it('should successfully connect to MCP server', async () => {
    const client = new PlaywrightMCPClient();
    await expect(client.connect()).resolves.not.toThrow();
  });
  
  it('should execute browser commands through MCP', async () => {
    const result = await client.executeCommand('click', {
      selector: 'button[type="submit"]'
    });
    expect(result.success).toBe(true);
  });
});
```

## 9. Deployment Architecture

### 9.1 CLI Distribution

```yaml
# GitHub Actions workflow
name: Release
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - run: npm publish
```

### 9.2 Docker Support

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
RUN npm link

ENTRYPOINT ["my-cli-run"]
```

## 10. Monitoring and Observability

### 10.1 Metrics Collection

```typescript
interface FrameworkMetrics {
  testExecutionTime: number;
  aiTokensUsed: number;
  mcpCommandsExecuted: number;
  errorRate: number;
  successRate: number;
}

class MetricsCollector {
  async recordTestExecution(result: TestResult): Promise<void> {
    await this.metrics.increment('tests_executed');
    await this.metrics.histogram('execution_time', result.duration);
    await this.metrics.increment(`tests_${result.status}`);
  }
}
```

### 10.2 Logging Strategy

```typescript
import { createLogger } from 'winston';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'framework.log' })
  ]
});
```