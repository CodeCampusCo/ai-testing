# AI-Powered E2E Test Framework

> An intelligent end-to-end testing framework that leverages AI and Playwright MCP for accessible, efficient, and natural language-driven test automation.

## 🚀 Quick Start

```bash
# Install the framework
npm install -g ai-e2e-test-framework

# Configure MCP client
echo '{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}' > ~/.mcp-config.json

# Set up environment
export AI_PROVIDER=openai
export AI_API_KEY=your-api-key-here

# Create your first test project
my-cli-generate --init --project-name "my-website-tests"

# Generate tests interactively
my-cli-generate --url "https://example.com"

# Run tests
my-cli-run --project "my-website-tests" --scenario "login-test"
```

## ✨ Key Features

- **🤖 AI-Powered**: Natural language test creation and analysis
- **⚡ Fast & Reliable**: Uses Playwright MCP accessibility snapshots instead of screenshots
- **📝 Human-Readable**: Write tests in Markdown, configure in YAML
- **🔄 CI/CD Ready**: Headless execution with detailed reporting
- **🛡️ Accessibility-First**: Built-in accessibility testing and insights
- **🎯 Interactive Mode**: Conversational test generation

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Your Tests    │───▶│  AI Framework    │───▶│ Playwright MCP  │
│   (.md + .yml)  │    │  (LangGraph.js)  │    │    Server       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                               │
                       ┌──────────────────┐
                       │   AI Provider    │
                       │ (GPT-4/Claude)   │
                       └──────────────────┘
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