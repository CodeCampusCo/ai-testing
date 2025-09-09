import ora, { Ora } from 'ora';
import chalk from 'chalk';

export class StepProgressManager {
  private currentSpinner?: Ora;
  private stepCount: number;
  private currentStep: number = 0;
  private verbose: boolean;
  private completedSteps: Array<{
    step: number;
    description: string;
    duration: number;
    status: 'success' | 'failed' | 'warning';
  }> = [];

  constructor(totalSteps: number, verbose: boolean = false) {
    this.stepCount = totalSteps;
    this.verbose = verbose;
  }

  /**
   * Update the total number of steps.
   */
  setTotalSteps(total: number): void {
    this.stepCount = total;
  }

  /**
   * Start progress for a new step
   */
  startStep(description: string): void {
    // Stop any existing spinner
    if (this.currentSpinner) {
      this.currentSpinner.stop();
    }

    this.currentStep++;
    const text = `Step ${this.currentStep}/${this.stepCount}: ${description}`;

    // In verbose mode, don't show spinner to avoid conflicts with debug logs
    if (this.verbose) {
      console.log(chalk.blue(`⏳ ${text}`));
    } else {
      this.currentSpinner = ora({
        text,
        spinner: 'dots',
        color: 'cyan',
      }).start();
    }
  }

  /**
   * Mark current step as successful
   */
  succeedStep(duration: number): void {
    const stepInfo = {
      step: this.currentStep,
      description: this.currentSpinner?.text || `Step ${this.currentStep}`,
      duration,
      status: 'success' as const,
    };

    this.completedSteps.push(stepInfo);

    if (this.verbose) {
      console.log(
        chalk.green(
          `✅ Step ${this.currentStep}/${this.stepCount} completed (${this.formatDuration(duration)})`
        )
      );
    } else if (this.currentSpinner) {
      this.currentSpinner.succeed(
        `${this.currentSpinner.text} ${chalk.gray(`(${this.formatDuration(duration)})`)}`
      );
      this.currentSpinner = undefined;
    }
  }

  /**
   * Mark current step as failed
   */
  failStep(error: string, duration?: number): void {
    const stepInfo = {
      step: this.currentStep,
      description: this.currentSpinner?.text || `Step ${this.currentStep}`,
      duration: duration || 0,
      status: 'failed' as const,
    };

    this.completedSteps.push(stepInfo);

    if (this.verbose) {
      console.log(chalk.red(`❌ Step ${this.currentStep}/${this.stepCount} failed: ${error}`));
    } else if (this.currentSpinner) {
      this.currentSpinner.fail(`${this.currentSpinner.text} ${chalk.red(`- ${error}`)}`);
      this.currentSpinner = undefined;
    }
  }

  /**
   * Mark current step with warning
   */
  warnStep(warning: string, duration: number): void {
    const stepInfo = {
      step: this.currentStep,
      description: this.currentSpinner?.text || `Step ${this.currentStep}`,
      duration,
      status: 'warning' as const,
    };

    this.completedSteps.push(stepInfo);

    if (this.verbose) {
      console.log(
        chalk.yellow(
          `⚠️ Step ${this.currentStep}/${this.stepCount} warning: ${warning} (${this.formatDuration(duration)})`
        )
      );
    } else if (this.currentSpinner) {
      this.currentSpinner.warn(
        `${this.currentSpinner.text} ${chalk.yellow(`- ${warning}`)} ${chalk.gray(`(${this.formatDuration(duration)})`)}`
      );
      this.currentSpinner = undefined;
    }
  }

  /**
   * Stop all spinners and cleanup
   */
  finish(): void {
    if (this.currentSpinner) {
      this.currentSpinner.stop();
      this.currentSpinner = undefined;
    }
  }

  /**
   * Get summary of completed steps
   */
  getSummary(): string {
    const total = this.completedSteps.length;
    const successful = this.completedSteps.filter(s => s.status === 'success').length;
    const failed = this.completedSteps.filter(s => s.status === 'failed').length;
    const warnings = this.completedSteps.filter(s => s.status === 'warning').length;

    let summary = `\n📋 Step Summary:\n`;

    this.completedSteps.forEach(step => {
      const icon = step.status === 'success' ? '✅' : step.status === 'failed' ? '❌' : '⚠️';
      const description = step.description.replace(`Step ${step.step}/${this.stepCount}: `, '');
      summary += `${icon} Step ${step.step}: ${description} ${chalk.gray(`(${this.formatDuration(step.duration)})`)}\n`;
    });

    const statusColor = failed > 0 ? chalk.red : warnings > 0 ? chalk.yellow : chalk.green;
    summary += `\n${statusColor(`${successful}/${total} steps passed`)}\n`;

    return summary;
  }

  /**
   * Format duration in human readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }
}
