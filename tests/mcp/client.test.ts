import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPClient } from '../../src/mcp/client.js';

// Mock the MCP SDK modules
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    request: vi.fn().mockResolvedValue({ tools: [] }),
    close: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => ({
    onerror: null,
    onclose: null
  })),
  getDefaultEnvironment: vi.fn().mockReturnValue({})
}));

describe('MCPClient', () => {
  let client: MCPClient;
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new MCPClient('echo', ['test'], mockLogger);
  });

  afterEach(async () => {
    if (client.isClientConnected()) {
      await client.disconnect();
    }
  });

  test('should create client with config', () => {
    expect(client).toBeInstanceOf(MCPClient);
    expect(client.isClientConnected()).toBe(false);
  });

  test('should handle callTool when not connected', async () => {
    await expect(client.callTool('test', {})).rejects.toThrow(
      'Client not connected. Call connect() first.'
    );
  });

  test('should handle listTools when not connected', async () => {
    await expect(client.listTools()).rejects.toThrow(
      'Client not connected. Call connect() first.'
    );
  });

  test('should handle disconnect when not connected', async () => {
    await expect(client.disconnect()).resolves.toBeUndefined();
  });

  test('should handle connection properties', () => {
    expect(client.isClientConnected()).toBe(false);
    expect(typeof client.isClientConnected()).toBe('boolean');
    expect(client.getCommand()).toBe('echo test');
  });

  test('should connect successfully with mocked client', async () => {
    await expect(client.connect()).resolves.toBeUndefined();
    expect(client.isClientConnected()).toBe(true);
  });

  test('should call tools after connection', async () => {
    await client.connect();
    const result = await client.callTool('test_tool', { param: 'value' });
    expect(result).toBeDefined();
  });
});