import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPClient } from '../../src/mcp/client.js';
import { MCPClientConfig } from '../../src/types/mcp.js';

describe('MCPClient', () => {
  let client: MCPClient;
  let config: MCPClientConfig;

  beforeEach(() => {
    config = {
      command: 'echo',
      args: ['test'],
      timeout: 5000,
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

  test('should handle callTool when not connected', async () => {
    try {
      await client.callTool('test', {});
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Client not connected. Call connect() first.');
    }
  });

  test('should handle listTools when not connected', async () => {
    try {
      await client.listTools();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Client not connected. Call connect() first.');
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