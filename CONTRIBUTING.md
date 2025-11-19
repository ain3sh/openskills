# Contributing to OpenSkills

Thank you for your interest in contributing to OpenSkills! We welcome contributions from the community.

## 🎯 Project Goals

OpenSkills aims to:
- Provide execution-first skills for AI coding agents
- Maintain parity with Anthropic's Claude Skills specification
- Work universally across all AI agents (Claude Code, Cursor, Windsurf, Aider, etc.)
- Optimize for minimal token usage through progressive disclosure

## 🚀 Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/ain3sh/openskills.git
   cd openskills
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## 📝 Development Guidelines

### Code Style

- **TypeScript**: Use strict mode, explicit types
- **Functional**: Prefer functional patterns over classes
- **Async/Await**: Use modern async patterns
- **Error Handling**: Always handle errors with meaningful messages

### Architecture Principles

1. **Execution-First**: Skills are executable scripts, not documentation
2. **Progressive Disclosure**: Minimize initial context, load details as needed
3. **Agent-Agnostic**: Don't assume specific agent capabilities
4. **Security**: Scripts run in isolated processes, never use eval()

### File Structure

```
src/
├── commands/        # CLI command implementations
├── utils/          # Shared utilities
├── types.ts        # TypeScript type definitions
└── cli.ts          # Main CLI entry point
```

## 🧪 Testing

- Write tests for new features
- Ensure existing tests pass
- Test with multiple skill types (simple, complex, with scripts)
- Verify token usage improvements

```bash
# Run all tests
npm test

# Run specific test
npm test -- --grep "progressive disclosure"

# Check coverage
npm run test:coverage
```

## 📦 Creating Skills

When contributing new skills:

1. Follow the SKILL.md format specification
2. Include clear frontmatter with name, description
3. Make scripts executable and standalone
4. Test execution via `openskills exec`
5. Document in skill's README

Example structure:
```
my-skill/
├── SKILL.md         # Required: Instructions and metadata
├── scripts/         # Executable scripts
├── references/      # Documentation (loaded on demand)
└── README.md        # Usage examples
```

## 🐛 Reporting Issues

Please use GitHub Issues to report bugs:

1. Check existing issues first
2. Include OpenSkills version (`openskills --version`)
3. Provide minimal reproduction steps
4. Include error messages and logs
5. Specify your environment (OS, Node version)

## 🔄 Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**
   - Follow code style guidelines
   - Update tests as needed
   - Update documentation

3. **Commit with clear messages**
   ```bash
   git commit -m "feat: add new feature
   
   - Detail what changed
   - Explain why it changed
   - Reference issue numbers"
   ```

4. **Push and create PR**
   - Fill out the PR template
   - Link related issues
   - Ensure CI passes

## 📚 Documentation

- Update README.md for user-facing changes
- Update ARCHITECTURE.md for technical changes
- Add JSDoc comments for public APIs
- Include examples for new features

## 🎓 Learning Resources

- [Anthropic's Skills Blog Post](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Claude Skills Documentation](https://docs.claude.com/en/docs/claude-code/overview)
- [Progressive Disclosure Pattern](./docs/technical/PROGRESSIVE_DISCLOSURE_OPTIMIZATION.md)
- [Execution Architecture](./docs/technical/OPENSKILLS_EXECUTION.md)

## 💬 Community

- **Discussions**: Use GitHub Discussions for questions
- **Discord**: [Join our Discord](https://discord.gg/openskills) (coming soon)
- **Twitter**: [@openskills](https://twitter.com/openskills) (coming soon)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make OpenSkills better! 🙏
