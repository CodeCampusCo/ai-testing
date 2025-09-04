#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import boxen from 'boxen';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { createSimpleTestWorkflow } from '../workflow/simple-workflow.js';
import { AIProviderConfig } from '../types/workflow.js';
import { MCPClientConfig } from '../types/mcp.js';
import dotenv from 'dotenv';

const program = new Command();

program
  .name('ai-e2e-test')
  .description('AI-Powered End-to-End Test Framework')
  .version('0.1.0-alpha');

// Generate command
program
  .command('generate')
  .alias('g')
  .description('Generate test scenarios from natural language descriptions')
  .option('-i, --input <description>', 'Test description')
  .option('-f, --file <path>', 'Input file with test description')
  .option('-o, --output <path>', 'Output file for generated scenario')
  .option('--provider <provider>', 'AI provider (openai|anthropic|google)', 'openai')
  .option('--model <model>', 'AI model to use')
  .option('--interactive', 'Interactive mode')
  .action(async (options) => {
    try {
      await handleGenerateCommand(options);
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

// Run command
program
  .command('run')
  .alias('r')
  .description('Execute test scenarios')
  .option('-i, --input <description>', 'Test description (generates scenario first)')
  .option('-f, --file <path>', 'Test scenario file to execute')
  .option('-o, --output <path>', 'Output directory for results')
  .option('--provider <provider>', 'AI provider (openai|anthropic|google)', 'openai')
  .option('--model <model>', 'AI model to use')
  .option('--headless', 'Run browser in headless mode', true)
  .option('--no-headless', 'Run browser in visible mode')
  .option('--interactive', 'Interactive mode')
  .action(async (options) => {
    try {
      await handleRunCommand(options);
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });


async function handleGenerateCommand(options: any) {
  console.log(boxen(
    chalk.blue.bold('🤖 AI E2E Test Generator'),
    { padding: 1, borderColor: 'blue', borderStyle: 'round' }
  ));

  let input = '';
  let outputPath = options.output;

  // Get input
  if (options.interactive || (!options.input && !options.file)) {
    const answers = await inquirer.prompt([
      {
        type: 'editor',
        name: 'description',
        message: 'Enter your test description:',
        validate: (input) => input.trim() ? true : 'Test description is required'
      },
      {
        type: 'input',
        name: 'outputPath',
        message: 'Output file path (optional):',
        default: `test-scenario-${Date.now()}.json`,
        when: () => !outputPath
      }
    ]);
    
    input = answers.description;
    outputPath = outputPath || answers.outputPath;
  } else if (options.file) {
    input = await fs.readFile(resolve(options.file), 'utf-8');
  } else {
    input = options.input;
  }

  // Get AI configuration
  const aiConfig = await getAIConfig(options.provider, options.model);
  const mcpConfig = getMCPConfig();

  // Create workflow
  const workflow = createSimpleTestWorkflow({
    aiProvider: aiConfig,
    mcpConfig,
    logger: createLogger()
  });

  // Generate scenario
  const spinner = ora('Generating test scenario...').start();
  
  try {
    const result = await workflow.run(input);
    spinner.stop();

    if (result.error) {
      console.error(chalk.red(`Generation failed: ${result.error}`));
      return;
    }

    if (!result.scenario) {
      console.error(chalk.red('No scenario was generated'));
      return;
    }

    // Save scenario
    if (outputPath) {
      await fs.writeFile(
        resolve(outputPath),
        JSON.stringify(result.scenario, null, 2),
        'utf-8'
      );
      console.log(chalk.green(`✅ Scenario saved to: ${outputPath}`));
    }

    // Display scenario summary
    console.log('\\n' + boxen(
      chalk.white.bold('Generated Test Scenario\\n\\n') +
      chalk.cyan(`ID: ${result.scenario.id}\\n`) +
      chalk.cyan(`Description: ${result.scenario.description}\\n`) +
      chalk.cyan(`Steps: ${result.scenario.steps.length}\\n`) +
      chalk.cyan(`Expected Outcomes: ${result.scenario.expectedOutcomes.length}\\n`) +
      chalk.cyan(`Priority: ${result.scenario.metadata?.priority || 'medium'}\\n`) +
      chalk.cyan(`Estimated Duration: ${(result.scenario.metadata?.estimatedDuration || 0) / 1000}s`),
      { padding: 1, borderColor: 'green' }
    ));

    // Show steps
    console.log(chalk.yellow.bold('\\n📋 Test Steps:'));
    result.scenario.steps.forEach((step, index) => {
      console.log(`${index + 1}. ${chalk.blue(step.action)}: ${step.description}`);
      if (step.target) console.log(`   Target: ${chalk.gray(step.target)}`);
      if (step.value) console.log(`   Value: ${chalk.gray(step.value)}`);
    });

  } catch (error) {
    spinner.fail('Generation failed');
    throw error;
  }
}

async function handleRunCommand(options: any) {
  console.log(boxen(
    chalk.green.bold('🚀 AI E2E Test Runner'),
    { padding: 1, borderColor: 'green', borderStyle: 'round' }
  ));

  let input = '';
  let outputDir = options.output || './test-results';

  // Get input (either description or scenario file)
  if (options.interactive || (!options.input && !options.file)) {
    const { source } = await inquirer.prompt([
      {
        type: 'list',
        name: 'source',
        message: 'What do you want to test?',
        choices: [
          { name: 'Enter test description (generate scenario first)', value: 'description' },
          { name: 'Load existing scenario file', value: 'file' }
        ]
      }
    ]);

    if (source === 'description') {
      const { description } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'description',
          message: 'Enter your test description:',
          validate: (input) => input.trim() ? true : 'Test description is required'
        }
      ]);
      input = description;
    } else {
      const { filePath } = await inquirer.prompt([
        {
          type: 'input',
          name: 'filePath',
          message: 'Path to scenario file:',
          validate: async (path) => {
            try {
              await fs.access(resolve(path));
              return true;
            } catch {
              return 'File not found';
            }
          }
        }
      ]);
      input = await fs.readFile(resolve(filePath), 'utf-8');
    }
  } else if (options.file) {
    input = await fs.readFile(resolve(options.file), 'utf-8');
  } else {
    input = options.input;
  }

  // Get AI configuration
  const aiConfig = await getAIConfig(options.provider, options.model);
  const mcpConfig = getMCPConfig();

  // Create workflow
  const workflow = createSimpleTestWorkflow({
    aiProvider: aiConfig,
    mcpConfig,
    logger: createLogger()
  });

  // Ensure output directory exists
  await fs.mkdir(resolve(outputDir), { recursive: true });

  // Run workflow with streaming updates
  const spinner = ora('Starting test execution...').start();
  
  try {
    const result = await workflow.runStreaming(input, (state) => {
      switch (state.currentStep) {
        case 'generate':
          spinner.text = '🧠 Generating test scenario...';
          break;
        case 'execute':
          spinner.text = '🌐 Executing browser automation...';
          break;
        case 'analyze':
          spinner.text = '📊 Analyzing results...';
          break;
      }
    });

    spinner.stop();

    if (result.error) {
      console.error(chalk.red(`Test execution failed: ${result.error}`));
      return;
    }

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultFile = join(outputDir, `test-result-${timestamp}.json`);
    
    await fs.writeFile(
      resolve(resultFile),
      JSON.stringify({
        scenario: result.scenario,
        execution: result.executionResult,
        analysis: result.analysis
      }, null, 2),
      'utf-8'
    );

    // Display results
    displayTestResults(result, resultFile);

  } catch (error) {
    spinner.fail('Test execution failed');
    throw error;
  }
}


async function getAIConfig(provider?: string, model?: string): Promise<AIProviderConfig> {
  dotenv.config();
  
  const envConfig = getEnvConfig();
  const finalProvider = provider || envConfig.provider || 'openai';
  
  if (!envConfig.apiKey) {
    throw new Error(`No API key found for ${finalProvider}. Please set AI_API_KEY environment variable or create .env file with API key.`);
  }

  return {
    provider: finalProvider as AIProviderConfig['provider'],
    apiKey: envConfig.apiKey,
    model: model || envConfig.model || getDefaultModel(finalProvider),
    temperature: 0.1,
    maxTokens: 2000
  };
}

function getEnvConfig(): { provider?: string; model?: string; apiKey?: string } {
  return {
    provider: process.env.AI_PROVIDER,
    model: process.env.AI_MODEL,
    apiKey: process.env.AI_API_KEY
  };
}

function getDefaultModel(provider: string): string {
  const defaults = {
    openai: 'gpt-4',
    anthropic: 'claude-3-sonnet-20240229',
    google: 'gemini-pro'
  };
  return defaults[provider as keyof typeof defaults] || 'gpt-4';
}


function getMCPConfig(): MCPClientConfig {
  return {
    command: 'npx',
    args: ['@playwright/mcp@latest'],
    timeout: 30000,
    retries: 3,
    retryDelay: 1000
  };
}

function createLogger() {
  return {
    debug: (msg: string, ...args: any[]) => console.log(chalk.gray(`[DEBUG] ${msg}`), ...args),
    info: (msg: string, ...args: any[]) => console.log(chalk.blue(`[INFO] ${msg}`), ...args),
    warn: (msg: string, ...args: any[]) => console.warn(chalk.yellow(`[WARN] ${msg}`), ...args),
    error: (msg: string, ...args: any[]) => console.error(chalk.red(`[ERROR] ${msg}`), ...args)
  };
}

function displayTestResults(result: any, resultFile: string) {
  const { scenario, executionResult, analysis } = result;
  
  // Status banner
  const statusColor = analysis?.passed ? 'green' : 'red';
  const statusIcon = analysis?.passed ? '✅' : '❌';
  const statusText = analysis?.passed ? 'PASSED' : 'FAILED';
  
  console.log('\\n' + boxen(
    chalk[statusColor].bold(`${statusIcon} Test ${statusText}\\n\\n`) +
    chalk.white(`Scenario: ${scenario?.description || 'Unknown'}\\n`) +
    chalk.white(`Duration: ${executionResult?.duration || 0}ms\\n`) +
    chalk.white(`Steps: ${executionResult?.steps?.length || 0}\\n`) +
    chalk.white(`Accessibility Score: ${analysis?.accessibilityScore || 0}%`),
    { padding: 1, borderColor: statusColor as any }
  ));

  // Step results
  if (executionResult?.steps?.length > 0) {
    console.log(chalk.yellow.bold('\\n📋 Step Results:'));
    executionResult.steps.forEach((step: any, index: number) => {
      const stepIcon = step.status === 'passed' ? '✅' : '❌';
      const stepColor = step.status === 'passed' ? 'green' : 'red';
      console.log(`${index + 1}. ${stepIcon} ${chalk[stepColor](step.stepId)} (${step.duration}ms)`);
      if (step.error) {
        console.log(`   ${chalk.red('Error:')} ${step.error}`);
      }
    });
  }

  // Analysis
  if (analysis) {
    console.log(chalk.blue.bold('\\n📊 Analysis:'));
    console.log(chalk.white(analysis.summary));
    
    if (analysis.issues?.length > 0) {
      console.log(chalk.red.bold('\\n⚠️  Issues:'));
      analysis.issues.forEach((issue: string, index: number) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }
    
    if (analysis.suggestions?.length > 0) {
      console.log(chalk.cyan.bold('\\n💡 Suggestions:'));
      analysis.suggestions.forEach((suggestion: string, index: number) => {
        console.log(`${index + 1}. ${suggestion}`);
      });
    }
  }

  console.log(chalk.gray(`\\n📁 Detailed results saved to: ${resultFile}`));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}