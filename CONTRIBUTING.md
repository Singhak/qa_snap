# Contributing to QA Copilot

We welcome contributions to QA Copilot! To ensure a smooth and collaborative development process, please follow these guidelines.

## How to Contribute

1.  **Fork the repository.**
2.  **Clone your forked repository** to your local machine.
3.  **Create a new branch** for your feature or bug fix: `git checkout -b feature/your-feature-name` or `git checkout -b bugfix/issue-description`.
4.  **Make your changes.**
    - Ensure your code adheres to the project's coding style (ESLint and Prettier will be enforced).
    - Add JSDoc comments to complex functions.
    - Write unit and integration tests for new features or bug fixes.
    - Update documentation as necessary.
5.  **Commit your changes** with a clear and concise commit message. Follow Conventional Commits if possible (e.g., `feat: add new feature`, `fix: resolve bug`).
6.  **Push your branch** to your forked repository: `git push origin feature/your-feature-name`.
7.  **Open a Pull Request (PR)** to the `main` branch of the original repository.
    - Provide a clear description of your changes.
    - Reference any related issues.
    - Ensure all tests pass.

## Development Setup

Refer to the `README.md` for local setup instructions.

## Code Style

- We use ESLint for linting and Prettier for code formatting. Please ensure your code is formatted correctly before submitting a PR.
- JSDoc comments are encouraged for all functions, especially complex ones, to improve code readability and maintainability.

## Testing

- All new features and bug fixes should be accompanied by appropriate tests (unit, integration, E2E).
- Run tests locally before submitting a PR.

## Architecture Decision Records (ADRs)

For significant architectural decisions, please propose an Architecture Decision Record (ADR) in the `docs/adr` directory. This helps document the "why" behind major technical choices.

## Reporting Bugs

If you find a bug, please open an issue on GitHub. Provide a clear description, steps to reproduce, and expected behavior.

## Feature Requests

We welcome feature requests! Please open an issue on GitHub to suggest new features or improvements.

Thank you for contributing!
