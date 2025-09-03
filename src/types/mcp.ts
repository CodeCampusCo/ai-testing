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

// Playwright MCP Tool Names
export type PlaywrightTool = 
  | 'playwright_goto'
  | 'playwright_click'
  | 'playwright_type'
  | 'playwright_scroll'
  | 'playwright_screenshot'
  | 'playwright_snapshot'
  | 'playwright_wait_for_element'
  | 'playwright_wait_for_text'
  | 'playwright_get_text'
  | 'playwright_get_attribute';

// Tool call parameters for different Playwright tools
export interface PlaywrightToolParams {
  playwright_goto: { url: string };
  playwright_click: { selector?: string; ref?: string };
  playwright_type: { selector?: string; ref?: string; text: string };
  playwright_scroll: { direction?: 'up' | 'down'; amount?: number };
  playwright_screenshot: { fullPage?: boolean };
  playwright_snapshot: {};
  playwright_wait_for_element: { selector?: string; ref?: string; timeout?: number };
  playwright_wait_for_text: { text: string; timeout?: number };
  playwright_get_text: { selector?: string; ref?: string };
  playwright_get_attribute: { selector?: string; ref?: string; attribute: string };
}

// MCP Client Configuration
export interface MCPClientConfig {
  command: string;
  args: string[];
  timeout: number;
  retries: number;
  retryDelay: number;
}

// Browser Configuration
export interface BrowserConfig {
  headless: boolean;
  viewport: {
    width: number;
    height: number;
  };
  userAgent?: string;
  timeout: number;
}