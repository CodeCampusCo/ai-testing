# API Reference Guide

## Overview

This document provides a high-level overview of the primary components and APIs within the AI-Powered E2E Test Framework.

## 1. CLI Commands

The framework is operated through the `ai-e2e-test` command-line interface.

### 1.1 `ai-e2e-test generate`

**Alias:** `g`

Generates a structured test scenario from a natural language description.

- **Input:** A text description (`-i`) or a file path (`-f`).
- **Output:** A JSON `TestScenario` file (`-o`).
- **Key Options:** `--interactive` for guided input, `--provider` and `--model` to specify the AI, `-v` for verbose logging.

### 1.2 `ai-e2e-test run`

**Alias:** `r`

Executes a test workflow. It can either generate a scenario from a description first or run an existing test file from a project.

- **Input:** A text description (`-i`) or a project (`-p`) and test file (`-f`).
- **Output:** A JSON result file in the specified output directory (`-o`).
- **Key Options:** `--no-headless` to watch the browser, `--no-clean-state` to preserve browser sessions, `-v` for verbose logging.

## 2. Core Architecture Components

### 2.1 `LangGraphWorkflow`

The central orchestrator of the framework. It manages the state and directs the flow of execution between different AI agents in a graph-based structure. It is responsible for the entire lifecycle of a test run, from parsing input to generating the final analysis.

### 2.2 `LangChainAIService`

A unified, centralized service that handles all communication with external Large Language Models (LLMs) like OpenAI, Anthropic, and Google. All agents use this single service, ensuring consistency, stability, and proper initialization for all AI-powered logic.

### 2.3 `PlaywrightMCPClient`

A client responsible for managing the `@playwright/mcp` server process and sending browser automation commands to it. The `TestExecutorAgent` uses this client to perform actions on the web page.

## 3. AI Agents (Workflow Nodes)

The agents are the "brains" of the framework, each performing a specialized task as a node within the `LangGraphWorkflow`.

### 3.1 `ScenarioGeneratorAgent`

- **Input:** A natural language description of a test.
- **Process:** Uses the `LangChainAIService` to convert the description into a structured `TestScenario` object, including metadata, steps, and expected outcomes.
- **Output:** A `TestScenario` object.

### 3.2 `TestExecutorAgent`

- **Input:** A `TestScenario` object, specifically the `rawSteps` and `rawOutcomes`.
- **Process:** Implements the "Pure AI-First" execution model. For each natural language step, it captures the current state of the web page (via an accessibility snapshot) and asks the `LangChainAIService` to generate the appropriate MCP browser commands. It then executes these commands.
- **Output:** A `TestResult` object containing the status of each step, duration, screenshots, and other execution data.

### 3.3 `AnalysisAgent`

- **Input:** A `TestScenario` and the corresponding `TestResult`.
- **Process:** Uses the `LangChainAIService` to analyze the test results, providing a summary, a list of issues, and actionable suggestions.
- **Output:** A `TestAnalysis` object.
