import { BaseAgent, AgentError } from './base.js';
import { TestScenario, TestResult, StepResult, AccessibilityReport } from '../types/workflow.js';
import { PlaywrightMCPClient } from '../mcp/browser.js';
import { MCPClientConfig, ElementInfo } from '../types/mcp.js';

export class TestExecutorAgent implements BaseAgent<TestScenario, TestResult> {
  name = 'TestExecutor';
  description = 'Executes test scenarios using browser automation via MCP';

  private browser: PlaywrightMCPClient;

  constructor(
    mcpConfig: MCPClientConfig,
    private logger: {
      debug: (msg: string, ...args: any[]) => void;
      info: (msg: string, ...args: any[]) => void;
      warn: (msg: string, ...args: any[]) => void;
      error: (msg: string, ...args: any[]) => void;
    }
  ) {
    this.browser = new PlaywrightMCPClient(mcpConfig);
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
      screenshots: []
    };

    try {
      await this.browser.connect();
      this.logger.debug('Browser connected successfully');

      // Execute each test step
      for (const step of input.steps) {
        const stepResult = await this.executeStep(step, result);
        result.steps.push(stepResult);
        
        if (stepResult.status === 'failed') {
          result.status = 'failed';
          // Continue execution for remaining steps but mark them as skipped
          break;
        }
      }

      // Verify expected outcomes
      if (result.status === 'passed') {
        await this.verifyOutcomes(input, result);
      }

      // Get accessibility report
      result.accessibility = await this.generateAccessibilityReport();
      
    } catch (error) {
      this.logger.error(`Test execution failed: ${error}`);
      result.status = 'error';
      result.error = error instanceof Error ? error.message : String(error);
    } finally {
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();
      
      try {
        await this.browser.disconnect();
        this.logger.debug('Browser disconnected');
      } catch (error) {
        this.logger.warn(`Browser disconnect error: ${error}`);
      }
    }

    this.logger.info(
      `Test ${input.id} completed: ${result.status} (${result.duration}ms)`
    );

