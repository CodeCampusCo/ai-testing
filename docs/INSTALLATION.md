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

## 3. Configure AI Provider

### Global Installation (Recommended)
```bash
npm install -g ai-e2e-test-framework
```

### Verify Installation
```bash
my-cli-generate --version
my-cli-run --version
```

## 3. Configure MCP Server

### Option A: Claude Desktop
1. Open Claude Desktop application
2. Navigate to Settings → Developer
3. Create or edit your MCP configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

4. Restart Claude Desktop

### Option B: VS Code with MCP Extension
1. Install the MCP extension for VS Code
2. Open VS Code settings (Ctrl/Cmd + ,)
3. Search for "MCP"
4. Add server configuration:

```json
{
  "mcp.servers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### Option C: Manual MCP Client Setup
If using a custom MCP client:

```bash
# Create MCP config directory
mkdir -p ~/.config/mcp

# Create configuration file
cat > ~/.config/mcp/config.json << EOF
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
EOF
```

## 4. Configure AI Provider

### Option A: OpenAI
1. Visit [platform.openai.com](https://platform.openai.com/)
2. Create an account and generate an API key
3. Set environment variables:

```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.profile
export AI_PROVIDER=openai
export AI_MODEL=gpt-4
export AI_API_KEY=your-openai-api-key-here
```

### Option B: Anthropic (Claude)
1. Visit [console.anthropic.com](https://console.anthropic.com/)
2. Create an account and generate an API key
3. Set environment variables:

```bash
export AI_PROVIDER=anthropic
export AI_MODEL=claude-3-sonnet-20240229
export AI_API_KEY=your-anthropic-api-key-here
```

### Option C: Google AI
1. Visit [ai.google.dev](https://ai.google.dev/)
2. Create an account and generate an API key
3. Set environment variables:

```bash
export AI_PROVIDER=google
export AI_MODEL=gemini-pro
export AI_API_KEY=your-google-api-key-here
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

### Create Environment File
```bash
# Create .env file for project-specific settings
cat > ~/.ai-e2e-framework.env << EOF
AI_PROVIDER=openai
AI_MODEL=gpt-4
AI_API_KEY=your-api-key-here
LOG_LEVEL=info
SCREENSHOT_ON_FAILURE=true
EOF
```

## 6. Verify Installation

### Run System Check
```bash
my-cli-generate --doctor
```

This command will verify:
- ✅ Node.js version compatibility
- ✅ Framework installation
- ✅ MCP server connectivity
- ✅ AI provider configuration
- ✅ Required dependencies

### Test Basic Functionality
```bash
# Create a test project
mkdir test-installation
cd test-installation

# Initialize new project
my-cli-generate --init --project-name "installation-test"

# Verify project structure
ls -la projects/installation-test/
```

Expected output:
```
projects/installation-test/
├── config.yml
└── sample-test.md
```

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
**Error**: `Invalid API key` or `Authentication failed`

**Solution**:
```bash
# Check if environment variables are set
echo $AI_PROVIDER
echo $AI_API_KEY

# Test API key manually
curl -H "Authorization: Bearer $AI_API_KEY" \
  https://api.openai.com/v1/models
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
2. **Run Diagnostics**: Use `my-cli-generate --doctor` for system checks
3. **Check Logs**: Review logs in `~/.ai-e2e-framework/logs/`
4. **Community Support**: Visit our [GitHub Issues](https://github.com/your-org/ai-e2e-test-framework/issues)

### Support Information Collection

When reporting issues, include:

```bash
# Generate system information
my-cli-generate --system-info > system-info.txt

# Include in your issue report:
# - system-info.txt
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
my-cli-generate --version

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