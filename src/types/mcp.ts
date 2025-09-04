// MCP Tool Call Result from SDK
export interface MCPToolCallResult {
  content?: Array<{
    type: string;
    text?: string;
  }>;
  isError?: boolean;
}

// Element Information from MCP Snapshot
export interface ElementInfo {
  ref: string;
  type: string;
  role?: string;
  name?: string;
  text?: string;
  url?: string;
  disabled?: boolean;
  active?: boolean;
  cursor?: string;
}

// MCP Snapshot Result
export interface SnapshotResult {
  elements: ElementInfo[];
  rawYaml: string;
}

// Browser Action Result
export interface ActionResult {
  success: boolean;
  error?: string;
  url?: string;
  text?: string;
}


// MCP Client Configuration
export interface MCPClientConfig {
  command: string;
  args: string[];
  timeout: number;
  retries: number;
  retryDelay: number;
}

