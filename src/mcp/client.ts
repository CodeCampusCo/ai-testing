import { spawn, ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { 
  MCPMessage, 
  MCPRequest, 
  MCPResponse, 
  MCPClientConfig 
} from '../types/mcp.js';

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private isConnected = false;
  private messageId = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: MCPResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(private config: MCPClientConfig) {
    super();
    this.setupErrorHandling();
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.config.command, this.config.args, {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process.stdout?.on('data', (data) => {
          this.handleMessage(data.toString());
        });

        this.process.stderr?.on('data', (data) => {
          console.error('MCP Server Error:', data.toString());
          this.emit('error', new Error(`MCP Server Error: ${data.toString()}`));
        });

        this.process.on('exit', (code) => {
          this.isConnected = false;
          this.emit('disconnect', code);
        });

        this.process.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

        // Wait for connection establishment
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.isConnected = true;
            this.emit('connect');
            resolve();
          } else {
            reject(new Error('Failed to start MCP server'));
          }
        }, 1000);

      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.process) {
      return;
    }

    // Clear pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();

    return new Promise((resolve) => {
      if (this.process) {
        this.process.on('exit', () => {
          this.isConnected = false;
          this.process = null;
          this.emit('disconnect');
          resolve();
        });

        this.process.kill('SIGTERM');
      } else {
        resolve();
      }
    });
  }

  async sendRequest(method: string, params?: unknown): Promise<MCPResponse> {
    if (!this.isConnected || !this.process) {
      throw new Error('MCP client not connected');
    }

    const id = (++this.messageId).toString();
    const request: MCPRequest = {
      id,
      type: 'request',
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.config.timeout);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const message = JSON.stringify(request) + '\n';
      this.process!.stdin?.write(message);
    });
  }

  private handleMessage(data: string): void {
    const lines = data.trim().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const message: MCPMessage = JSON.parse(line);
        
        if (message.type === 'response') {
          this.handleResponse(message as MCPResponse);
        } else if (message.type === 'notification') {
          this.emit('notification', message);
        }
      } catch (error) {
        console.error('Failed to parse MCP message:', error);
        this.emit('error', new Error(`Invalid JSON: ${line}`));
      }
    }
  }

  private handleResponse(response: MCPResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      console.warn('Received response for unknown request:', response.id);
      return;
    }

    this.pendingRequests.delete(response.id);
    clearTimeout(pending.timeout);

    if (response.error) {
      pending.reject(new Error(response.error.message));
    } else {
      pending.resolve(response);
    }
  }

  private setupErrorHandling(): void {
    this.on('error', (error) => {
      console.error('MCP Client Error:', error);
    });

    process.on('exit', () => {
      this.disconnect().catch(console.error);
    });

    process.on('SIGINT', () => {
      this.disconnect().then(() => process.exit(0));
    });

    process.on('SIGTERM', () => {
      this.disconnect().then(() => process.exit(0));
    });
  }

  get connected(): boolean {
    return this.isConnected;
  }
}