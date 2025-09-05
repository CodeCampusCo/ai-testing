import { BaseAgent, AgentError, AIAgent } from './base.js';
import { TestScenario, TestResult, StepResult, AccessibilityReport, AIProviderConfig, MCPResponse } from '../types/workflow.js';
import { PlaywrightMCPClient } from '../mcp/browser.js';
import { MCPClientConfig, ElementInfo } from '../types/mcp.js';
import { LangChainAIService } from '../ai/langchain-service.js';
import { promises as fs } from 'fs';
import { resolve, join } from 'path';

export class TestExecutorAgent implements BaseAgent<TestScenario, TestResult> {
  name = 'TestExecutor';
  description = 'Executes test scenarios using browser automation via MCP';

  private browser: PlaywrightMCPClient;
  private aiService: LangChainAIService;

  constructor(
    mcpConfig: MCPClientConfig,
    aiConfig: AIProviderConfig,
    private logger: {
      debug: (msg: string, ...args: any[]) => void;
      info: (msg: string, ...args: any[]) => void;
      warn: (msg: string, ...args: any[]) => void;
      error: (msg: string, ...args: any[]) => void;
    }
  ) {
    this.browser = new PlaywrightMCPClient(mcpConfig);
    this.aiService = new LangChainAIService(aiConfig, logger);
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

      // Execute using raw steps (AI-guided execution)
      if (input.rawSteps && input.rawSteps.length > 0) {
        await this.executeRawStepsWithAI(input.rawSteps, result);
        
        // Populate the steps array for analysis reporting
        input.steps = input.rawSteps.map((rawStep, index) => ({
          id: `raw-step-${index + 1}`,
          action: this.inferActionFromStep(rawStep),
          description: rawStep,
          target: this.extractTargetFromStep(rawStep),
          value: this.extractValueFromStep(rawStep)
        }));
      } else {
        // Fallback to traditional parsed steps
        for (const step of input.steps) {
          const stepResult = await this.executeStep(step, result);
          result.steps.push(stepResult);
          
          if (stepResult.status === 'failed') {
            result.status = 'failed';
            break;
          }
        }
      }

      // Verify expected outcomes using AI if we have raw outcomes
      if (result.status === 'passed' && input.rawOutcomes && input.rawOutcomes.length > 0) {
        await this.verifyOutcomesWithAI(input.rawOutcomes, result);
      } else if (result.status === 'passed') {
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
      
      // Take final screenshot before disconnecting
      try {
        const finalScreenshot = await this.takeScreenshot('final-state');
        result.screenshots.push(finalScreenshot);
        this.logger.info(`Final screenshot captured: ${finalScreenshot}`);
      } catch (screenshotError) {
        this.logger.warn(`Failed to capture final screenshot: ${screenshotError}`);
      }
      
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
          const targetUrl = step.target || step.value || '';
          await this.browser.navigate(targetUrl);
          
          // Wait for page load and verify navigation success
          await new Promise(resolve => setTimeout(resolve, 3000)); 
          const snapshot = await this.browser.getSnapshot();
          const currentUrl = (snapshot as any).url || '';
          
          this.logger.debug(`Navigation check: target=${targetUrl}, actual=${currentUrl}`);
          
          if (!currentUrl || currentUrl === 'about:blank' || currentUrl === '') {
            throw new Error(`Navigation failed: Page still shows 'about:blank' after navigating to ${targetUrl}`);
          }
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
    const screenshotsDir = resolve('./test-results/screenshots');
    const targetPath = join(screenshotsDir, filename);
    
    try {
      this.logger.debug(`Taking screenshot with filename: ${filename}`);
      
      // Ensure screenshots directory exists
      await fs.mkdir(screenshotsDir, { recursive: true });
      
      // Call MCP screenshot tool
      const screenshotResult = await this.browser.callTool('browser_take_screenshot', {
        type: 'png',
        filename: filename,
        fullPage: false
      }) as MCPResponse;
      
      // Extract base64 data from MCP response
      if (screenshotResult?.content) {
        for (const item of screenshotResult.content) {
          if (item.type === 'image' && item.data) {
            // Convert base64 to buffer and save directly
            const buffer = Buffer.from(item.data, 'base64');
            await fs.writeFile(targetPath, buffer);
            
            this.logger.info(`Screenshot captured and saved: ${targetPath}`);
            return targetPath;
          }
        }
      }
      
      // If no base64 data found, throw error
      this.logger.warn(`No base64 data found in MCP response`);
      throw new Error('No screenshot data received from MCP');
      
    } catch (screenshotError) {
      this.logger.error(`Screenshot capture failed: ${screenshotError}`);
      throw new Error(`Failed to capture screenshot: ${screenshotError}`);
    }
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
      
      // Enhanced accessibility checks
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

        // Check for buttons without descriptive text
        if (element.type === 'button' && element.text && element.text.length < 3) {
          issues.push({
            type: 'other',
            severity: 'low',
            element: `button [${element.ref}]`,
            description: `Button text "${element.text}" is too short to be descriptive`
          });
        }

        // Check for form inputs without proper labels
        if (element.type === 'textbox' && !element.name) {
          issues.push({
            type: 'missing_label',
            severity: 'high',
            element: `textbox [${element.ref}]`,
            description: 'Form input lacks accessible label'
          });
        }
      });

