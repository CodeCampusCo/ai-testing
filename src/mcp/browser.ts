import { MCPClient } from './client.js';
import { 
  ElementInfo,
  SnapshotResult,
  MCPClientConfig
} from '../types/mcp.js';

export class PlaywrightMCPClient {
  private mcpClient: MCPClient;
  private _currentUrl: string | null = null;
  private availableTools: any[] = [];
  private logger = {
    debug: (msg: string, ...args: any[]) => console.log(`[DEBUG] ${msg}`, ...args),
    info: (msg: string, ...args: any[]) => console.log(`[INFO] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args)
  };

  constructor(
    mcpConfig: MCPClientConfig = {
      command: 'npx',
      args: ['@playwright/mcp@latest'],
      timeout: 30000,
      retries: 3,
      retryDelay: 1000
    }
  ) {
    this.mcpClient = new MCPClient(
      mcpConfig.command || 'npx',
      mcpConfig.args || ['@playwright/mcp@latest'],
      this.logger
    );
  }

  async connect(): Promise<void> {
    await this.mcpClient.connect();
    
    // Load available tools after connection
    const toolsResult = await this.mcpClient.listTools();
    if (toolsResult && (toolsResult as any).tools) {
      this.availableTools = (toolsResult as any).tools;
      console.log(`Loaded ${this.availableTools.length} available tools`);
    }
  }

  async disconnect(): Promise<void> {
    await this.mcpClient.disconnect();
  }

  /**
   * Call any MCP tool dynamically
   */
  async callTool(toolName: string, params: Record<string, unknown> = {}): Promise<any> {
    try {
      console.log(`Calling MCP tool: ${toolName}`, params);
      const result = await this.mcpClient.callTool(toolName, params);
      
      // Update current URL if this was a navigation
      if (toolName === 'browser_navigate' && params.url) {
        this._currentUrl = params.url as string;
      }
      
      return result;
    } catch (error) {
      console.error(`MCP tool call failed: ${toolName}`, error);
      throw error;
    }
  }

  /**
   * Get available tools from MCP server
   */
  getAvailableTools(): any[] {
    return this.availableTools;
  }

  /**
   * Get tool definition by name
   */
  getToolDefinition(toolName: string): any {
    return this.availableTools.find(tool => tool.name === toolName);
  }

  /**
   * Check if a tool is available
   */
  hasToolAvailable(toolName: string): boolean {
    return this.availableTools.some(tool => tool.name === toolName);
  }

  /**
   * Convenience method for navigation
   */
  async navigate(url: string): Promise<any> {
    return this.callTool('browser_navigate', { url });
  }

  /**
   * Get accessibility snapshot with parsed elements
   */
  async getSnapshot(): Promise<SnapshotResult> {
    try {
      const response = await this.callTool('browser_snapshot', {});
      
      // Extract YAML content from response
      let rawYaml = '';
      if (response?.content && Array.isArray(response.content)) {
        for (const content of response.content) {
          if (content?.type === 'text' && content.text) {
            rawYaml += content.text + '\n';
          }
        }
      }
      
      // Parse YAML into structured elements
      const elements = this.parseSnapshotYaml(rawYaml);
      
      return {
        elements,
        rawYaml
      };
    } catch (error) {
      console.error('Failed to get accessibility snapshot:', error);
      return {
        elements: [],
        rawYaml: ''
      };
    }
  }

  /**
   * Parse YAML snapshot into structured elements
   */
  private parseSnapshotYaml(yamlContent: string): ElementInfo[] {
    const elements: ElementInfo[] = [];
    const lines = yamlContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line || line.startsWith('#')) continue;

      // Parse element line format: - textbox "Email address" [ref=e31]: test@example.com
      const elementMatch = this.parseElementLine(line);
      if (elementMatch) {
        elements.push(elementMatch);
      }
    }

    return elements;
  }

  /**
   * Parse individual element line from YAML
   */
  private parseElementLine(line: string): ElementInfo | null {
    // Example formats:
    // - textbox "Email address" [ref=e31]: test@example.com
    // - button "Sign in" [ref=e97] [cursor=pointer]
    // - status [ref=e131]: Welcome back, Test!

    const refMatch = line.match(/\[ref=([^\]]+)\]/);
    if (!refMatch || !refMatch[1]) return null;

    const ref = refMatch[1];

    // Extract element type
    const typeMatch = line.match(/^\s*-\s*(\w+)/);
    const type = typeMatch?.[1] || 'generic';

    // Extract element name (text in quotes)
    const nameMatch = line.match(/"([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : undefined;

    // Extract text content (after colon)
    const textMatch = line.match(/\):\s*(.+)$/);
    const text = textMatch?.[1]?.trim();

    // Extract attributes
    const disabled = line.includes('[disabled]');
    const active = line.includes('[active]');
    const cursor = line.match(/\[cursor=([^\]]+)\]/)?.[1];
    const urlMatch = line.match(/\/url:\s*([^\s]+)/)?.[1];

    const element: ElementInfo = {
      ref,
      type,
      role: type, // Use type as role for simplicity
      disabled,
      active,
    };
    
    if (name) element.name = name;
    if (text) element.text = text;
    if (urlMatch) element.url = urlMatch;
    if (cursor) element.cursor = cursor;
    
    return element;
  }

  /**
   * List all available MCP tools
   */
  async listTools(): Promise<any> {
    return await this.mcpClient.listTools();
  }

  get currentUrl(): string | null {
    return this._currentUrl;
  }

  get isConnected(): boolean {
    return this.mcpClient.isClientConnected();
  }
}