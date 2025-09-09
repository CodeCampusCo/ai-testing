import { BaseAgent } from './base.js';
import { TestScenario, TestResult, StepResult, AIProviderConfig } from '../types/workflow.js';
import { PlaywrightMCPClient } from '../mcp/browser.js';
import { MCPClientConfig } from '../types/mcp.js';
import { LangChainAIService } from '../ai/langchain-service.js';
import { StepProgressManager } from '../ui/step-progress.js';
import { promises as fs } from 'fs';
import { resolve, join } from 'path';

export class TestExecutorAgent implements BaseAgent<TestScenario, TestResult> {
  name = 'TestExecutor';
  description = 'Executes test scenarios using a pure AI-driven approach for each step';

  private browser: PlaywrightMCPClient;

  constructor(
    private mcpConfig: MCPClientConfig,
    private aiService: LangChainAIService,
    private logger: {
      debug: (msg: string, ...args: any[]) => void;
      info: (msg: string, ...args: any[]) => void;
      warn: (msg: string, ...args: any[]) => void;
      error: (msg: string, ...args: any[]) => void;
    },
    private progressManager?: StepProgressManager
  ) {
    this.browser = new PlaywrightMCPClient(mcpConfig, logger);
  }

  async process(input: TestScenario): Promise<TestResult> {
    const startTime = new Date();
    this.logger.info(`Executing test scenario: ${input.id}`);

    const result: TestResult = {
      scenarioId: input.id,
      status: 'passed',
      startTime,
      endTime: startTime,
      duration: 0,
      steps: [],
      screenshots: [],
    };

    try {
      await this.browser.connect();
      this.logger.debug('Browser connected successfully');

      if (this.mcpConfig.cleanState !== false) {
        await this.browser.clearBrowserState();
        this.logger.debug('Browser state cleared for clean test execution');
      }

      // The new, purely AI-driven execution loop
      await this.executeStepsWithAI(input.rawSteps || [], result);

      if (result.status === 'passed' && input.rawOutcomes && input.rawOutcomes.length > 0) {
        await this.verifyOutcomesWithAI(input.rawOutcomes, result);
      }
    } catch (error) {
      this.logger.error(`Test execution failed: ${error}`);
      result.status = 'error';
      result.error = error instanceof Error ? error.message : String(error);
    } finally {
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();

      try {
        const finalScreenshot = await this.takeScreenshot('final-state');
        if (finalScreenshot) result.screenshots.push(finalScreenshot);
        this.logger.info(`Final screenshot captured: ${finalScreenshot}`);
      } catch (screenshotError) {
        this.logger.warn(`Failed to capture final screenshot: ${screenshotError}`);
      }

      await this.browser.disconnect();
      this.logger.debug('Browser disconnected');
      this.progressManager?.finish();
    }

    this.logger.info(`Test ${input.id} completed: ${result.status} (${result.duration}ms)`);
    return result;
  }

  private async executeStepsWithAI(rawSteps: string[], result: TestResult): Promise<void> {
    this.logger.info(`Executing ${rawSteps.length} raw steps with AI guidance`);

    for (let i = 0; i < rawSteps.length; i++) {
      const stepDescription = rawSteps[i];
      if (!stepDescription) continue;

      const stepStart = Date.now();
      this.progressManager?.startStep(stepDescription);

      const stepResult: StepResult = {
        stepId: `step-${i + 1}`,
        status: 'passed',
        duration: 0,
        description: stepDescription,
      };

      try {
        const snapshot = await this.browser.getSnapshot();
        const mcpCalls = await this.aiService.generateMCPCommands(stepDescription, snapshot);

        for (const call of mcpCalls) {
          await this.browser.callTool(call.tool, call.args);
        }

        const stepDuration = Date.now() - stepStart;
        this.progressManager?.succeedStep(stepDuration);
        stepResult.duration = stepDuration;
        result.steps.push(stepResult);
      } catch (error) {
        const stepDuration = Date.now() - stepStart;
        stepResult.status = 'failed';
        stepResult.error = error instanceof Error ? error.message : String(error);
        stepResult.duration = stepDuration;
        result.steps.push(stepResult);
        result.status = 'failed';

        this.logger.error(`Step ${i + 1} failed: ${stepResult.error}`);
        this.progressManager?.failStep(stepResult.error, stepDuration);

        try {
          const screenshot = await this.takeScreenshot(`failed-step-${i + 1}`);
          if (screenshot) {
            stepResult.screenshot = screenshot;
            result.screenshots.push(screenshot);
          }
        } catch (screenshotError) {
          this.logger.error(`Failed to capture screenshot on failure: ${screenshotError}`);
        }
        break; // Stop execution on first failure
      }
    }
  }

  private async verifyOutcomesWithAI(rawOutcomes: string[], result: TestResult): Promise<void> {
    this.logger.debug('Waiting for network idle before outcome verification...');
    try {
      // This tool does not exist, but we keep the logic in case it's added.
      // A better approach is handled by the AI prompt generating wait commands.
      // await this.browser.callTool('browser_wait_for_load_state', { state: 'networkidle' });
    } catch (error) {
      this.logger.debug('browser_wait_for_load_state not available, using short delay.');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    for (let i = 0; i < rawOutcomes.length; i++) {
      const outcome = rawOutcomes[i];
      if (!outcome) continue;

      try {
        const snapshot = await this.browser.getSnapshot();
        const verified = await this.aiService.verifyOutcome(outcome, snapshot);

        if (!verified) {
          result.status = 'failed';
          result.error = `Outcome verification failed: "${outcome}"`;
          const screenshot = await this.takeScreenshot(`failed-outcome-${i + 1}`);
          if (screenshot) result.screenshots.push(screenshot);
          break;
        }
      } catch (error) {
        result.status = 'failed';
        result.error = `Error during outcome verification for "${outcome}": ${error}`;
        break;
      }
    }
  }

  private async takeScreenshot(stepId: string): Promise<string | undefined> {
    try {
      const filename = `screenshot-${stepId}-${Date.now()}.png`;
      const screenshotsDir = resolve('./test-results/screenshots');
      await fs.mkdir(screenshotsDir, { recursive: true });
      const targetPath = join(screenshotsDir, filename);

      const result = await this.browser.callTool('browser_take_screenshot', {
        filename: targetPath,
      });
      // Assuming the tool saves the file directly and returns the path or confirms success.
      // This part might need adjustment based on the actual MCP tool's return value.
      this.logger.info(`Screenshot saved to ${targetPath}`);
      return targetPath;
    } catch (e) {
      this.logger.error(`Failed to take screenshot: ${e}`);
      return undefined;
    }
  }
}
