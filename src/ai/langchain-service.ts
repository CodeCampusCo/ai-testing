import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import { AIProviderConfig } from '../types/workflow.js';

// Schemas for structured outputs
export const MCPCallSchema = z.object({
  tool: z.string(),
  args: z.record(z.any()),
});

export const MCPCallsSchema = z.array(MCPCallSchema);

export const VerificationResultSchema = z.object({
  result: z.boolean(),
  reasoning: z.string().optional(),
});

// LangChain-based AI Service
export class LangChainAIService {
  private model: any;
  private logger: any;

  constructor(
    private config: AIProviderConfig,
    logger: {
      debug: (msg: string, ...args: any[]) => void;
      info: (msg: string, ...args: any[]) => void;
      warn: (msg: string, ...args: any[]) => void;
      error: (msg: string, ...args: any[]) => void;
    }
  ) {
    this.logger = logger;
  }

  async initialize() {
    if (this.model) return; // Already initialized
    this.logger.debug(`Initializing AI model for provider: ${this.config.provider}`);
    try {
      switch (this.config.provider) {
        case 'openai':
          const { ChatOpenAI } = await import('@langchain/openai');
          this.model = new ChatOpenAI({
            apiKey: this.config.apiKey,
            model: this.config.model || 'gpt-4',
            temperature: this.config.temperature || 0.1,
            maxTokens: this.config.maxTokens || 2000,
          });
          break;
        case 'anthropic':
          const { ChatAnthropic } = await import('@langchain/anthropic');
          this.model = new ChatAnthropic({
            apiKey: this.config.apiKey,
            model: this.config.model || 'claude-3-sonnet-20240229',
            temperature: this.config.temperature || 0.1,
            maxTokens: this.config.maxTokens || 2000,
          });
          break;
        case 'google':
          const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
          this.model = new ChatGoogleGenerativeAI({
            apiKey: this.config.apiKey,
            model: this.config.model || 'gemini-pro',
            temperature: this.config.temperature || 0.1,
            // Note: Google doesn't have maxTokens in the same way, using maxOutputTokens
            maxOutputTokens: this.config.maxTokens || 2000,
          });
          break;
        default:
          throw new Error(`Unsupported AI provider: ${this.config.provider}`);
      }
    } catch (error) {
      this.logger.error(`Failed to initialize AI model: ${error}`);
      throw error;
    }
  }

  // [Refactored for Testability]
  // Generate MCP commands from test step
  async generateMCPCommands(
    step: string,
    context: any
  ): Promise<Array<{ tool: string; args: any }>> {
    const { prompt, systemPrompt } = this.buildMCPCommandsPrompt(step, context);
    try {
      this.logger.debug(`LangChain: Generating MCP commands for step: ${step}`);
      const response = await this.process(prompt, systemPrompt);
      const parsed = JSON.parse(response);
      return MCPCallsSchema.parse(parsed);
    } catch (error) {
      this.logger.error(`LangChain MCP generation failed: ${error}`);
      throw new Error(`Failed to generate MCP commands: ${error}`);
    }
  }

  // [Refactored for Testability]
  // Verify test outcome using natural language understanding
  async verifyOutcome(outcome: string, pageState: any): Promise<boolean> {
    const { prompt, systemPrompt } = this.buildVerifyOutcomePrompt(outcome, pageState);
    try {
      this.logger.debug(`LangChain: Verifying outcome: ${outcome}`);
      const response = await this.process(prompt, systemPrompt);
      const parsed = JSON.parse(response);
      const verification = VerificationResultSchema.parse(parsed);
      this.logger.debug(
        `LangChain: Verification result: ${verification.result}. Reasoning: ${verification.reasoning}`
      );
      return verification.result;
    } catch (error) {
      this.logger.error(`LangChain verification failed: ${error}`);
      return false;
    }
  }

  // [New Public Method for Testability]
  buildMCPCommandsPrompt(step: string, context: any) {
    const systemPrompt = `You are an expert E2E testing assistant. Convert the following test step into MCP tool calls.

Guidelines:
- Convert the step into one or more specific, actionable MCP tool calls.
- Use the "ref" from the page elements for actions like click and type.
- **CRITICAL RULE:** After any 'browser_navigate' call or a 'browser_click' call that likely causes a page transition (e.g., clicking 'Login', 'Submit', or a major link), you MUST follow it with a 'browser_wait_for' call.
- Intelligently decide what to wait for. Look at the user's instruction to predict what should appear next. For example, if the step is "Click 'Sign in' button", the subsequent wait should be for an element on the dashboard, like "Welcome" text or a "Logout" button.
- If the user step is just "Wait for URL to be /", you should use the 'browser_wait_for' tool and wait for a piece of text you expect to see on the home page.

Respond with a JSON array of tool calls in this format:
[{ "tool": "tool_name", "args": { "param": "value" } }]`;

    const prompt = `Test Step: ${step}

Current Page Context:
- URL: ${context.url || 'unknown'}
- Elements: ${
      context.elements
        ? context.elements
            .slice(0, 10)
            .map((el: any) => `${el.type}: "${el.name || el.text}"`)
            .join(', ')
        : 'none'
    }

Available MCP Tools: ${
      context.availableTools || 'browser_navigate, browser_type, browser_click, browser_snapshot'
    }`;

    return { prompt, systemPrompt };
  }

  // [New Public Method for Testability]
  buildVerifyOutcomePrompt(outcome: string, pageState: any) {
    const systemPrompt = `You are an expert web testing assistant. Your task is to analyze a simplified representation of a web page's state (provided as a list of elements) and determine if an expected outcome has been met.

Based *only* on the provided Page Elements, would you conclude that the Expected Outcome is true?

Provide your answer in a JSON format with two keys: "result" (a boolean true or false) and "reasoning" (a brief explanation of your decision).`;

    const prompt = `Expected Outcome: ${outcome}

Current Page Elements:
${
  pageState.elements && pageState.elements.length > 0
    ? pageState.elements.map((el: any) => `${el.type}: "${el.name || el.text}"`).join('\n')
    : 'none'
}`;
    return { prompt, systemPrompt };
  }

  // Generic AI processing for backward compatibility
  async process(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const messages: BaseMessage[] = [];

      if (systemPrompt) {
        messages.push(new SystemMessage(systemPrompt));
      }
      messages.push(new HumanMessage(prompt));

      const result = await this.model.invoke(messages);
      return result.content;
    } catch (error) {
      this.logger.error(`LangChain processing failed: ${error}`);
      throw error;
    }
  }
}
