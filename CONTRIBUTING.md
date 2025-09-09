# Contributing to the AI-Powered E2E Test Framework

First off, thank you for considering contributing! We welcome any contributions that improve the project, from fixing bugs to proposing new features.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

If you find a bug, please open an issue on our GitHub repository. Make sure to include:

- A clear and descriptive title.
- A detailed description of the problem, including steps to reproduce it.
- The expected behavior and what actually happened.
- Your environment details (OS, Node.js version, etc.).

### Suggesting Enhancements

If you have an idea for a new feature or an improvement to an existing one, please open an issue to discuss it. This allows us to coordinate our efforts and prevent duplicated work.

### Pull Requests

We welcome pull requests! Here's how to submit one:

1.  **Fork the repository** and create your branch from `main`.
2.  **Set up your development environment**:

    ```bash
    # Clone your fork
    git clone https://github.com/YOUR_USERNAME/ai-testing.git
    cd ai-testing

    # Install dependencies
    npm install

    # Build the project
    npm run build
    ```

3.  **Make your changes**. Please adhere to the coding style and conventions used in the project.
4.  **Add or update tests**. Make sure to add tests for any new features or bug fixes. Run the test suite to ensure everything is passing:
    ```bash
    npm test
    ```
5.  **Update the documentation**. If your changes affect the documentation, please update it accordingly.
6.  **Ensure your code lints**:
    ```bash
    npm run lint
    ```
7.  **Submit your pull request**. Make sure to link any relevant issues in your PR description.

## Development Workflow

- **Branching**: Create a new branch for each feature or bug fix (e.g., `feat/add-new-reporter`, `fix/cli-parsing-error`).
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/) for your commit messages. This helps us automate releases and generate changelogs.
- **Code Style**: We use Prettier for code formatting. Please run `npm run format` before committing your changes.

Thank you for your contribution!
