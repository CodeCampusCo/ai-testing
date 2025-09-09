# Installation & Setup Guide

## Prerequisites

### System Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher (or yarn v1.22.0+)
- **Operating System**: macOS, Linux, or Windows 10/11
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: 500MB free space

### Required Accounts

- **AI Provider Account**: OpenAI, Anthropic, or Google AI (API key required)
- **Optional**: Claude Desktop, VS Code with MCP extension for advanced features

## 1. Install Node.js

### Option A: Official Installer

1. Visit [nodejs.org](https://nodejs.org/)
2. Download the LTS version (v18+)
3. Run the installer and follow the prompts

### Option B: Using nvm (Recommended)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js v18
nvm install 18
nvm use 18
nvm alias default 18
```

### Verify Installation

```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show v8.x.x or higher
```

## 2. Install AI E2E Test Framework

### Global Installation (Recommended)

```bash
# Install globally from npm (when published)
npm install -g ai-e2e-test-framework

# Verify installation
ai-e2e-test --version  # Should show v0.1.0-alpha
```

### Local Development Installation

```bash
# Clone the repository
git clone https://github.com/CodeCampusCo/ai-testing.git
cd ai-testing

# Install dependencies
npm install

# Build the project
npm run build

# Test installation
node dist/cli/index.js --version

# Link for global usage (optional)
npm link
```

## 3. Configure MCP Server (if not already running)

The framework requires a running Playwright MCP server to control the browser. If you are using an environment like Claude Desktop or the VS Code MCP extension that manages this for you, you can skip this step.

To run the server manually:

```bash
npx @playwright/mcp@latest
```

## 4. Configure AI Provider

### Option A: Manual .env File Setup (Recommended)

1. **Get API Key from your provider:**
   - **OpenAI**: [platform.openai.com](https://platform.openai.com/)
   - **Anthropic**: [console.anthropic.com](https://console.anthropic.com/)
   - **Google AI**: [ai.google.dev](https://ai.google.dev/)

2. **Create .env file:**

```bash
# Copy example file
cp .env.example .env

# Edit .env with your configuration
AI_PROVIDER=openai  # or anthropic, google
AI_MODEL=gpt-4      # optional - uses provider defaults
AI_API_KEY=your-api-key-here
```

3. **Provider-specific default models:**

```bash
# OpenAI
AI_PROVIDER=openai
AI_MODEL=gpt-4      # default

# Anthropic
AI_PROVIDER=anthropic
AI_MODEL=claude-3-sonnet-20240229  # default

# Google AI
AI_PROVIDER=google
AI_MODEL=gemini-pro  # default
```

### Option B: Environment Variables

```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.profile
export AI_PROVIDER=openai
export AI_MODEL=gpt-4
export AI_API_KEY=your-openai-api-key-here
```

## 5. Optional Configuration

### Advanced Environment Variables

```bash
# Logging configuration
export LOG_LEVEL=info                    # debug | info | warn | error

# MCP configuration
export MCP_CLIENT_CONFIG=~/.config/mcp/config.json

# Framework behavior
export TEST_TIMEOUT=60000                # Default test timeout (ms)
export RETRY_COUNT=3                     # Default retry attempts
export SCREENSHOT_ON_FAILURE=true       # Capture screenshots on failure

# Performance tuning
export MAX_PARALLEL_TESTS=4              # Maximum parallel test execution
export AI_REQUEST_TIMEOUT=30000          # AI request timeout (ms)
```

### Project-Specific .env File

```bash
# Each project can have its own .env file
cd your-project-directory

# Create from template
cp /path/to/ai-e2e-framework/.env.example .env

# Edit with project-specific settings
nano .env
```

## 6. Verify Installation

### Test Basic Functionality

```bash
# From the root of the project, run a test
ai-e2e-test run -p example-project -f login-test
```

A successful test run will be indicated by the test status in the console.

## 7. IDE Setup (Optional)

### VS Code Extensions

Install recommended extensions for better development experience:

```bash
# Install VS Code extensions
code --install-extension ms-vscode.vscode-yaml
code --install-extension davidanson.vscode-markdownlint
code --install-extension ms-vscode.vscode-json
```

### VS Code Settings

Create `.vscode/settings.json` in your project:

```json
{
  "yaml.schemas": {
    "./schemas/config-schema.json": "projects/*/config.yml"
  },
  "markdown.validate.enabled": true,
  "markdown.lint.enabled": true,
  "files.associations": {
    "*.md": "markdown"
  }
}
```

## 8. Troubleshooting

### Common Issues

#### 1. MCP Server Connection Failed

**Error**: `Cannot connect to MCP server`

**Solution**:

```bash
# Check if Playwright MCP is installed
npx @playwright/mcp --version

# If not installed, install it manually
npm install -g @playwright/mcp@latest

# Verify MCP config file exists and is valid
cat ~/.config/mcp/config.json | jq .
```

#### 2. AI Provider Authentication Failed

**Error**: `No API key found` or `Authentication failed`

**Solution**:

```bash
# Check if .env file exists
ls -la .env

# Check environment variables
echo $AI_PROVIDER
echo $AI_API_KEY

# Create .env from template
cp .env.example .env
# Edit .env with your API key
```

#### 3. Permission Denied Errors

**Error**: `EACCES: permission denied`

**Solution**:

```bash
# Fix npm permissions
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Reinstall framework
npm uninstall -g ai-e2e-test-framework
npm install -g ai-e2e-test-framework
```

#### 4. Node.js Version Issues

**Error**: `Unsupported Node.js version`

**Solution**:

```bash
# Check current version
node --version

# Upgrade using nvm
nvm install 18
nvm use 18

# Or download latest from nodejs.org
```

### Getting Help

If you encounter issues not covered here:

1. **Check Documentation**: Visit [docs/](../docs/) for detailed guides
2. **Enable Verbose Logging**: Use the `-v` or `--verbose` flag when running a command to get detailed debug output.
3. **Check Logs**: Review the console output for error messages.
4. **Community Support**: Visit our [GitHub Issues](https://github.com/your-org/ai-e2e-test-framework/issues)

### Support Information Collection

When reporting issues, include:

```bash
# Include in your issue report:
# - Error messages and stack traces
# - Steps to reproduce
# - Expected vs actual behavior
```

## 9. Next Steps

After successful installation:

1. **Read the Quick Start**: Follow [README.md](../README.md) for basic usage
2. **Study Examples**: Review [docs/EXAMPLES.md](./EXAMPLES.md) for sample projects
3. **Learn File Formats**: Understand [docs/FILE_FORMATS.md](./FILE_FORMATS.md)
4. **Explore API**: Check [docs/API_REFERENCE.md](./API_REFERENCE.md) for advanced usage

## 10. Updating the Framework

### Check for Updates

```bash
# Check current version
ai-e2e-test --version

# Check for available updates
npm outdated -g ai-e2e-test-framework
```

### Update to Latest Version

```bash
# Update the framework
npm update -g ai-e2e-test-framework

# Update MCP server
npm update -g @playwright/mcp
```

### Version Management

```bash
# Install specific version
npm install -g ai-e2e-test-framework@1.2.3

# List installed versions
npm list -g --depth=0
```
