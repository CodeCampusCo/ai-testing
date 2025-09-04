import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlaywrightMCPClient } from '../../src/mcp/browser.js';
import { MCPClientConfig } from '../../src/types/mcp.js';

// Mock MCPClient
vi.mock('../../src/mcp/client.js', () => ({
  MCPClient: vi.fn().mockImplementation((command: string, args: string[], logger: any) => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    callTool: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'mock response' }] }),
    listTools: vi.fn().mockResolvedValue({ tools: [{ name: 'browser_navigate', description: 'Navigate to URL' }] }),
    isClientConnected: vi.fn().mockReturnValue(false),
    getCommand: vi.fn().mockReturnValue(`${command} ${args.join(' ')}`)
  }))
}));

describe('PlaywrightMCPClient', () => {
  let browser: PlaywrightMCPClient;
  let config: MCPClientConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    config = {
      command: 'npx',
      args: ['@playwright/mcp@latest'],
      timeout: 5000,
      retries: 1,
      retryDelay: 100
    };
    browser = new PlaywrightMCPClient(config);
  });

  afterEach(async () => {
    if (browser.isConnected) {
      await browser.disconnect();
    }
  });

  test('should create playwright MCP client', () => {
    expect(browser).toBeInstanceOf(PlaywrightMCPClient);
    expect(browser.isConnected).toBe(false);
    expect(browser.currentUrl).toBeNull();
  });

  test('should connect and load available tools', async () => {
    await browser.connect();
    expect(browser.getAvailableTools()).toHaveLength(1);
    expect(browser.hasToolAvailable('browser_navigate')).toBe(true);
  });

  test('should handle dynamic tool calls after connection', async () => {
    await browser.connect();
    const result = await browser.callTool('browser_navigate', { url: 'https://example.com' });
    expect(result).toBeDefined();
    expect(browser.currentUrl).toBe('https://example.com');
  });

  test('should handle tool availability checks', async () => {
    await browser.connect();
    expect(browser.getAvailableTools()).toHaveLength(1);
    expect(browser.hasToolAvailable('browser_navigate')).toBe(true);
    expect(browser.getToolDefinition('browser_navigate')).toBeDefined();
  });

  test('should handle snapshot retrieval with mock data', async () => {
    // Mock snapshot response
    const mockSnapshot = {
      content: [{
        type: 'text',
        text: '- textbox "Search" [ref=e10]: '
      }]
    };
    
    await browser.connect();
    (browser as any).mcpClient.callTool.mockResolvedValueOnce(mockSnapshot);
    
    const snapshot = await browser.getSnapshot();
    expect(snapshot.elements).toHaveLength(1);
    expect(snapshot.elements[0].ref).toBe('e10');
    expect(snapshot.elements[0].type).toBe('textbox');
  });

  test('should handle navigation convenience method', async () => {
    await browser.connect();
    const result = await browser.navigate('https://google.com');
    expect(result).toBeDefined();
    expect(browser.currentUrl).toBe('https://google.com');
  });

  test('should handle disconnection properly', async () => {
    await browser.connect();
    // Mock isClientConnected to return false after disconnect
    const mockClient = (browser as any).mcpClient;
    mockClient.isClientConnected.mockReturnValue(false);
    await browser.disconnect();
    expect(browser.isConnected).toBe(false);
  });
});