# System Patterns: AI-Powered E2E Test Framework

## 1. Architecture Overview

The framework's core logic is built on a modular, "AI-First" architecture orchestrated by LangGraph.

### 1.1 High-Level Architecture

```mermaid
graph TB
    subgraph "User Interface"
        A[CLI Interface]
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
        I[Browser Engines]
        P[LLM Providers]
    end

    A & K --> B
    B -- Manages State --> D & E
    D & E -- Uses --> F
    D -- Uses --> G
    F --> P
    G --> H
    H --> I
```

### 1.2 Data Flow

The test execution follows a linear data flow:

```
Test Files (.md/.yml) → Parsing → AI Translation → MCP Commands → Browser Actions → Results/Reports
```

## 2. Core Components & APIs

This section details the responsibilities of each major component.

### 2.1 `LangGraphWorkflow`

The central orchestrator of the framework. It defines a stateful graph where each node is an AI agent. It manages the entire lifecycle of a test run, from parsing the input markdown file to generating the final analysis.

### 2.2 `LangChainAIService`

A unified, centralized service that handles all communication with external Large Language Models (LLMs) like OpenAI, Anthropic, and Google. All agents use this single service, ensuring consistency and stability for all AI-powered logic.

### 2.3 `PlaywrightMCPClient`

A client responsible for managing the `@playwright/mcp` server process and sending browser automation commands to it.

### 2.4 AI Agents (Workflow Nodes)

The agents are the "brains" of the framework, each performing a specialized task.

#### `TestExecutorAgent`

- **Input**: A `TestScenario` object (from a parsed markdown file).
- **Process**: Implements the "Pure AI-First" execution model. For each natural language step, it captures the current state of the web page (via an accessibility snapshot) and asks the `LangChainAIService` to generate the appropriate MCP browser commands. It then executes these commands.
- **Output**: A `TestResult` object containing the status of each step, duration, and screenshots.

#### `AnalysisAgent`

- **Input**: A `TestScenario` and the corresponding `TestResult`.
- **Process**: Uses the `LangChainAIService` to analyze the test results, providing a summary, a list of issues, and actionable suggestions.
- **Output**: A `TestAnalysis` object.

## 3. Key Architectural Patterns

### 3.1 AI-First Execution

The `TestExecutorAgent` embodies this pattern. Instead of using hardcoded logic (e.g., `if step is "click", then call browser.click`), it treats the AI as a reasoning engine.

- It loops through the natural language steps (`rawSteps`).
- For **each step**, it provides the AI with the step description and a real-time snapshot of the web page.
- The `LangChainAIService` is prompted to generate the correct sequence of one or more MCP tool calls required to perform the action. This includes intelligently adding `browser_wait_for` commands after actions that cause page navigation, which solves timing-related errors.
- The agent simply executes the commands returned by the AI.

This pattern makes the executor extremely flexible, as the intelligence for performing actions resides within the AI prompt rather than the code.

### 3.2 Centralized AI Service

All AI-related logic, including prompt templating, model interaction, and structured output parsing, is handled by the `LangChainAIService`. This ensures that all agents interact with LLMs in a consistent and stable manner.

## 4. Error Handling & Performance

### 4.1 Error Handling

The framework defines specific error categories (`Configuration`, `Network`, `AI_Provider`, etc.) and includes a `RetryManager` to handle retryable operations, improving the reliability of tests.

### 4.2 Performance

Performance is optimized through techniques like caching accessibility snapshots to avoid redundant MCP calls and optimizing AI prompts to reduce token usage.
