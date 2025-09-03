import { MCPClient } from './client.js';
import { 
  ElementInfo,
  SnapshotResult,
  ActionResult,
  BrowserConfig,
  MCPClientConfig,
  PlaywrightTool,
  PlaywrightToolParams 
} from '../types/mcp.js';

export class PlaywrightMCPClient {
  private mcpClient: MCPClient;
  private _currentUrl: string | null = null;

  constructor(
    mcpConfig: MCPClientConfig = {
      command: 'npx',
      args: ['@playwright/mcp@latest'],
      timeout: 30000,
      retries: 3,
      retryDelay: 1000
    }
  ) {
    this.mcpClient = new MCPClient(mcpConfig);
  }

  async connect(): Promise<void> {
    await this.mcpClient.connect();
  }

  async disconnect(): Promise<void> {
    await this.mcpClient.disconnect();
  }

  async navigate(url: string): Promise<ActionResult> {
    try {
      await this.mcpClient.callTool('playwright_goto', { url });
      this._currentUrl = url;
      
      return {
        success: true,
        url: url
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Navigation failed'
      };
    }
  }

  async click(selector?: string, ref?: string): Promise<ActionResult> {
    try {
      const params: any = {};
      if (selector) params.selector = selector;
      if (ref) params.ref = ref;
      
      await this.mcpClient.callTool('playwright_click', params);
      
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Click failed'
      };
    }
  }

  async type(text: string, selector?: string, ref?: string): Promise<ActionResult> {
    try {
      const params: any = { text };
      if (selector) params.selector = selector;
      if (ref) params.ref = ref;
      
      await this.mcpClient.callTool('playwright_type', params);
      
      return {
        success: true,
        text: text
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Type failed'
      };
    }
  }

  async waitForElement(selector?: string, ref?: string, timeout?: number): Promise<ActionResult> {
    try {
      const params: any = {};
      if (selector) params.selector = selector;
      if (ref) params.ref = ref;
      if (timeout) params.timeout = timeout;
      
      await this.mcpClient.callTool('playwright_wait_for_element', params);
      
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Wait failed'
      };
    }
  }

  async screenshot(fullPage: boolean = false): Promise<ActionResult> {
    try {
      await this.mcpClient.callTool('playwright_screenshot', { fullPage });
      
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Screenshot failed'
      };
    }
  }

  async getSnapshot(): Promise<SnapshotResult> {
    try {
      const response = await this.mcpClient.callTool('playwright_snapshot', {});
      
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