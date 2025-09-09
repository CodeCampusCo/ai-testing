# Project Brief: AI-Powered E2E Test Framework

## 1. Overview

This project is an intelligent end-to-end (E2E) testing framework that leverages AI to translate human-readable test scenarios into automated browser actions. It is built on Node.js and uses Playwright MCP for browser control.

The core innovation is its "AI-First" execution model: for each step in a test file, the AI analyzes the current state of the web page and generates the precise browser commands needed to perform the action, enabling highly flexible and resilient test automation.

## 2. Project Goal

The primary goal is to create a versatile E2E testing solution that improves test reliability and provides deep, AI-powered insights into test runs, going beyond simple pass/fail results. It aims to support automated workflows in CI/CD pipelines as well as interactive use for developers.

## 3. Target Audience

- **Developers and QA Engineers** who need to run E2E tests from markdown files.
- **DevOps Engineers** who need to integrate reliable E2E tests into their CI/CD pipelines.

## 4. Core Features

- **AI-First Execution**: Translates natural language steps from `.md` files into browser actions in real-time.
- **LangGraph Orchestration**: A robust, stateful workflow engine manages the entire test lifecycle.
- **Intelligent Analysis**: An AI agent analyzes test results to provide summaries, identify root causes of failures, and suggest actionable improvements.
- **Multi-Provider AI**: Supports OpenAI, Anthropic, and Google models.
- **Dynamic MCP Integration**: Leverages Playwright for browser automation.
