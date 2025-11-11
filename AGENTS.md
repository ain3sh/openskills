# 🎯 OpenSkills - Universal Skills Loader for AI Agents

## Project Overview

OpenSkills is a CLI tool that brings Anthropic's Claude Skills system to all AI coding agents (Cursor, Windsurf, Aider, Claude Code). It achieves ~85% parity with Claude Code's closed-source implementation while being fully open source and agent-agnostic.

## Core Architecture

- **Skills Discovery**: Multi-source loading from `.openskills/`, `.agent/`, `.claude/` directories
- **Progressive Disclosure**: Minimal metadata → Full SKILL.md → Bundled resources
- **Two Modes**: Direct injection (embed in AGENTS.md) or Transclusion (`@SKILLS.md` reference)
- **Format Parity**: Same SKILL.md format, frontmatter fields, and resource bundling as Claude Code

## Key Commands

```bash
# Install skills from GitHub
openskills install anthropics/skills

# List installed skills
openskills list

# Read skill (for AI agents)
openskills read <skill-name>

# Sync to AGENTS.md
openskills sync                    # Direct injection
openskills sync --transclusion     # @SKILLS.md reference

# Generate standalone SKILLS.md
openskills generate-skills-md
```

## Development Guidelines

### Code Style
- TypeScript strict mode
- Functional programming patterns preferred
- Comprehensive error handling with specific error codes
- Fast caching (60-second TTL) for performance

### Testing
```bash
npm test                    # Run all tests
npm test <file>            # Run specific test
npm run build              # Compile TypeScript
```

### Security Priorities
- Input validation on all user-provided data
- Safe regex patterns (bounded quantifiers)
- Permission system for skill execution
- No eval() or dynamic code execution

## Project Structure

```
src/
├── cli.ts                 # Main CLI entry point
├── commands/              # Individual command implementations
├── utils/                 # Shared utilities
└── types.ts              # TypeScript type definitions

tests/
├── transclusion.test.ts  # New transclusion feature tests
└── spec-compliance/      # Blog specification compliance tests
```

## Current Implementation Status

- ✅ Full SKILL.md parsing with YAML frontmatter
- ✅ Multi-source skill discovery with deduplication
- ✅ JSON outputs for headless agents
- ✅ Permission system (allow/deny/ask)
- ✅ Resource bundling (scripts/, references/, assets/)
- ✅ Transclusion support (@SKILLS.md pattern)
- ✅ GitHub marketplace installation
- ✅ Slash command export

## References

- Blog specification: `references/claude-skills-blog/blog-content-full.md`
- Implementation notes: `PHASE1-3-COMPLETE.md`
- Security analysis: `references/PARITY_ANALYSIS.md`

---

## Skills

@.agent/SKILLS.md
