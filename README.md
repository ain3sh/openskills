# OpenSkills

<div align="center">

**Execute skills, don't read them.**

[![Version](https://img.shields.io/github/release/ain3sh/openskills.svg)](https://github.com/ain3sh/openskills/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.6.0-brightgreen.svg)](package.json)

A universal CLI for managing and executing AI agent skills. Skills are executable toolkits with scripts that agents run directly—not documentation to interpret.

[Installation](#installation) • [Quick Start](#quick-start) • [Commands](#commands) • [Creating Skills](#creating-skills)

</div>

---

## What is OpenSkills?

OpenSkills is a CLI tool for managing skills for AI coding agents (Claude Code, Factory Droid, Cursor, Windsurf, Aider, Cline). It uses an **execution-first architecture** where skills contain scripts that run in isolated processes, eliminating the confusion where agents try to import skill code as Python packages.

### Key Features

- **Execution-First** - Skills run as isolated scripts via `openskills exec`
- **Agent-First** - Non-interactive by default, `--tui` for human interaction
- **Universal** - Works with any AI agent that can run shell commands
- **Progressive Disclosure** - Minimal metadata → execution context → full content
- **Token Optimized** - ~70 tokens per skill in discovery mode
- **Secure** - Scripts run in isolated processes, no eval() or imports

## Installation

### Quick Install (Recommended)

**Linux/macOS/WSL:**
```bash
curl -fsSL https://ain3sh.com/openskills/install.sh | bash
```

**Windows:**
Download from [releases](https://github.com/ain3sh/openskills/releases/latest) and add to PATH.

### From Source

```bash
git clone https://github.com/ain3sh/openskills
cd openskills
npm install
npm run build
npm link
```

## Quick Start

### 1. Install Skills

```bash
# Install to project (.agent/skills/)
openskills install anthropics/skills/slack-gif-creator

# Install globally (~/.agent/skills/)
openskills install anthropics/skills/mcp-builder --global

# Interactive selection
openskills install anthropics/skills --tui
```

### 2. Sync to AGENTS.md

```bash
# Creates .agent/SKILLS.md and adds reference to AGENTS.md (default)
openskills sync

# Embed directly in AGENTS.md instead
openskills sync --direct

# Interactive skill selection
openskills sync --tui
```

### 3. Execute Skill Scripts

```bash
# Run a script from a skill
openskills exec slack-gif-creator templates/pulse.py

# Pass arguments
openskills exec skill-creator scripts/init_skill.py -- my-skill --path /tmp
```

### 4. For AI Agents

```bash
# List available skills (~70 tokens/skill)
openskills list

# Get execution context (JSON)
openskills use slack-gif-creator

# Read full skill prompt
openskills load slack-gif-creator
```

## Commands

| Command | Description |
|---------|-------------|
| `openskills install <source>` | Install skills from GitHub |
| `openskills list` | List installed skills (enabled plugins only) |
| `openskills sync` | Update AGENTS.md with skills (transclusion by default) |
| `openskills exec <skill> <script>` | Execute a skill script |
| `openskills use <skill>` | Get skill execution context (JSON) |
| `openskills load <skill>` | Read full skill prompt |
| `openskills describe [skill]` | Get detailed skill metadata |
| `openskills suggest <query>` | Find relevant skills for a query |
| `openskills manage` | Interactively remove skills |
| `openskills validate [skill]` | Validate skill references |
| `openskills generate-skills-md` | Generate .agent/SKILLS.md |
| `openskills export-slash <skill>` | Export skill as slash command |
| `openskills install-hooks` | Install agent hooks |
| `openskills telemetry` | View usage statistics |

### Common Options

```bash
--tui          # Enable interactive mode (default: non-interactive)
--global       # Install to ~/.agent/skills/ instead of project
--direct       # Embed in AGENTS.md instead of transclusion (sync only)
```

## Progressive Disclosure

OpenSkills implements three levels of information disclosure:

### Level 1: Discovery (~70 tokens/skill)
```json
{
  "slack-gif-creator": "Toolkit for creating animated GIFs optimized for Slack"
}
```

### Level 2: Execution Context (~500 tokens)
```json
{
  "skill": { "name": "slack-gif-creator", "baseDir": "/path/to/skill" },
  "execution": {
    "scripts": [
      { "path": "templates/pulse.py", "usage": "python /path/.../pulse.py" }
    ]
  }
}
```

### Level 3: Full Content
Complete SKILL.md with all instructions, examples, and documentation.

## Creating Skills

Skills follow Anthropic's SKILL.md format with executable scripts:

```
my-skill/
├── SKILL.md          # Instructions and metadata (required)
├── scripts/          # Executable scripts
│   ├── process.py
│   └── validate.sh
├── references/       # Documentation (loaded on demand)
└── assets/           # Static resources
```

### Basic SKILL.md

```markdown
---
name: my-skill
description: What this skill does and when to use it
version: 1.0.0
---

# My Skill

## Instructions

This skill processes data files...

## Scripts

- `scripts/process.py` - Main processing script
```

See [docs/creating-skills.md](docs/creating-skills.md) for the complete guide.

## Project Structure

```
src/
├── cli.ts              # Entry point
├── types.ts            # Shared types
├── commands/           # CLI command handlers
├── skill/              # Core skill logic (discovery, validation, etc.)
├── agent/              # Agent platform integration
├── config/             # Configuration and paths
├── marketplace/        # External skill sources (GitHub)
└── telemetry/          # Usage tracking
```

## Development

```bash
npm install        # Install dependencies
npm run build      # Build
npm run typecheck  # Type check
npm test           # Run tests (147 tests)
```

## Documentation

- [Architecture](docs/architecture.md) - Technical deep dive
- [Creating Skills](docs/creating-skills.md) - Skill authoring guide
- [Contributing](CONTRIBUTING.md) - How to contribute
- [Changelog](CHANGELOG.md) - Version history

## License

MIT - see [LICENSE](LICENSE)

## Credits

Inspired by [Anthropic's Claude Skills](https://www.anthropic.com/news/skills) and the official [Claude Code Skills spec](https://code.claude.com/docs/en/skills.md).

---

<div align="center">

**Skills are tools to execute, not documentation to read.**

[Report Bug](https://github.com/ain3sh/openskills/issues) • [Request Feature](https://github.com/ain3sh/openskills/issues)

</div>