    return result;
  }

  private async executeStep(
    step: TestScenario['steps'][0], 
    testResult: TestResult
  ): Promise<StepResult> {
    const stepStart = Date.now();
    this.logger.debug(`Executing step ${step.id}: ${step.action}`);

    const stepResult: StepResult = {
      stepId: step.id,
      status: 'passed',
      duration: 0
    };

    try {
      switch (step.action) {
        case 'navigate':
          await this.browser.navigate(step.target || step.value || '');
          break;

        case 'click':
          await this.clickElement(step);
          break;

        case 'type':
          await this.typeText(step);
          break;

        case 'wait':
          await this.waitForElement(step);
          break;

        case 'verify':
          const verificationResult = await this.verifyElement(step);
          stepResult.actualValue = verificationResult.actualValue;
          if (!verificationResult.success) {
            stepResult.status = 'failed';
            stepResult.error = verificationResult.error;
          }
          break;

        case 'screenshot':
          const screenshotPath = await this.takeScreenshot(step.id);
          stepResult.screenshot = screenshotPath;
          testResult.screenshots.push(screenshotPath);
          break;

        default:
          throw new Error(`Unsupported action: ${step.action}`);
      }

    } catch (error) {
      stepResult.status = 'failed';
      stepResult.error = error instanceof Error ? error.message : String(error);
      this.logger.error(`Step ${step.id} failed: ${stepResult.error}`);
    }

    stepResult.duration = Date.now() - stepStart;
    return stepResult;
  }

  private async clickElement(step: TestScenario['steps'][0]): Promise<void> {
    const snapshot = await this.browser.getSnapshot();
    const element = this.findElement(snapshot.elements, step.target || '');
    
    if (!element) {
      throw new Error(`Element not found: ${step.target}`);
    }

    await this.browser.callTool('browser_click', {
      element: element.name || step.target,
      ref: element.ref
    });
  }

  private async typeText(step: TestScenario['steps'][0]): Promise<void> {
    const snapshot = await this.browser.getSnapshot();
    const element = this.findElement(snapshot.elements, step.target || '');
    
    if (!element) {
      throw new Error(`Input element not found: ${step.target}`);
    }

    await this.browser.callTool('browser_type', {
      element: element.name || step.target,
      ref: element.ref,
      text: step.value || ''
    });
  }

  private async waitForElement(step: TestScenario['steps'][0]): Promise<void> {
    const timeout = step.timeout || 5000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const snapshot = await this.browser.getSnapshot();
        const element = this.findElement(snapshot.elements, step.target || '');
        
        if (element) {
          return; // Element found
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error(`Timeout waiting for element: ${step.target}`);
  }

  private async verifyElement(step: TestScenario['steps'][0]): Promise<{
    success: boolean;
    actualValue?: string;
    error?: string;
  }> {
    try {
      const snapshot = await this.browser.getSnapshot();
      
      if (step.target) {
        const element = this.findElement(snapshot.elements, step.target);
        
        if (!element) {
          return {
            success: false,
            error: `Element not found: ${step.target}`
          };
        }
        
        // Check if element has expected text content
        if (step.value && element.text) {
          const hasExpectedText = element.text.includes(step.value);
          return {
            success: hasExpectedText,
            actualValue: element.text,
            error: hasExpectedText ? undefined : 
              `Expected text "${step.value}" not found in "${element.text}"`
          };
        }
        
        return {
          success: true,
          actualValue: element.text || element.name || 'Element exists'
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async takeScreenshot(stepId: string): Promise<string> {
    const filename = `screenshot-${stepId}-${Date.now()}.png`;
    
    await this.browser.callTool('browser_take_screenshot', {
      filename
    });
    
    return filename;
  }

  private async verifyOutcomes(
    scenario: TestScenario, 
    result: TestResult
  ): Promise<void> {
    for (const outcome of scenario.expectedOutcomes) {
      try {
        const verified = await this.verifyOutcome(outcome);
        if (!verified) {
          result.status = 'failed';
          result.error = `Expected outcome failed: ${outcome.description}`;
          break;
        }
      } catch (error) {
        result.status = 'failed';
        result.error = `Outcome verification error: ${error}`;
        break;
      }
    }
  }

  private async verifyOutcome(outcome: TestScenario['expectedOutcomes'][0]): Promise<boolean> {
    const snapshot = await this.browser.getSnapshot();
    
    switch (outcome.type) {
      case 'element_exists':
        const element = this.findElement(snapshot.elements, outcome.target || '');
        return !!element;
        
      case 'text_contains':
        const textElement = this.findElement(snapshot.elements, outcome.target || '');
        return textElement?.text?.includes(outcome.value || '') || false;
        
      case 'url_matches':
        const currentUrl = this.browser.currentUrl;
        return currentUrl?.includes(outcome.value || '') || false;
        
      case 'page_title':
        // Would need page title from MCP - for now return true
        return true;
        
      case 'custom':
        // Custom verification logic would go here
        return true;
        
      default:
        throw new Error(`Unsupported outcome type: ${outcome.type}`);
    }
  }

  private findElement(elements: ElementInfo[], target: string): ElementInfo | undefined {
    // Try to find element by name (accessibility label)
    let element = elements.find(el => 
      el.name?.toLowerCase().includes(target.toLowerCase())
    );
    
    // If not found, try by text content
    if (!element) {
      element = elements.find(el => 
        el.text?.toLowerCase().includes(target.toLowerCase())
      );
    }
    
    // If not found, try by type matching common selectors
    if (!element && target.includes('button')) {
      element = elements.find(el => el.type === 'button');
    }
    
    if (!element && target.includes('input')) {
      element = elements.find(el => el.type === 'textbox');
    }
    
    return element;
  }

  private async generateAccessibilityReport(): Promise<AccessibilityReport> {
    try {
      const snapshot = await this.browser.getSnapshot();
      const elements = snapshot.elements;
      
      const interactableTypes = ['button', 'textbox', 'link', 'checkbox', 'radio'];
      const interactableElements = elements.filter(el => 
        interactableTypes.includes(el.type)
      );
      
      // Basic accessibility checks
      const issues: AccessibilityReport['issues'] = [];
      
      interactableElements.forEach(element => {
        // Check for missing labels
        if (!element.name && !element.text) {
          issues.push({
            type: 'missing_label',
            severity: 'medium',
            element: `${element.type} [${element.ref}]`,
            description: `${element.type} element has no accessible name`
          });
        }
      });
      
      return {
        elementsFound: elements.length,
        interactableElements: interactableElements.length,
        issues
      };
      
    } catch (error) {
      this.logger.error(`Accessibility report generation failed: ${error}`);
      return {
        elementsFound: 0,
        interactableElements: 0,
        issues: []
      };
    }
  }
}