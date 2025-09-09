#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import boxen from 'boxen';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { LangGraphWorkflow } from '../workflow/langgraph-workflow.js';
import { AIProviderConfig } from '../types/workflow.js';
import { MCPClientConfig } from '../types/mcp.js';
import { StepProgressManager } from '../ui/step-progress.js';
import dotenv from 'dotenv';
import { parse as parseYaml } from 'yaml';

const program = new Command();

program
  .name('ai-e2e-test')
  .description('AI-Powered End-to-End Test Framework')
  .version('0.1.0-alpha');

// Run command
program
  .command('run')
  .alias('r')
  .description('Execute test scenarios from files')
  .option('-p, --project <name>', 'Project directory name from projects/')
  .option('-f, --file <filename>', 'Test scenario filename (without .md extension)')
  .option('-o, --output <path>', 'Output directory for results')
  .option('--no-headless', 'Run browser in visible mode')
  .option('--no-clean-state', 'Disable browser state cleanup before test execution')
  .option('-v, --verbose', 'Enable detailed debug logging')
  .action(async options => {
    try {
      await handleRunCommand(options);
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

async function handleRunCommand(options: any) {
  console.log(
    boxen(chalk.green.bold('🚀 AI E2E Test Runner'), {
      padding: 1,
      borderColor: 'green',
      borderStyle: 'round',
    })
  );

  let input = '';
  let outputDir = options.output || './test-results';

  // Get input from project and file
  if (!options.project || !options.file) {
    throw new Error('Both --project and --file options are required.');
  }

  if (options.project && options.file) {
    // Load from projects directory
    const projectDir = resolve('projects', options.project);
    const testFile = join(projectDir, `${options.file}.md`);
    const configFile = join(projectDir, 'config.yml');

    try {
      // Load test file
      let testContent = await fs.readFile(testFile, 'utf-8');

      // Load and parse config.yml
      const configContent = await fs.readFile(configFile, 'utf-8');
      const config = parseYaml(configContent);

      // Replace variables in test content
      input = replaceVariables(testContent, config);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${error.path}`);
      }
      throw error;
    }
  } else if (options.file) {
    // Load directly specified file (backward compatibility)
    input = await fs.readFile(resolve(options.file), 'utf-8');
  } else {
    input = options.input;
  }

  // Get AI configuration (from .env)
  const aiConfig = await getAIConfig();
  const mcpConfig = getMCPConfig(options);

  // Create progress manager
  const progressManager = new StepProgressManager(0, options.verbose); // Start with 0, will be updated by the agent

  // Create workflow
  const workflow = new LangGraphWorkflow({
    aiProvider: aiConfig,
    mcpConfig,
    logger: createLogger(options.verbose),
    progressManager,
  });
  await workflow.initialize();

  // Ensure output directory exists
  await fs.mkdir(resolve(outputDir), { recursive: true });

  // Run workflow with streaming updates
  const spinner = ora('Starting test execution...').start();

  try {
    const result = await workflow.runStreaming(input, state => {
      switch (state.currentStep) {
        case 'parse':
          spinner.text = '📝 Parsing test scenario...';
          break;
        case 'execute':
          spinner.stop();
          break;
        case 'analyze':
          if (!spinner.isSpinning) {
            spinner.start('📊 Analyzing results...');
          } else {
            spinner.text = '📊 Analyzing results...';
          }
          break;
      }
    });

    spinner.stop();
    progressManager.finish();

    if (result.error) {
      console.error(chalk.red(`Test execution failed: ${result.error}`));
      return;
    }

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultFile = join(outputDir, `test-result-${timestamp}.json`);

    await fs.writeFile(
      resolve(resultFile),
      JSON.stringify(
        {
          scenario: result.scenario,
          execution: result.executionResult,
          analysis: result.analysis,
        },
        null,
        2
      ),
      'utf-8'
    );

    // Display results
    displayTestResults(result, resultFile);
  } catch (error) {
    spinner.fail('Test execution failed');
    progressManager.finish();
    throw error;
  }
}

async function getAIConfig(): Promise<AIProviderConfig> {
  dotenv.config();

  const envConfig = getEnvConfig();
  const missingVars: string[] = [];

  if (!envConfig.provider) {
    missingVars.push('AI_PROVIDER');
  }
  if (!envConfig.model) {
    missingVars.push('AI_MODEL');
  }
  if (!envConfig.apiKey) {
    missingVars.push('AI_API_KEY');
  }

  if (missingVars.length > 0) {
    const errorTitle = chalk.bold('AI Configuration Error');
    const errorMessage = `Missing required environment variables. Please set them in your .env file or as environment variables:`;
    const missingVarsList = missingVars.map(v => `  - ${chalk.yellow(v)}`).join('\n');
    const fullMessage = `\n${errorTitle}\n${errorMessage}\n${missingVarsList}\n`;
    throw new Error(fullMessage);
  }

  return {
    provider: envConfig.provider as AIProviderConfig['provider'],
    apiKey: envConfig.apiKey as string,
    model: envConfig.model as string,
    temperature: 0.1,
    maxTokens: 2000,
  };
}

function getEnvConfig(): { provider?: string; model?: string; apiKey?: string } {
  return {
    provider: process.env.AI_PROVIDER,
    model: process.env.AI_MODEL,
    apiKey: process.env.AI_API_KEY,
  };
}

function getMCPConfig(options?: any): MCPClientConfig {
  return {
    command: 'npx',
    args: ['@playwright/mcp@latest'],
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    cleanState: options?.cleanState !== false, // Default to true, unless --no-clean-state is specified
  };
}

function createLogger(verbose = false) {
  return {
    debug: verbose
      ? (msg: string, ...args: any[]) => console.log(chalk.gray(`[DEBUG] ${msg}`), ...args)
      : () => {}, // No-op when not verbose
    info: verbose
      ? (msg: string, ...args: any[]) => console.log(chalk.blue(`[INFO] ${msg}`), ...args)
      : () => {}, // No-op when not verbose
    warn: (msg: string, ...args: any[]) => console.warn(chalk.yellow(`[WARN] ${msg}`), ...args),
    error: (msg: string, ...args: any[]) => console.error(chalk.red(`[ERROR] ${msg}`), ...args),
  };
}

function replaceVariables(content: string, config: any): string {
  let result = content;

  // Replace {{urls.xxx}} variables
  if (config.urls) {
    for (const [key, value] of Object.entries(config.urls)) {
      const pattern = new RegExp(`\\{\\{urls\\.${key}\\}\\}`, 'g');
      result = result.replace(pattern, value as string);
    }
  }

  // Replace {{xxx.yyy}} variables from test_data and other root sections
  for (const [sectionKey, sectionValue] of Object.entries(config)) {
    if (
      sectionKey === 'project' ||
      sectionKey === 'browser' ||
      sectionKey === 'execution' ||
      sectionKey === 'reporting'
    ) {
      // Skip system sections
      continue;
    }

    if (typeof sectionValue === 'object' && sectionValue !== null) {
      for (const [key, value] of Object.entries(sectionValue)) {
        if (typeof value === 'object' && value !== null) {
          // Handle nested objects like test_data.valid.username
          for (const [nestedKey, nestedValue] of Object.entries(value)) {
            const pattern = new RegExp(`\\{\\{${key}\\.${nestedKey}\\}\\}`, 'g');
            result = result.replace(pattern, nestedValue as string);
          }
        } else {
          // Handle flat objects like urls.main
          const pattern = new RegExp(`\\{\\{${sectionKey}\\.${key}\\}\\}`, 'g');
          result = result.replace(pattern, value as string);
        }
      }
    }
  }

  // Replace {{project.xxx}} variables
  if (config.project) {
    for (const [key, value] of Object.entries(config.project)) {
      const pattern = new RegExp(`\\{\\{project\\.${key}\\}\\}`, 'g');
      result = result.replace(pattern, value as string);
    }
  }

  return result;
}

function displayTestResults(result: any, resultFile: string) {
  const { scenario, executionResult, analysis } = result;

  // Status banner
  const statusColor = analysis?.passed ? 'green' : 'red';
  const statusIcon = analysis?.passed ? '✅' : '❌';
  const statusText = analysis?.passed ? 'PASSED' : 'FAILED';

  console.log(
    '\n' +
      boxen(
        chalk[statusColor].bold(`${statusIcon} Test ${statusText}\n\n`) +
          chalk.white(`Scenario: ${scenario?.description || 'Unknown'}\n`) +
          chalk.white(`Duration: ${executionResult?.duration || 0}ms\n`) +
          chalk.white(`Steps: ${executionResult?.steps?.length || 0}\n`) +
          chalk.white(`Accessibility Score: ${analysis?.accessibilityScore || 0}%`),
        { padding: 1, borderColor: statusColor as any }
      )
  );

  // Step results
  if (executionResult?.steps?.length > 0) {
    console.log(chalk.yellow.bold('\nStep Results:'));
    executionResult.steps.forEach((step: any, index: number) => {
      const stepIcon = step.status === 'passed' ? '✅' : '❌';
      const stepColor = step.status === 'passed' ? 'green' : 'red';
      console.log(
        `${index + 1}. ${stepIcon} ${chalk[stepColor](step.description)} (${step.duration}ms)`
      );
      if (step.error) {
        console.log(`   ${chalk.red('Error:')} ${step.error}`);
      }
    });
  }

  // Outcome results
  if (executionResult?.outcomeResults?.length > 0) {
    console.log(chalk.yellow.bold('\n🔍 Outcome Verification:'));
    executionResult.outcomeResults.forEach((outcome: any, index: number) => {
      const icon = outcome.status === 'passed' ? '✅' : '❌';
      const color = outcome.status === 'passed' ? 'green' : 'red';
      console.log(`${index + 1}. ${icon} ${chalk[color](outcome.description)}`);
      if (outcome.error) {
        console.log(`   ${chalk.red('Reason:')} ${outcome.error}`);
      }
    });
  }

  // Analysis
  if (analysis) {
    console.log(chalk.blue.bold('\n📊 Analysis:'));
    console.log(chalk.white(analysis.summary));

    if (analysis.issues?.length > 0) {
      console.log(chalk.red.bold('\n⚠️  Issues:'));
      analysis.issues.forEach((issue: string, index: number) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }

    if (analysis.suggestions?.length > 0) {
      console.log(chalk.cyan.bold('\n💡 Suggestions:'));
      analysis.suggestions.forEach((suggestion: string, index: number) => {
        console.log(`${index + 1}. ${suggestion}`);
      });
    }
  }

  console.log(chalk.gray(`\n📁 Detailed results saved to: ${resultFile}`));

  if (analysis?.tokenUsage && analysis.tokenUsage.totalTokens > 0) {
    console.log(
      chalk.magenta(
        `\nToken Usage: ${analysis.tokenUsage.totalTokens} total (Input: ${analysis.tokenUsage.inputTokens}, Output: ${analysis.tokenUsage.outputTokens})`
      )
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
