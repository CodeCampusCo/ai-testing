import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { 
  MCPToolCallResult,
  MCPClientConfig 
} from '../types/mcp.js';

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;

  constructor(private config: MCPClientConfig) {
    // No need for EventEmitter inheritance
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      console.log(`Connecting to MCP server: ${this.config.command} ${this.config.args.join(' ')}`);

      // Create STDIO transport
      this.transport = new StdioClientTransport({
        command: this.config.command,
        args: this.config.args,
        env: {
          ...getDefaultEnvironment(),
        },
        stderr: 'pipe',
      });

      // Set up error handlers
      this.transport.onerror = async (error: any) => {
        console.error(`Transport error: ${error}`);
        this.isConnected = false;
      };

      this.transport.onclose = async () => {
        console.log('Transport connection closed');
        this.isConnected = false;
      };

      // Create MCP client
      this.client = new Client(
        {
          name: 'AI-Testing-Framework-Client',
          version: '1.0.0',
        },
        {
          capabilities: {
            roots: {},
            sampling: {},
            elicitation: {},
          },
        }
      );

      // Connect to the transport
      await this.client.connect(this.transport);
      this.isConnected = true;
      console.log('Successfully connected to MCP server');
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        console.log('Disconnecting from MCP server...');
        await this.client.close();
        this.isConnected = false;
        this.client = null;
        this.transport = null;
        console.log('Disconnected from MCP server');
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
      throw error;
    }
  }

  async listTools(): Promise<MCPToolCallResult> {
    if (!this.client || !this.isConnected) {
      throw new Error('Client not connected. Call connect() first.');
    }

    try {
      console.log('Listing available tools...');
      const response = await this.client.request(
        { method: 'tools/list', params: undefined },
        ListToolsResultSchema
      );
      console.log(`Found ${(response as any).tools?.length || 0} tools`);
      return response as MCPToolCallResult;
    } catch (error) {
      console.error('Failed to list tools:', error);
      throw error;
    }
  }

  async callTool(
    name: string,
    arguments_: Record<string, unknown> = {}
  ): Promise<MCPToolCallResult> {
    if (!this.client || !this.isConnected) {
      throw new Error('Client not connected. Call connect() first.');
    }

    try {
      console.log(`Calling tool: ${name} with arguments:`, arguments_);
      const response = await this.client.request(
        {
          method: 'tools/call',
          params: {
            name,
            arguments: arguments_,
          },
        },
        CallToolResultSchema,
        {
          timeout: this.config.timeout,
        }
      );
      return response as MCPToolCallResult;
    } catch (error) {
      console.error(`Failed to call tool '${name}':`, error);
      throw error;
    }
  }

  // Utility methods
  isClientConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  getCommand(): string {
    return `${this.config.command} ${this.config.args.join(' ')}`;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}