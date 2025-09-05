import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MCPToolCallResult } from '../types/mcp.js';

interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;
  private command: string;
  private args: string[];
  private logger: Logger;

  constructor(command: string, args: string[], logger: Logger) {
    this.command = command;
    this.args = args;
    this.logger = logger;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      this.logger.info(`Connecting to MCP server: ${this.command} ${this.args.join(' ')}`);

      // Create STDIO transport
      this.transport = new StdioClientTransport({
        command: this.command,
        args: this.args,
        env: {
          ...getDefaultEnvironment(),
        },
        stderr: 'pipe',
      });

      // Set up error handlers
      this.transport.onerror = async (error: any) => {
        this.logger.error(`Transport error: ${error}`);
        this.isConnected = false;
      };

      this.transport.onclose = async () => {
        this.logger.info('Transport connection closed');
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
      this.logger.info('Successfully connected to MCP server');
    } catch (error) {
      this.logger.error('Failed to connect to MCP server:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        this.logger.info('Disconnecting from MCP server...');
        await this.client.close();
        this.isConnected = false;
        this.client = null;
        this.transport = null;
        this.logger.info('Disconnected from MCP server');
      }
    } catch (error) {
      this.logger.error('Error during disconnect:', error);
      throw error;
    }
  }

  async listTools(): Promise<MCPToolCallResult> {
    if (!this.client || !this.isConnected) {
      throw new Error('Client not connected. Call connect() first.');
    }

    try {
      this.logger.debug('Listing available tools...');
      const response = await this.client.request(
        { method: 'tools/list', params: undefined },
        ListToolsResultSchema
      );
      this.logger.debug(`Found ${(response as any).tools?.length || 0} tools`);
      return response as MCPToolCallResult;
    } catch (error) {
      this.logger.error('Failed to list tools:', error);
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
      this.logger.debug(`Calling tool: ${name} with arguments:`, arguments_);
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
          timeout: 30000,
        }
      );
      return response as MCPToolCallResult;
    } catch (error) {
      this.logger.error(`Failed to call tool '${name}':`, error);
      throw error;
    }
  }

  // Utility methods
  isClientConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  getCommand(): string {
    return `${this.command} ${this.args.join(' ')}`;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}