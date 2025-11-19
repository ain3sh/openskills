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

- 🚀 **Execution-First** - Skills run as isolated scripts via `openskills exec`
- 📦 **Universal** - Works with any AI agent that can run shell commands
- 🔄 **Progressive Disclosure** - Minimal metadata → execution context → full content
- 🎯 **Token Optimized** - ~70 tokens per skill in discovery mode
- 🛡️ **Secure** - Scripts run in isolated processes, no eval() or imports
- ⚡ **Fast** - <50ms discovery, ~50ms execution overhead

## Installation

### Quick Install (Recommended)

**Linux/macOS/WSL:**
```bash
curl -fsSL https://ain3sh.com/openskills/install.sh | bash
```

**Windows:**
Download from [releases](https://github.com/ain3sh/openskills/releases/latest) and add to PATH.

### Manual Install

Download the binary for your platform from [latest release](https://github.com/ain3sh/openskills/releases/latest):
- Linux: `openskills-linux-x64`
- macOS (Apple Silicon): `openskills-darwin-arm64`
- macOS (Intel): `openskills-darwin-x64`
- Windows: `openskills-win32-x64.exe`

Make executable and move to PATH:
```bash
chmod +x openskills-*
sudo mv openskills-* /usr/local/bin/openskills
```

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

# Install all skills from a repo (defaults to non-interactive)
openskills install anthropics/skills
```

### 2. Use in AGENTS.md

```bash
# Sync skills to AGENTS.md (defaults to transclusion and non-interactive)
openskills sync
```

Your AGENTS.md will include:
```markdown
## Skills

@.agent/SKILLS.md
```

### 3. Execute Skill Scripts

```bash
# Run a script from a skill
openskills exec slack-gif-creator templates/pulse.py

# Pass arguments (use -- separator)
openskills exec skill-creator scripts/init_skill.py -- my-skill --path /tmp
```

### 4. For AI Agents

```bash
# List available skills
openskills list

# Get execution context
openskills use slack-gif-creator

# Read full skill content (prompt)
openskills load slack-gif-creator
```

## Commands

### Core Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `openskills install <source>` | `install-skill` | Install skills from GitHub |
| `openskills list` | `list-skills` | List installed skills (~70 tokens/skill) |
| `openskills sync` | `sync-skills` | Update AGENTS.md with skills |
| `openskills exec <skill> <script>` | `execute-skill-script` | Execute a skill script |
| `openskills use <skill>` | `use-skill` | Get skill execution context (JSON) |
| `openskills load <skill>` | `load-skill` | Read full skill prompt |
| `openskills install-hooks` | - | Install agent hooks & aliases |

### Additional Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `openskills describe [skill]` | `describe-skill` | Get detailed skill metadata |
| `openskills suggest <query>` | `suggest-skill` | Find relevant skills for a query |
| `openskills manage` | - | Interactively remove skills |
| `openskills validate [skill]` | - | Validate skill references |
| `openskills generate-skills-md` | - | Generate .agent/SKILLS.md |
| `openskills export-slash <skill>` | - | Export skill as slash command |
| `openskills telemetry` | - | View usage statistics |

### Command Options

**Install:**
```bash
openskills install anthropics/skills/skill-name
  --global             # Install to ~/.agent/skills/
  --tui                # Interactive selection (default: installs all)
```

**Sync:**
```bash
openskills sync
  --no-transclusion    # Embed skills directly instead of referencing file
  --tui                # Interactive selection (default: syncs all)
```

**Use:**
```bash
openskills use skill-name
  --args <args>        # Optional arguments string for metadata
  --tui                # Interactive permission prompt (default: auto-approves)
```

**Load:**
```bash
openskills load skill-name
  --tui                # Interactive permission prompt (default: auto-approves)
```

**Install Hooks:**
```bash
# Install hooks and aliases for easy access
openskills install-hooks
  --agent <claude|droid>  # Target agent (default: claude)
  --manual                # Print config for manual install
  --global                # Install globally (default)
  --project               # Install to project settings
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
    ],
    "environment": { "SKILL_BASE": "/path/to/skill", "WORK_DIR": "/cwd" }
  }
}
```

### Level 3: Full Content
Complete SKILL.md with all instructions, examples, and documentation.

## Project Structure

```
your-project/
├── .agent/
│   ├── SKILLS.md              # Auto-generated skills list
│   └── skills/                # Project-specific skills
│       ├── slack-gif-creator/
│       └── skill-creator/
├── AGENTS.md                  # References @.agent/SKILLS.md
└── ...
```

Skills are discovered from these locations (priority order):
1. `./.agent/skills/` - Project (highest priority)
2. `./.claude/skills/` - Project Claude-specific
3. `~/.agent/skills/` - Global
4. `~/.claude/skills/` - Global Claude-specific
5. Built-in skills

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
  ```bash
  python {baseDir}/scripts/process.py --input <file>
  ```
```

### Key Principle

**Skills are tools to execute, not documentation to read.**

```bash
# ✅ CORRECT - Execute scripts directly
openskills exec my-skill scripts/process.py --input data.csv

# ❌ WRONG - Don't import as modules
import sys
sys.path.append('/path/to/skill')
from scripts import process  # NO!
```

Scripts run with environment variables:
- `SKILL_BASE` - Path to skill directory
- `WORK_DIR` - Current working directory

## AI Agent Integration

For AI agents using OpenSkills:

```python
import subprocess
import json

# 1. Discover skills
result = subprocess.run(['openskills', 'list'], capture_output=True)
skills = json.loads(result.stdout)

# 2. Get execution context when needed
result = subprocess.run([
    'openskills', 'use', 'slack-gif-creator'
], capture_output=True)
context = json.loads(result.stdout)

# 3. Execute script
script_usage = context['execution']['scripts'][0]['usage']
subprocess.run(script_usage, shell=True)
```

## Why Execution-First?

Traditional approaches treat skills as documentation that agents interpret. This causes agents to try importing skill code as libraries. OpenSkills solves this by making skills **explicitly executable**:

- **Security** - Process isolation prevents code injection
- **Clarity** - Clear boundary between skill and agent code
- **Simplicity** - No Python path management or dependency conflicts
- **Universal** - Works with any language (Python, Bash, Node.js)

## Performance

- Discovery: <50ms for typical skill sets
- Execution overhead: ~50ms per script
- Token usage: ~70 tokens per skill
- Build size: 115.67 KB

## Development

```bash
# Run tests
npm test

# Build
npm run build

# Type check
npm run typecheck
```

## Documentation

- [Architecture](ARCHITECTURE.md) - Technical deep dive
- [Contributing](CONTRIBUTING.md) - How to contribute
- [Changelog](CHANGELOG.md) - Version history

## License

MIT - see [LICENSE](LICENSE)

## Credits

Inspired by [Anthropic's Claude Skills](https://www.anthropic.com/news/skills) and their [engineering blog post](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).

Invaluable insights from [Claude Agent Skills: A First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) by Han Lee.

---

<div align="center">

**Skills are tools to execute, not documentation to read.**

[Report Bug](https://github.com/ain3sh/openskills/issues) • [Request Feature](https://github.com/ain3sh/openskills/issues)

</div>
