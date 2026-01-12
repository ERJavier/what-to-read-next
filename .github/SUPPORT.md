# Support

Thank you for using WhatToRead! This document provides resources for getting help and support.

## 📚 Documentation

Before asking for help, please check our documentation:
- [Setup Guide](../docs/SETUP.md) - Getting started with development
- [Architecture](../docs/ARCHITECTURE.md) - System architecture overview
- [API Documentation](../docs/API.md) - API endpoints reference
- [ETL Pipeline](../docs/ETL.md) - Data ingestion pipeline
- [Contributing Guide](../docs/CONTRIBUTING.md) - How to contribute

## 🐛 Reporting Bugs

Found a bug? Please create an issue using our [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md).

Before reporting:
1. Check if the bug has already been reported
2. Make sure you're using the latest version
3. Include steps to reproduce, expected vs actual behavior, and environment details

## 💡 Feature Requests

Have an idea for a new feature? Use our [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md).

## ❓ Questions & Discussions

- **General Questions**: Use [GitHub Discussions](https://github.com/ERJavier/what-to-read-next/discussions)
- **Implementation Questions**: Comment on the relevant issue or open a discussion
- **Quick Questions**: Check our [FAQ](#faq) below

## 🤝 Contributing

Want to help improve WhatToRead? Check out:
- [Contributing Guide](../docs/CONTRIBUTING.md)
- [Community-Friendly Issues](.github/COMMUNITY_ISSUES.md)
- [Good First Issues](.github/COMMUNITY_ISSUES.md#-good-first-issues)

## 🔒 Security Issues

If you discover a security vulnerability, please do NOT open a public issue. Instead:
- Report it via [GitHub Security Advisories](https://github.com/ERJavier/what-to-read-next/security/advisories/new)
- Or email the maintainers directly

## 📊 Status

- **Project Status**: Active Development
- **Current Version**: See [package.json](../frontend/package.json) or [requirements.txt](../requirements.txt)
- **Supported Versions**: See individual component requirements

## 🆘 Getting Help

1. **Check Documentation**: Start with the docs listed above
2. **Search Issues**: Check if your question has been answered
3. **Search Discussions**: Look through existing discussions
4. **Ask the Community**: Open a new discussion
5. **Create an Issue**: For bugs or feature requests

## FAQ

### Common Setup Issues

**Q: I'm getting a database connection error**
A: Make sure PostgreSQL is running and pgvector extension is installed. See [SETUP.md](../docs/SETUP.md).

**Q: The frontend won't start**
A: Check that Node.js version matches requirements and all dependencies are installed. Try `pnpm install` in the frontend directory.

**Q: ETL pipeline is slow**
A: This is expected for large datasets. Consider processing a subset first. See [ETL.md](../docs/ETL.md) for optimization tips.

### Development Questions

**Q: How do I run tests?**
A: See the [Contributing Guide](../docs/CONTRIBUTING.md) for testing instructions.

**Q: How do I add a new feature?**
A: Follow the [Contributing Guide](../docs/CONTRIBUTING.md), create a feature branch, and submit a PR.

**Q: Where should I start if I want to contribute?**
A: Check [COMMUNITY_ISSUES.md](.github/COMMUNITY_ISSUES.md) for good first issues.

## 📧 Contact

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and discussions
- **Maintainers**: Contact via GitHub (@ERJavier)

---

**Remember**: Be respectful and patient. We're all volunteers working to make WhatToRead better!
