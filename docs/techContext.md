# Technical Context: AI-Powered E2E Test Framework

## 1. Technical Stack

### 1.1 System Requirements

- **Node.js**: v18.0.0 or higher
- **Operating System**: macOS, Linux, or Windows
- **AI Provider Account**: An API key for OpenAI, Anthropic, or Google AI.

### 1.2 Core Dependencies

The project is built with TypeScript and Node.js. Key dependencies include:

- `@langchain/langgraph`: For the core workflow orchestration.
- `@playwright/mcp`: The client for the browser automation server.
- `commander`: For building the CLI interface.
- `zod`: For configuration and data validation.
- `yaml`: For parsing `.yml` config files.
- LLM Libraries: `openai`, `anthropic`, `@google/generative-ai`.

## 2. Installation and Setup

### 2.1 Node.js Installation

It is recommended to use `nvm` (Node Version Manager) to install and manage Node.js versions.

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js v18
nvm install 18
nvm use 18
```

### 2.2 Framework Installation (for Development)

```bash
# Clone the repository
git clone https://github.com/CodeCampusCo/ai-testing.git
cd ai-testing

# Install dependencies
npm install

# Build the project
npm run build
```

### 2.3 AI Provider Setup

The framework requires an API key from an AI provider to function.

1.  **Get an API Key** from OpenAI, Anthropic, or Google AI.
2.  **Create a `.env` file** in the project root:
    ```bash
    cp .env.example .env
    ```
3.  **Edit the `.env` file** with your credentials:
    ```
    AI_PROVIDER=openai  # or anthropic, google
    AI_MODEL=gpt-4      # optional - uses provider defaults
    AI_API_KEY=your-api-key-here
    ```

Alternatively, these values can be set as environment variables.

## 3. MCP Integration

The framework communicates with a Playwright MCP (Model-Controller-Proxy) server for browser automation.

- **Server Command**: The client starts the server using `npx @playwright/mcp@latest`.
- **Client**: The `PlaywrightMCPClient` class in the framework is a wrapper that manages the server process and communication.

In environments like Claude Desktop or the VS Code MCP extension, the server is managed automatically.

## 4. Configuration Schemas

Configuration is validated using Zod schemas.

### 4.1 Environment Configuration (`.env`)

```typescript
const environmentSchema = z.object({
  AI_PROVIDER: z.enum(['openai', 'anthropic', 'google']).default('openai'),
  AI_MODEL: z.string().optional(),
  AI_API_KEY: z.string(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});
```

### 4.2 Project Configuration (`config.yml`)

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
  // ... and other project-specific settings
});
```
