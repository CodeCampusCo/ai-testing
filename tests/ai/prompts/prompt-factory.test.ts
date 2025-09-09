import { describe, it, expect } from 'vitest';
import {
  buildMCPCommandsPrompt,
  buildParseScenarioPrompt,
  buildBatchVerifyOutcomesPrompt,
  buildAnalysisPrompt,
} from '../../../src/ai/prompts/prompt-factory.js';

describe('Prompt Factory', () => {
  describe('buildMCPCommandsPrompt', () => {
    it('should generate a valid prompt for MCP command generation', () => {
      const { prompt, systemPrompt } = buildMCPCommandsPrompt('Click the login button', {
        url: '/login',
      });
      expect(systemPrompt).toContain('You are an expert E2E testing assistant.');
      expect(prompt).toContain('Test Step: Click the login button');
      expect(prompt).toContain('URL: /login');
    });
  });

  describe('buildParseScenarioPrompt', () => {
    it('should generate a valid prompt for parsing a scenario', () => {
      const markdown = '# My Test\n- Step 1';
      const { prompt, systemPrompt } = buildParseScenarioPrompt(markdown);
      expect(systemPrompt).toContain('You are an expert test analyst.');
      expect(prompt).toContain(markdown);
    });
  });

  describe('buildBatchVerifyOutcomesPrompt', () => {
    it('should generate a valid prompt for batch verifying outcomes', () => {
      const outcomes = ['User is logged in', 'Welcome message is visible'];
      const { prompt, systemPrompt } = buildBatchVerifyOutcomesPrompt(outcomes, {
        elements: [{ type: 'heading', text: 'Welcome' }],
      });
      expect(systemPrompt).toContain('You are an expert web testing assistant.');
      expect(prompt).toContain('1. User is logged in');
      expect(prompt).toContain('2. Welcome message is visible');
      expect(prompt).toContain('heading: "Welcome"');
    });
  });

  describe('buildAnalysisPrompt', () => {
    it('should generate a valid prompt for analysis', () => {
      const analysisInput = 'Test failed: ...';
      const { prompt, systemPrompt } = buildAnalysisPrompt(analysisInput);
      expect(systemPrompt).toContain('You are an expert QA analyst');
      expect(prompt).toContain(analysisInput);
    });
  });
});
