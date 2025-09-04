# AI-Powered E2E Test Framework

> An intelligent end-to-end testing framework that leverages AI and Playwright MCP for accessible, efficient, and natural language-driven test automation.

## 🚀 Quick Start

```bash
# Install the framework
npm install -g ai-e2e-test-framework

# Configure AI provider (one-time setup)
cp .env.example .env
# Edit .env with your API key

# OR use environment variables
export AI_PROVIDER=openai  # or anthropic, google
export AI_API_KEY=your-api-key-here
export AI_MODEL=gpt-4  # optional, uses provider defaults

# Generate test scenario from natural language
ai-e2e-test generate -i "Test login flow for my website"

# Generate interactively 
ai-e2e-test generate --interactive

# Run complete test workflow (generate + execute + analyze)
ai-e2e-test run -i "Test Google search functionality"

# Run from existing scenario file
ai-e2e-test run -f ./my-test-scenario.json
```

## ✨ Key Features

- **🤖 AI-Powered**: Natural language → executable browser tests with 3 specialized agents
- **⚡ Dynamic MCP Integration**: Runtime tool discovery with 21+ Playwright automation tools  
- **🎯 Multi-Provider AI**: OpenAI, Anthropic, Google AI support with automatic failover
- **📊 Intelligent Analysis**: AI-powered result analysis with actionable insights
- **🛡️ Accessibility-First**: Built-in accessibility scoring and issue detection
- **🚀 Production CLI**: Complete command suite with streaming progress updates
- **🔄 CI/CD Ready**: Headless execution with comprehensive JSON reporting

## 🏗️ Architecture

```
┌────────────────────┐
│ Natural Language Input  │
│ "Test login flow"       │
└─────────┬──────────┘
           │
           ▼ AI Workflow (3 Agents)
┌─────────┴──────────┐
│ 🧠 ScenarioGenerator  │ ──▶ Structured Test Steps
├────────────────────┤
│ 🌐 TestExecutor       │ ──▶ Browser Automation
├────────────────────┤     (via Dynamic MCP)
│ 📊 AnalysisAgent     │ ──▶ AI Insights & Reports
└────────────────────┘
           │
           ▼ Multi-Provider AI
┌────────────────────┐
│ OpenAI │ Anthropic │ Google │
└────────────────────┘
```

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [📋 PRD](./docs/PRD.md) | Product Requirements Document |
| [🔧 Technical Specs](./docs/TECHNICAL_SPECS.md) | Architecture & Implementation |
| [🔌 API Reference](./docs/API_REFERENCE.md) | MCP Integration & Agent APIs |
| [📄 File Formats](./docs/FILE_FORMATS.md) | Test scenario & config formats |
| [⚙️ Installation](./docs/INSTALLATION.md) | Setup & Configuration guide |
| [💡 Examples](./docs/EXAMPLES.md) | Sample projects & templates |
| [🛣️ Roadmap](./docs/ROADMAP.md) | Future features & timeline |

## 🎯 Use Cases

- **Web Application Testing**: Login flows, form validation, user journeys
- **E-commerce Testing**: Shopping carts, checkout processes, payment flows
- **Dashboard Testing**: Data visualization, filtering, user interactions
- **Accessibility Testing**: WCAG compliance, screen reader compatibility
- **CI/CD Integration**: Automated testing in deployment pipelines

## 🛠️ Requirements

- Node.js v18.0.0 or higher
- MCP-compatible client (Claude, VS Code with MCP extension)
- AI Provider API key (OpenAI, Anthropic, or Google)

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for details.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🆘 Support

- 📚 [Documentation](./docs/)
- 🐛 [Report Issues](https://github.com/your-org/ai-e2e-test-framework/issues)
- 💬 [Discussions](https://github.com/your-org/ai-e2e-test-framework/discussions)