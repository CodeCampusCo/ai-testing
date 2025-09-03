import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { MCPClient } from '../../src/mcp/client.js';
import { MCPClientConfig } from '../../src/types/mcp.js';

describe('MCPClient', () => {
  let client: MCPClient;
  let config: MCPClientConfig;

  beforeEach(() => {
    config = {
      command: 'node',
      args: ['-e', 'process.exit(0)'],
      timeout: 1000,
      retries: 1,
      retryDelay: 100
    };
    client = new MCPClient(config);
  });

  afterEach(async () => {
    if (client.connected) {
      await client.disconnect();
    }
  });

  test('should create client with config', () => {
    expect(client).toBeInstanceOf(MCPClient);
    expect(client.connected).toBe(false);
  });

  test('should handle sendRequest when not connected', async () => {
    try {
      await client.sendRequest('test', {});
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('MCP client not connected');
    }
  });

  test('should handle disconnect when not connected', async () => {
    // Should not throw error
    await expect(client.disconnect()).resolves.toBeUndefined();
  });

  test('should handle connection properties', () => {
    expect(client.connected).toBe(false);
    expect(typeof client.connected).toBe('boolean');
  });
});