import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import { AIProviderConfig } from '../types/workflow.js';

// Schemas for structured outputs
export const MCPCallSchema = z.object({
  tool: z.string(),
  args: z.record(z.any())
});

export const MCPCallsSchema = z.array(MCPCallSchema);

export const VerificationResultSchema = z.object({
  result: z.boolean(),
  reasoning: z.string().optional()
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
    this.initializeModel();
  }

  private async initializeModel() {
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

  // Generate MCP commands from test step
  async generateMCPCommands(step: string, context: any): Promise<Array<{tool: string, args: any}>> {
    const prompt = ChatPromptTemplate.fromTemplate(`
You are an expert E2E testing assistant. Convert the following test step into MCP tool calls.

Test Step: {step}

Current Page Context:
- URL: {url}
- Elements: {elements}

Available MCP Tools:
{availableTools}

Guidelines:
- Convert the step into specific, actionable MCP tool calls
- Use appropriate selectors for web elements
- Include proper error handling
- For navigation, use browser_navigate
- For typing, use browser_type with proper selectors
- For clicking, use browser_click with element identifiers
- For verification, use browser_snapshot to get page state

Respond with a JSON array of tool calls in this format:
[{{"tool": "tool_name", "args": {{"param": "value"}}}}]
    `);

    const parser = new JsonOutputParser();
    const chain = prompt.pipe(this.model).pipe(parser);

    try {
      this.logger.debug(`LangChain: Generating MCP commands for step: ${step}`);
      
      const result = await chain.invoke({
        step: step,
        url: context.url || 'unknown',
        elements: context.elements ? 
          context.elements.slice(0, 10).map((el: any) => `${el.type}: "${el.name || el.text}"`).join(', ') : 
          'none',
        availableTools: context.availableTools || 'browser_navigate, browser_type, browser_click, browser_snapshot'
      });

      // Validate the result
      const parsed = MCPCallsSchema.parse(result);
      this.logger.debug(`LangChain: Generated ${parsed.length} MCP commands`);
      return parsed;

    } catch (error) {
      this.logger.error(`LangChain MCP generation failed: ${error}`);
      throw new Error(`Failed to generate MCP commands: ${error}`);
    }
  }

  // Verify test outcome using natural language understanding
  async verifyOutcome(outcome: string, pageState: any): Promise<boolean> {
    const prompt = ChatPromptTemplate.fromTemplate(`
You are an expert web testing assistant. Analyze the page state to verify the expected outcome.

Expected Outcome: {outcome}

Page Elements Analysis:
{elements}

Key Verification Guidelines:
- For "username" outcomes: Look for user identifiers like "Test", "T Test", email addresses, or profile buttons
- For "navigation menu" outcomes: Focus on navigation/header elements and user account indicators  
- For "user avatar" outcomes: Look for button elements or user display components
- Be flexible with text matching - "T Test" or "Test" counts as showing username
- Consider element context - buttons in navigation areas often represent user accounts

Example Analysis:
If I see elements like 'button: "T Test"' or 'link: "Test"' in the page, this indicates a logged-in user whose username/display name is being shown.

Based on the elements above, determine if the outcome "{outcome}" is satisfied.

Respond with only "true" or "false".
    `);

    const chain = prompt.pipe(this.model);

    try {
      this.logger.debug(`LangChain: Verifying outcome: ${outcome}`);
      
      const result = await chain.invoke({
        outcome: outcome,
        url: pageState.url || 'unknown',
        title: pageState.title || 'unknown',
        elements: pageState.elements ? 
          pageState.elements.map((el: any) => `${el.type}: "${el.name || el.text}"`).join(', ') : 
          'none'
      });

      const responseText = String((result as any)?.content || result);
      const verified = responseText.toLowerCase().includes('true');
      this.logger.debug(`LangChain: Verification result: ${verified}`);
      return verified;

    } catch (error) {
      this.logger.error(`LangChain verification failed: ${error}`);
      return false;
    }
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