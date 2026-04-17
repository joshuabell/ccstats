# Contributing to ccstats

Thanks for your interest in contributing! This guide will help you get started.

## How to Contribute

### Reporting Bugs

1. Check [existing issues](../../issues) to avoid duplicates
2. Open a new issue using the **Bug Report** template
3. Include steps to reproduce, expected vs actual behavior, and your environment

### Suggesting Features

1. Check [existing issues](../../issues) for similar requests
2. Open a new issue using the **Feature Request** template
3. Describe the use case and why it would be valuable

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch from `main`: `git checkout -b my-feature`
3. Make your changes
4. Run linting: `npm run lint`
5. Run tests: `npm test`
6. Commit with a clear message describing your change
7. Push to your fork and open a Pull Request

## Development Setup

```bash
git clone https://github.com/YOUR_USERNAME/ccstats.git
cd ccstats
npm install
```

### Local Testing

```bash
# Serve the dashboard locally
npx http-server . -p 3000

# Run linting
npm run lint

# Run tests
npm test
```

## Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting. Run `npm run lint` before committing to ensure your code matches the project style.

Key conventions:
- 2-space indentation
- 120 character line width
- No unused variables or imports

## Commit Messages

Write clear, concise commit messages that describe what changed and why. For example:

- `Add weekly stats breakdown to dashboard`
- `Fix streak calculation for days with no usage`
- `Update ccusage dependency to v16`

## Pull Request Guidelines

- Keep PRs focused on a single change
- Update documentation if your change affects user-facing behavior
- Ensure all CI checks pass (lint + tests)
- Link any related issues in the PR description

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
