import { BaseAgent } from './base.js';
import { TestScenario } from '../types/workflow.js';
import { LangChainAIService } from '../ai/langchain-service.js';

export class ParsingAgent implements BaseAgent<string, TestScenario> {
  name = 'ParsingAgent';
  description = 'Parses a markdown string into a structured TestScenario using AI.';

  constructor(
    private aiService: LangChainAIService,
    private logger: {
      debug: (msg: string, ...args: any[]) => void;
      info: (msg: string, ...args: any[]) => void;
      warn: (msg: string, ...args: any[]) => void;
      error: (msg: string, ...args: any[]) => void;
    }
  ) {}

  async process(input: string): Promise<TestScenario> {
    this.logger.info('Parsing test scenario using AI...');
    const parsedData = await this.aiService.parseScenario(input);

    if (!parsedData.rawSteps || parsedData.rawSteps.length === 0) {
      throw new Error(
        'The test scenario must contain at least one test step. AI failed to identify steps.'
      );
    }

    const scenario: TestScenario = {
      id: `test-${Date.now()}`,
      description: parsedData.description,
      steps: [], // Steps will be processed during execution, not parsing
      expectedOutcomes: [], // Outcomes will be processed during execution
      rawSteps: parsedData.rawSteps,
      rawOutcomes: parsedData.rawOutcomes,
      metadata: {
        priority: 'medium',
        source: 'file',
      },
    };

    this.logger.info(`Successfully parsed scenario: "${scenario.description}"`);
    return scenario;
  }
}
