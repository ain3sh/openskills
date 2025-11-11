# OpenSkills Documentation

## User Documentation

- [Main README](../README.md) - Getting started and overview
- [Architecture](../ARCHITECTURE.md) - System design and implementation
- [Contributing](../CONTRIBUTING.md) - How to contribute
- [Security](../SECURITY.md) - Security model and best practices
- [Changelog](../CHANGELOG.md) - Version history

## Technical Documentation

### Core Concepts

- [Execution Architecture](technical/OPENSKILLS_V3_EXECUTION.md) - How the execution-first model works
- [Progressive Disclosure](technical/PROGRESSIVE_DISCLOSURE_OPTIMIZATION.md) - Token optimization strategy
- [Performance Analysis](technical/PERFORMANCE_OPTIMIZATION.md) - Performance characteristics

### API Reference

See inline JSDoc comments in source files:
- [`src/commands/`](../src/commands/) - CLI command implementations
- [`src/utils/`](../src/utils/) - Utility functions
- [`src/types.ts`](../src/types.ts) - TypeScript type definitions

## Skill Development

### Creating Skills

1. **Skill Structure** - See [README#creating-skills](../README.md#creating-skills)
2. **SKILL.md Format** - Frontmatter and content requirements
3. **Script Guidelines** - Writing executable scripts
4. **Testing Skills** - Using `openskills exec` for testing

### Example Skills

Browse the [Anthropic Skills Repository](https://github.com/anthropics/skills) for examples:
- `skill-creator` - Template for new skills
- `slack-gif-creator` - Complex skill with multiple scripts
- `mcp-builder` - Documentation-heavy skill

## Archives

Historical documentation for reference:
- [v2.1.0 Release Notes](archive/RELEASE_NOTES_v2.1.0.md) - Transclusion pattern introduction

## Resources

### External Links

- [Anthropic Skills Blog Post](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code/overview)
- [Anthropic Skills Repository](https://github.com/anthropics/skills)

### Community

- GitHub Issues: [Bug Reports & Features](https://github.com/ain3sh/openskills/issues)
- GitHub Discussions: [Questions & Ideas](https://github.com/ain3sh/openskills/discussions)

---

Need help? Start with the [README](../README.md) or open a [discussion](https://github.com/ain3sh/openskills/discussions).
