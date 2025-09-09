import { AIAgent, AgentError } from './base.js';
import { TestScenario, TestStep, ExpectedOutcome } from '../types/workflow.js';
import { LangChainAIService } from '../ai/langchain-service.js';

interface ScenarioGeneratorInput {
  description: string;
  url?: string;
  userStory?: string;
  acceptanceCriteria?: string[];
}

export class ScenarioGeneratorAgent extends AIAgent<ScenarioGeneratorInput, TestScenario> {
  name = 'ScenarioGenerator';
  description = 'Converts natural language descriptions into structured test scenarios';

  constructor(aiService: LangChainAIService, logger: any) {
    super(aiService, logger);
  }

  async process(input: ScenarioGeneratorInput): Promise<TestScenario> {
    this.logger.info(`Generating test scenario from: ${input.description}`);

    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(input);

      const response = await this.callAI(userPrompt, systemPrompt);
      const parsedScenario = this.parseJSON<any>(response);

      const scenario = this.validateAndNormalize(parsedScenario, input);

      this.logger.info(`Generated scenario "${scenario.id}" with ${scenario.steps.length} steps`);
      return scenario;
    } catch (error) {
      throw new AgentError(
        `Failed to generate test scenario: ${error instanceof Error ? error.message : error}`,
        this.name,
        error instanceof Error ? error : undefined
      );
    }
  }

  private buildSystemPrompt(): string {
    return `You are an expert QA engineer specializing in web application testing. Your task is to convert natural language test descriptions into structured, actionable test scenarios.

IMPORTANT: You must return ONLY valid JSON with this exact structure:

{
  "id": "unique-test-id",
  "description": "Clear test description",
  "steps": [
    {
      "id": "step-1",
      "action": "navigate|click|type|wait|verify|screenshot",
      "target": "CSS selector, text content, or element reference",
      "value": "text to type or expected value",
      "description": "Human-readable step description",
      "timeout": 5000
    }
  ],
  "expectedOutcomes": [
    {
      "id": "outcome-1",
      "type": "element_exists|text_contains|url_matches|page_title|custom",
      "target": "selector or element to check",
      "value": "expected value",
      "description": "What should happen"
    }
  ],
  "metadata": {
    "priority": "low|medium|high",
    "tags": ["tag1", "tag2"],
    "estimatedDuration": 30000
  }
}

Guidelines:
- Use accessibility-first selectors (ARIA labels, roles, semantic elements)
- Prefer text content matching over CSS selectors
- Include wait steps for dynamic content
- Add screenshots at key moments
- Be specific about expected outcomes
- Consider edge cases and error states
- Estimate realistic timeouts

Available actions:
- navigate: Go to a URL
- click: Click on element (button, link, etc.)
- type: Enter text into input fields
- wait: Wait for element or condition
- verify: Check element exists or has content
- screenshot: Capture page state`;
  }

  private buildUserPrompt(input: ScenarioGeneratorInput): string {
    let prompt = `Generate a comprehensive test scenario for:\n\n`;
    prompt += `Description: ${input.description}\n`;

    if (input.url) {
      prompt += `Target URL: ${input.url}\n`;
    }

    if (input.userStory) {
      prompt += `User Story: ${input.userStory}\n`;
    }

    if (input.acceptanceCriteria && input.acceptanceCriteria.length > 0) {
      prompt += `Acceptance Criteria:\n`;
      input.acceptanceCriteria.forEach((criteria, index) => {
        prompt += `${index + 1}. ${criteria}\n`;
      });
    }

    prompt += `\nCreate detailed test steps that cover the main flow and important edge cases. Focus on accessibility and user experience.`;

    return prompt;
  }

  private validateAndNormalize(parsed: any, input: ScenarioGeneratorInput): TestScenario {
    // Validate required fields
    if (!parsed.id) {
      parsed.id = this.generateTestId(input.description);
    }

    if (!parsed.description) {
      parsed.description = input.description;
    }

    if (!Array.isArray(parsed.steps)) {
      throw new Error('Steps must be an array');
    }

    if (!Array.isArray(parsed.expectedOutcomes)) {
      parsed.expectedOutcomes = [];
    }

    // Validate and normalize steps
    parsed.steps = parsed.steps.map((step: any, index: number) => ({
      id: step.id || `step-${index + 1}`,
      action: this.validateAction(step.action),
      target: step.target || '',
      value: step.value || '',
      description: step.description || `Step ${index + 1}`,
      timeout: typeof step.timeout === 'number' ? step.timeout : 5000,
    }));

    // Validate and normalize expected outcomes
    parsed.expectedOutcomes = parsed.expectedOutcomes.map((outcome: any, index: number) => ({
      id: outcome.id || `outcome-${index + 1}`,
      type: this.validateOutcomeType(outcome.type),
      target: outcome.target || '',
      value: outcome.value || '',
      description: outcome.description || `Expected outcome ${index + 1}`,
    }));

    // Normalize metadata
    if (!parsed.metadata) {
      parsed.metadata = {};
    }
    parsed.metadata = {
      priority: parsed.metadata.priority || 'medium',
      tags: Array.isArray(parsed.metadata.tags) ? parsed.metadata.tags : [],
      estimatedDuration:
        typeof parsed.metadata.estimatedDuration === 'number'
          ? parsed.metadata.estimatedDuration
          : parsed.steps.length * 5000,
    };

    return parsed as TestScenario;
  }

  private validateAction(action: string): TestStep['action'] {
    const validActions: TestStep['action'][] = [
      'navigate',
      'click',
      'type',
      'wait',
      'verify',
      'screenshot',
    ];
    if (validActions.includes(action as TestStep['action'])) {
      return action as TestStep['action'];
    }
    throw new Error(`Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`);
  }

  private validateOutcomeType(type: string): ExpectedOutcome['type'] {
    const validTypes: ExpectedOutcome['type'][] = [
      'element_exists',
      'text_contains',
      'url_matches',
      'page_title',
      'custom',
    ];
    if (validTypes.includes(type as ExpectedOutcome['type'])) {
      return type as ExpectedOutcome['type'];
    }
    throw new Error(`Invalid outcome type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  private generateTestId(description: string): string {
    return (
      description
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50) +
      '-' +
      Date.now().toString(36)
    );
  }
}
