# Technical Specifications: AI-Powered E2E Test Framework

## 1. Architecture Overview

### 1.1 High-Level Architecture

```mermaid
graph TB
    subgraph "User Interface"
        A[CLI Interface]
        J[Natural Language Input]
        K[Configuration Files]
    end

    subgraph "Core Framework"
        B[LangGraph Workflow]
        F[LangChain AI Service]
        G[Playwright MCP Client]
    end

    subgraph "AI Agents (Graph Nodes)"
        D[TestExecutorAgent]
        E[AnalysisAgent]
    end

    subgraph "External Services"
        H[@playwright/mcp Server]
        I[Browser Engines<br/>Chrome | Firefox | Safari]
        P[LLM Providers<br/>OpenAI | Anthropic | Google]
    end

    A & J & K --> B

    B -- Manages State --> D
    B -- Manages State --> E

    D -- Uses --> F
    E -- Uses --> F
    D -- Uses --> G

    F --> P
    G --> H
    H --> I
```

### 1.2 Component Responsibilities

| Component                 | Responsibility                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **CLI Interface**         | User interaction, command parsing, and input validation.                                                                                  |
| **LangGraph Workflow**    | The core orchestrator. Manages the state and control flow between agents using a graph-based structure.                                   |
| **LangChain AI Service**  | A centralized, unified service for all interactions with LLM providers. Handles prompt templating and structured output parsing.          |
| **Test Execution Agent**  | A pure AI-driven orchestrator. For each natural language step, it uses the AI Service to generate and execute the necessary MCP commands. |
| **Report Analysis Agent** | An AI-driven node that analyzes the final `TestResult` to generate summaries, identify issues, and provide suggestions.                   |
| **Playwright MCP Client** | A client wrapper for communicating with the `@playwright/mcp` server for all browser automation tasks.                                    |

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
      serverArgs: ['@playwright/mcp@latest'],
    });
    await this.client.connect();
  }

  async executeCommand(command: string, params: object) {
    return await this.client.callTool(command, params);
  }
}
```

## 3. Data Flow Architecture

### 3.1 Test Execution Flow

```
Test Files → Parsing → AI Translation → MCP Commands → Browser Actions → Results
     ↓         ↓           ↓              ↓              ↓            ↓
   .md/.yml → AST → Natural Language → Playwright → Accessibility → Reports
```

## 4. Agent & Workflow Architecture

The framework's core logic is built on a modular, AI-first architecture orchestrated by LangGraph.

### 4.1 LangGraph Workflow

The `LangGraphWorkflow` class is the central orchestrator. It defines a stateful graph where each node is an agent. It manages the flow of data (`WorkflowState`) between nodes and handles conditional branching (e.g., ending execution on failure).

### 4.2 AI Agent Unification

All agents that require AI capabilities (like `AnalysisAgent`) extend a common `AIAgent` base class. This base class is now refactored to use a single, shared `LangChainAIService` instance, ensuring all AI interactions are consistent, stable, and managed centrally.

### 4.3 Pure AI-Driven Test Executor

The `TestExecutorAgent` has been significantly refactored to embody a "Pure AI-First" approach.

- It no longer contains rule-based logic (like `switch` statements) for different actions.
- Its primary role is to loop through the natural language steps (`rawSteps`) of a test scenario.
- For **each step**, it gets the current browser snapshot and calls the `LangChainAIService`.
- The `LangChainAIService` is responsible for generating the correct sequence of one or more MCP tool calls required to perform the action described in the step. This includes intelligently adding `browser_wait_for` commands after actions that cause page navigation, which solves timing-related errors.
- The `TestExecutorAgent` then simply executes the MCP commands returned by the AI service.

This architecture makes the executor extremely flexible and powerful, as the intelligence for performing actions resides within the AI prompt rather than being hardcoded in the framework.

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
  MCP_CLIENT_CONFIG: z.string().optional(),
});
```

### 5.2 Project Configuration Schema

```typescript
const projectConfigSchema = z.object({
  project: z.object({
    name: z.string(),
    baseUrl: z.string().url(),
    timeout: z.number().positive().default(30000),
  }),
  browser: z.object({
    type: z.enum(['chromium', 'firefox', 'webkit']).default('chromium'),
    headless: z.boolean().default(true),
    viewport: z.object({
      width: z.number().positive().default(1280),
      height: z.number().positive().default(720),
    }),
  }),
  authentication: z
    .object({
      username: z.string().optional(),
      password: z.string().optional(),
      loginUrl: z.string().optional(),
    })
    .optional(),
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
  VALIDATION = 'validation',
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
  async executeWithRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
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
      ttl: options.cacheTtl || 300000, // 5 minutes
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
// Example Agent unit test
describe('AnalysisAgent', () => {
  it('should provide a summary and suggestions for a test result', async () => {
    const mockResult = createMockTestResult();
    const agent = new AnalysisAgent(mockAIService);

    const analysis = await agent.process(mockResult);

    expect(analysis.summary).toBeDefined();
    expect(analysis.suggestions).toBeInstanceOf(Array);
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
      selector: 'button[type="submit"]',
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
    new winston.transports.File({ filename: 'framework.log' }),
  ],
});
```