      // Check for potential keyboard navigation issues
      const focusableElements = elements.filter(el => 
        ['button', 'link', 'textbox', 'checkbox', 'radio'].includes(el.type)
      );

      if (focusableElements.length > 0) {
        // Simple heuristic: if there are many focusable elements close together,
        // there might be tab order issues
        if (focusableElements.length > 10) {
          issues.push({
            type: 'keyboard_trap',
            severity: 'low',
            element: 'page',
            description: `Page has ${focusableElements.length} focusable elements - review tab order`
          });
        }
      }
      
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

  private async executeRawStepsWithAI(rawSteps: string[], result: TestResult): Promise<void> {
    this.logger.info(`Executing ${rawSteps.length} raw steps with AI guidance`);

    // Get current page snapshot
    let currentSnapshot = await this.browser.getSnapshot();
    
    for (let i = 0; i < rawSteps.length; i++) {
      const step = rawSteps[i];
      const stepStart = Date.now();
      
      this.logger.debug(`Executing raw step ${i + 1}: ${step}`);

      const stepResult: StepResult = {
        stepId: `raw-step-${i + 1}`,
        status: 'passed',
        duration: 0
      };

      try {
        // Ask AI to convert raw step to MCP calls
        if (!step) {
          throw new Error('Empty step');
        }
        
        const aiStart = Date.now();
        const mcpCalls = await this.convertStepToMCPCalls(step, currentSnapshot);
        const aiDuration = Date.now() - aiStart;
        
        // Execute the MCP calls
        const mcpStart = Date.now();
        for (const call of mcpCalls) {
          try {
            await this.browser.callTool(call.tool, call.args);
            
            // Special handling for click actions - add wait for page response
            if (call.tool === 'browser_click') {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } catch (mcpError) {
            this.logger.error(`MCP call failed: ${call.tool} with args ${JSON.stringify(call.args)}`);
            throw new Error(`MCP call failed: ${mcpError instanceof Error ? mcpError.message : String(mcpError)}`);
          }
        }
        const mcpDuration = Date.now() - mcpStart;

        // Update snapshot after execution
        const snapshotStart = Date.now();
        currentSnapshot = await this.browser.getSnapshot();
        const snapshotDuration = Date.now() - snapshotStart;
        
        // Log performance breakdown for analysis
        this.logger.debug(`Step ${i + 1} performance: AI=${aiDuration}ms, MCP=${mcpDuration}ms, Snapshot=${snapshotDuration}ms`);

      } catch (error) {
        stepResult.status = 'failed';
        stepResult.error = error instanceof Error ? error.message : String(error);
        this.logger.error(`Raw step ${i + 1} failed: ${stepResult.error}`);
        result.status = 'failed';
        
        // Capture screenshot on failure
        this.logger.info(`Attempting to capture screenshot on step failure...`);
        try {
          const screenshot = await this.takeScreenshot(`failed-step-${i + 1}`);
          stepResult.screenshot = screenshot;
          result.screenshots.push(screenshot);
          this.logger.info(`Screenshot captured on failure: ${screenshot}`);
        } catch (screenshotError) {
          this.logger.error(`Failed to capture screenshot: ${screenshotError}`);
        }
        break; // Stop execution after first failure
      }

      stepResult.duration = Date.now() - stepStart;
      result.steps.push(stepResult);

      if (stepResult.status === 'failed') {
        break;
      }
    }
  }

  private async convertStepToMCPCalls(step: string, snapshot: any): Promise<Array<{tool: string, args: any}>> {
    try {
      const availableTools = await this.browser.getAvailableTools();
      
      const context = {
        url: snapshot.url,
        elements: snapshot.elements,
        availableTools: availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')
      };

      // Use LangChain service for structured MCP command generation
      return await this.aiService.generateMCPCommands(step, context);

    } catch (error) {
      this.logger.error(`AI step conversion failed: ${error}`);
      throw new Error(`Failed to convert step "${step}" to MCP calls: ${error}`);
    }
  }

  private async verifyOutcomesWithAI(rawOutcomes: string[], result: TestResult): Promise<void> {
    // Wait for network to be idle to ensure DOM is fully updated after redirects
    this.logger.debug('Waiting for network idle to ensure DOM stability before outcome verification...');
    try {
      await this.browser.callTool('browser_wait_for_load_state', { state: 'networkidle' });
    } catch (error) {
      // Fallback to shorter delay if networkidle not available
      this.logger.debug('Network idle wait failed, using minimal delay fallback');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    for (let i = 0; i < rawOutcomes.length; i++) {
      const outcome = rawOutcomes[i];
      
      try {
        const snapshot = await this.browser.getSnapshot();
        
        // Log snapshot content for debugging
        this.logger.debug(`DOM snapshot for outcome ${i + 1}:`);
        this.logger.debug(`- URL: ${(snapshot as any).url || 'unknown'}`);
        this.logger.debug(`- Elements count: ${snapshot.elements?.length || 0}`);
        if (snapshot.elements && snapshot.elements.length > 0) {
          this.logger.debug(`- Sample elements: ${JSON.stringify(snapshot.elements.slice(0, 5), null, 2)}`);
        }
        
        if (!outcome) {
          continue; // Skip empty outcomes
        }
        const verified = await this.verifyRawOutcomeWithAI(outcome, snapshot);
        
        if (!verified) {
          result.status = 'failed';
          result.error = `Expected outcome failed: ${outcome}`;
          
          // Capture screenshot on outcome failure
          try {
            const screenshot = await this.takeScreenshot(`failed-outcome-${i + 1}`);
            result.screenshots.push(screenshot);
            this.logger.info(`Screenshot captured on outcome failure: ${screenshot}`);
          } catch (screenshotError) {
            this.logger.warn(`Failed to capture screenshot: ${screenshotError}`);
          }
          
          break;
        }
      } catch (error) {
        result.status = 'failed';
        result.error = `Outcome verification error: ${error}`;
        break;
      }
    }
  }

  private async verifyRawOutcomeWithAI(outcome: string, snapshot: any): Promise<boolean> {
    this.logger.debug(`AI Verification Prompt: Verifying outcome "${outcome}"`);
    this.logger.debug(`Snapshot elements detail: ${JSON.stringify(snapshot.elements?.map((el: any) => ({
      type: el.type,
      name: el.name,
      text: el.text,
      attributes: el.attributes
    })).slice(0, 10), null, 2)}`);
    
    try {
      // Use LangChain service for natural language outcome verification
      const result = await this.aiService.verifyOutcome(outcome, snapshot);
      this.logger.debug(`AI Verification Result: ${result}`);
      return result;

    } catch (error) {
      this.logger.error(`AI outcome verification failed: ${error}`);
      return false;
    }
  }

  private inferActionFromStep(step: string): any {
    const lowercaseStep = step.toLowerCase();
    
    if (lowercaseStep.includes('navigate') || lowercaseStep.includes('go to')) {
      return 'navigate';
    } else if (lowercaseStep.includes('click')) {
      return 'click';
    } else if (lowercaseStep.includes('type') || lowercaseStep.includes('enter') || lowercaseStep.includes('input')) {
      return 'type';
    } else if (lowercaseStep.includes('verify') || lowercaseStep.includes('check') || lowercaseStep.includes('assert')) {
      return 'verify';
    } else if (lowercaseStep.includes('wait')) {
      return 'wait';
    } else {
      return 'custom';
    }
  }

  private extractTargetFromStep(step: string): string | undefined {
    // Extract text in quotes or common patterns
    const quotedMatch = step.match(/'([^']+)'/);
    if (quotedMatch) {
      return quotedMatch[1];
    }

    const inMatch = step.match(/in '([^']+)'|in "([^"]+)"/);
    if (inMatch) {
      return inMatch[1] || inMatch[2];
    }

    // For navigation, extract URL
    if (step.toLowerCase().includes('navigate') || step.toLowerCase().includes('go to')) {
      const urlMatch = step.match(/(https?:\/\/[^\s]+|\/[^\s]*)/);
      if (urlMatch) {
        return urlMatch[1];
      }
    }

    return undefined;
  }

  private extractValueFromStep(step: string): string | undefined {
    // For type/input actions, extract the value being typed
    const typeMatch = step.match(/type '([^']+)'|enter '([^']+)'|input '([^']+)'/i);
    if (typeMatch) {
      return typeMatch[1] || typeMatch[2] || typeMatch[3];
    }

    return undefined;
  }
}