import { MCPClient } from './client.js';
import { 
  BrowserCommand, 
  BrowserResult, 
  AccessibilitySnapshot,
  BrowserConfig,
  MCPClientConfig 
} from '../types/mcp.js';

export class BrowserController {
  private mcpClient: MCPClient;
  private currentPage: string | null = null;

  constructor(
    private config: BrowserConfig,
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
    
    // Initialize browser with config
    await this.mcpClient.sendRequest('browser/launch', {
      headless: this.config.headless,
      viewport: this.config.viewport,
      userAgent: this.config.userAgent
    });
  }

  async disconnect(): Promise<void> {
    await this.mcpClient.disconnect();
  }

  async navigate(url: string): Promise<BrowserResult> {
    try {
      const response = await this.mcpClient.sendRequest('page/goto', { url });
      this.currentPage = url;
      
      return {
        success: true,
        data: response.result,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Navigation failed',
        timestamp: Date.now()
      };
    }
  }

  async click(selector: string, options?: { timeout?: number }): Promise<BrowserResult> {
    try {
      const timeout = options?.timeout || this.config.timeout;
      const response = await this.mcpClient.sendRequest('page/click', {
        selector,
        options: { timeout }
      });
      
      return {
        success: true,
        data: response.result,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Click failed',
        timestamp: Date.now()
      };
    }
  }

  async type(selector: string, text: string, options?: { timeout?: number }): Promise<BrowserResult> {
    try {
      const timeout = options?.timeout || this.config.timeout;
      const response = await this.mcpClient.sendRequest('page/fill', {
        selector,
        value: text,
        options: { timeout }
      });
      
      return {
        success: true,
        data: response.result,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Type failed',
        timestamp: Date.now()
      };
    }
  }

  async waitForSelector(selector: string, timeout?: number): Promise<BrowserResult> {
    try {
      const response = await this.mcpClient.sendRequest('page/waitForSelector', {
        selector,
        timeout: timeout || this.config.timeout
      });
      
      return {
        success: true,
        data: response.result,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Wait failed',
        timestamp: Date.now()
      };
    }
  }

  async screenshot(options?: { fullPage?: boolean; path?: string }): Promise<BrowserResult> {
    try {
      const response = await this.mcpClient.sendRequest('page/screenshot', {
        fullPage: options?.fullPage || false,
        path: options?.path
      });
      
      return {
        success: true,
        data: response.result,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Screenshot failed',
        timestamp: Date.now()
      };
    }
  }

  async getAccessibilitySnapshot(): Promise<AccessibilitySnapshot | null> {
    try {
      const response = await this.mcpClient.sendRequest('page/accessibility', {});
      
      if (response.result && typeof response.result === 'object') {
        return {
          ...(response.result as Omit<AccessibilitySnapshot, 'timestamp'>),
          timestamp: Date.now()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get accessibility snapshot:', error);
      return null;
    }
  }

  async executeCommand(command: BrowserCommand): Promise<BrowserResult> {
    switch (command.action) {
      case 'navigate':
        if (!command.url) throw new Error('URL required for navigate action');
        return this.navigate(command.url);
        
      case 'click':
        if (!command.selector) throw new Error('Selector required for click action');
        return this.click(command.selector, command.timeout ? { timeout: command.timeout } : undefined);
        
      case 'type':
        if (!command.selector || !command.value) {
          throw new Error('Selector and value required for type action');
        }
        return this.type(command.selector, command.value, command.timeout ? { timeout: command.timeout } : undefined);
        
      case 'wait':
        if (!command.selector) throw new Error('Selector required for wait action');
        return this.waitForSelector(command.selector, command.timeout);
        
      case 'screenshot':
        return this.screenshot(command.options as { fullPage?: boolean; path?: string });
        
      case 'snapshot':
        const snapshot = await this.getAccessibilitySnapshot();
        if (snapshot === null) {
          return {
            success: false,
            error: 'Failed to get accessibility snapshot',
            timestamp: Date.now()
          };
        }
        return {
          success: true,
          data: snapshot,
          timestamp: Date.now()
        };
        
      default:
        throw new Error(`Unsupported action: ${command.action}`);
    }
  }

  get currentUrl(): string | null {
    return this.currentPage;
  }

  get isConnected(): boolean {
    return this.mcpClient.connected;
  }
}