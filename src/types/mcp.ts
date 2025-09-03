export interface MCPMessage {
  id: string;
  type: 'request' | 'response' | 'notification';
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

export interface MCPRequest extends MCPMessage {
  type: 'request';
  method: string;
  params?: unknown;
}

export interface MCPResponse extends MCPMessage {
  type: 'response';
  result?: unknown;
  error?: MCPError;
}

export interface MCPNotification extends MCPMessage {
  type: 'notification';
  method: string;
  params?: unknown;
}

export interface BrowserCommand {
  action: 'navigate' | 'click' | 'type' | 'wait' | 'screenshot' | 'snapshot';
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
  options?: Record<string, unknown>;
}

export interface BrowserResult {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: number;
}

export interface AccessibilitySnapshot {
  nodes: AccessibilityNode[];
  url: string;
  title: string;
  timestamp: number;
}

export interface AccessibilityNode {
  id: string;
  role: string;
  name?: string;
  value?: string;
  description?: string;
  children?: string[];
  parent?: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  properties?: Record<string, unknown>;
}

export interface MCPClientConfig {
  command: string;
  args: string[];
  timeout: number;
  retries: number;
  retryDelay: number;
}

export interface BrowserConfig {
  headless: boolean;
  viewport: {
    width: number;
    height: number;
  };
  userAgent?: string;
  timeout: number;
}