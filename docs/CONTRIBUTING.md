# Contributing to WhatToRead

Thank you for your interest in contributing to WhatToRead! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/ERJavier/what-to-read-next/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs. actual behavior
   - Environment details (OS, Python version, etc.)
   - Relevant logs or error messages

### Suggesting Features

1. Check existing feature requests
2. Open a new issue with:
   - Clear description of the feature
   - Use case and motivation
   - Proposed implementation (if you have ideas)

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**:
   - Follow the coding style (see below)
   - Add tests if applicable
   - Update documentation
4. **Commit your changes**:
   ```bash
   git commit -m "Add: descriptive commit message"
   ```
   Use conventional commit messages:
   - `Add:` for new features
   - `Fix:` for bug fixes
   - `Update:` for updates to existing features
   - `Docs:` for documentation changes
   - `Refactor:` for code refactoring
5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request**:
   - Provide a clear description
   - Reference related issues
   - Request review from maintainers

## Development Setup

See [SETUP.md](SETUP.md) for detailed setup instructions.

Quick start:

```bash
# Clone your fork
git clone https://github.com/ERJavier/what-to-read-next.git
cd what-to-read-next

# Add upstream remote
git remote add upstream https://github.com/erjavier/what-to-read-next.git

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Development dependencies
```

## Coding Standards

### Python Style Guide

- Follow [PEP 8](https://pep8.org/)
- Use type hints where appropriate
- Maximum line length: 100 characters
- Use meaningful variable and function names
- Add docstrings to functions and classes

### Code Formatting

We use `black` for code formatting and `ruff` for linting:

```bash
# Format code
black .

# Lint code
ruff check .
```

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for meaningful test coverage

Run tests:

```bash
pytest
```

### Documentation

- Update relevant documentation when adding features
- Add docstrings to new functions/classes
- Update API documentation if endpoints change

## Project Structure

```
what-to-read-next/
├── api/              # FastAPI application
├── etl/              # Data ingestion pipeline
├── scripts/          # Utility scripts
├── tests/            # Test files
├── docs/             # Documentation
├── requirements.txt  # Production dependencies
└── README.md         # Project overview
```

## Areas for Contribution

### High Priority

- Database schema improvements
- ETL pipeline optimization
- API endpoint enhancements
- Frontend development
- Documentation improvements

### Medium Priority

- Test coverage
- Performance optimization
- Error handling improvements
- Monitoring and logging

### Low Priority

- UI/UX improvements
- Additional features
- Code refactoring

## Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged
4. Thank you for contributing!

## Questions?

- Open an issue for questions
- Check existing documentation
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.

Thank you for helping make WhatToRead better! 🎉

