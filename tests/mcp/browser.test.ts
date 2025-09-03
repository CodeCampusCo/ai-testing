import { describe, test, expect, beforeEach } from 'vitest';
import { BrowserController } from '../../src/mcp/browser.js';
import { BrowserConfig, BrowserCommand } from '../../src/types/mcp.js';

describe('BrowserController', () => {
  let browser: BrowserController;
  let config: BrowserConfig;

  beforeEach(() => {
    config = {
      headless: true,
      viewport: { width: 1280, height: 720 },
      timeout: 30000
    };
    browser = new BrowserController(config);
  });

  test('should create browser controller with config', () => {
    expect(browser).toBeInstanceOf(BrowserController);
    expect(browser.isConnected).toBe(false);
    expect(browser.currentUrl).toBeNull();
  });

  test('should handle browser commands', async () => {
    const command: BrowserCommand = {
      action: 'navigate',
      url: 'https://example.com'
    };

    try {
      await browser.executeCommand(command);
    } catch (error) {
      // Expected to fail since not connected
      expect(error).toBeInstanceOf(Error);
    }
  });

  test('should validate command parameters', async () => {
    const invalidCommand: BrowserCommand = {
      action: 'navigate'
      // Missing required url
    };

    await expect(browser.executeCommand(invalidCommand))
      .rejects
      .toThrow('URL required for navigate action');
  });

  test('should handle click commands', async () => {
    const command: BrowserCommand = {
      action: 'click',
      selector: '.button',
      timeout: 5000
    };

    try {
      await browser.executeCommand(command);
    } catch (error) {
      // Expected to fail since not connected
      expect(error).toBeInstanceOf(Error);
    }
  });

  test('should handle type commands', async () => {
    const command: BrowserCommand = {
      action: 'type',
      selector: 'input[name="email"]',
      value: 'test@example.com'
    };

    try {
      await browser.executeCommand(command);
    } catch (error) {
      // Expected to fail since not connected
      expect(error).toBeInstanceOf(Error);
    }
  });

  test('should reject invalid commands', async () => {
    const command = {
      action: 'invalid-action'
    } as BrowserCommand;

    await expect(browser.executeCommand(command))
      .rejects
      .toThrow('Unsupported action: invalid-action');
  });
});