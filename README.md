# OpenSkills

<div align="center">

**Execute skills, don't read them.**

[![Version](https://img.shields.io/npm/v/openskills.svg)](https://www.npmjs.com/package/openskills)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.6.0-brightgreen.svg)](package.json)

OpenSkills is an execution-first skills system for AI coding agents. Skills are executable toolkits containing scripts that agents run directly—not documentation to interpret.

[Installation](#installation) • [Quick Start](#quick-start) • [Commands](#commands) • [Creating Skills](#creating-skills) • [Architecture](#architecture)

</div>

---

## What is OpenSkills?

OpenSkills brings Anthropic's Claude Skills system to **all AI coding agents** (Claude Code, Cursor, Windsurf, Aider, Cline) with a fundamental improvement: **skills execute directly as scripts**, eliminating the confusion where agents try to import skill modules as Python packages instead of running them.

### Key Features

- 🚀 **Execution-First Architecture** - Skills run as isolated scripts via `openskills exec`
- 📦 **Universal Compatibility** - Works with any AI agent that can run shell commands
- 🔄 **Progressive Disclosure** - Minimal metadata → execution context → full content
- 🎯 **Token Optimized** - 70 tokens per skill in discovery (vs 125+ in other implementations)
- 🛡️ **Secure by Design** - Scripts run in isolated processes, no eval() or imports
- ⚡ **Fast** - <50ms discovery, ~50ms execution overhead

## Installation

### Via npm (Recommended)

```bash
npm install -g openskills
```

### From Source

```bash
git clone https://github.com/ain3sh/openskills
cd openskills
npm install
npm run build
npm link  # Makes 'openskills' available globally
```

## Quick Start

### 1. Install a Skill

```bash
# Install to project (.agent/skills/)
openskills install anthropics/skills/slack-gif-creator

# Install globally (~/.agent/skills/)
openskills install anthropics/skills/mcp-builder --global
```

### 2. Execute a Skill Script

```bash
# Run a script directly from a skill
openskills exec slack-gif-creator templates/pulse.py

# Pass arguments to scripts (use -- separator)
openskills exec skill-creator scripts/init_skill.py -- my-skill --path /tmp
```

### 3. For AI Agents

```bash
# List available skills (minimal metadata)
openskills list

# Get execution context for a skill
openskills invoke slack-gif-creator --format=execution
# Returns: { baseDir, scripts[], environment{} }

# Read full skill content (if needed)
openskills read slack-gif-creator
```

## Core Commands

### `openskills install`

Install skills from GitHub repositories.

```bash
# Install specific skill
openskills install anthropics/skills/skill-name

# Install all skills from a repo
openskills install anthropics/skills --yes

# Install globally
openskills install anthropics/skills/skill-name --global
```

### `openskills exec`

Execute scripts from installed skills.

```bash
# Execute a Python script
openskills exec skill-name scripts/process.py

# Execute with arguments (use -- separator)
openskills exec skill-name scripts/tool.py -- --input data.csv --output result.json

# Scripts run with environment variables:
# SKILL_BASE=/path/to/skill
# WORK_DIR=/current/directory
```

### `openskills invoke`

Get skill information in different formats.

```bash
# Get execution context (for agents)
openskills invoke skill-name --format=execution

# Get basic metadata
openskills invoke skill-name --format=json

# Get as prompt (default)
openskills invoke skill-name
```

### `openskills list`

List discovered skills with minimal metadata.

```bash
openskills list
# Output: Simple "name": description format
# Uses only ~70 tokens per skill
```

### `openskills sync`

Update AGENTS.md with installed skills.

```bash
# Direct injection
openskills sync

# Using transclusion pattern (recommended)
openskills sync --transclusion
# Adds: @SKILLS.md reference instead of embedding
```

## Progressive Disclosure

OpenSkills implements three levels of information disclosure to prevent context bloat:

### Level 1: Discovery (~70 tokens/skill)
```
"slack-gif-creator": Toolkit for creating animated GIFs optimized for Slack
```
Only name and description—no paths, no instructions.

### Level 2: Execution Context (~500 tokens)
```json
{
  "skill": { "name": "slack-gif-creator", "baseDir": "/path/to/skill" },
  "execution": {
    "scripts": [
      { "path": "templates/pulse.py", "usage": "python /path/to/skill/templates/pulse.py" }
    ],
    "environment": { "SKILL_BASE": "/path/to/skill" }
  }
}
```

### Level 3: Full Content (as needed)
Complete SKILL.md with all instructions, examples, and documentation.

## Creating Skills

Skills follow Anthropic's SKILL.md format with executable scripts:

```
my-skill/
├── SKILL.md          # Instructions and metadata (required)
├── scripts/          # Executable scripts
│   ├── process.py    # Python script
│   └── validate.sh   # Bash script
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

- `scripts/validate.sh` - Validation script
  ```bash
  bash {baseDir}/scripts/validate.sh <file>
  ```
```

### Writing Executable Scripts

Scripts must be **standalone executables**, not modules to import:

```python
#!/usr/bin/env python3
"""Process data files.
This docstring becomes the script description.
"""

import argparse
import os

def main():
    # Access skill directory via environment
    skill_base = os.environ.get('SKILL_BASE', '.')
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    args = parser.parse_args()
    
    # Process the file
    print(f"Processing {args.input}")

if __name__ == '__main__':
    main()
```

## For AI Agents

### Integration Pattern

```python
# 1. Discover available skills (Level 1)
result = subprocess.run(['openskills', 'list'], capture_output=True)
skills = json.loads(result.stdout)

# 2. User requests a task matching a skill
if user_wants_gif:
    # Get execution context (Level 2)
    result = subprocess.run(
        ['openskills', 'invoke', 'slack-gif-creator', '--format=execution'],
        capture_output=True
    )
    context = json.loads(result.stdout)
    
    # 3. Execute the appropriate script
    script_path = context['execution']['scripts'][0]['usage']
    subprocess.run(script_path, shell=True)
```

### Key Principle

**Skills are tools to execute, not documentation to read.**

```bash
# ✅ CORRECT - Execute scripts directly
python /path/to/skill/scripts/create_gif.py --emoji "🎉"

# ❌ WRONG - Don't import as modules
import sys
sys.path.append('/path/to/skill')
from templates import create_animation  # NO!
```

## Architecture

### Skill Discovery Paths

Skills are discovered from these locations (in priority order):

1. `./.agent/skills/` - Project-level (highest priority)
2. `./.claude/skills/` - Project Claude-specific  
3. `~/.agent/skills/` - Global user skills
4. `~/.claude/skills/` - Global Claude-specific
5. Built-in skills

### Why Execution-First?

Traditional approaches treat skills as documentation that agents interpret. This leads to confusion where agents try to import skill code as libraries. OpenSkills solves this by making skills **explicitly executable**:

- **Security**: Process isolation prevents code injection
- **Clarity**: Clear boundary between skill and agent code
- **Simplicity**: No Python path management or dependency conflicts
- **Universal**: Works with any language (Python, Bash, Node.js)

## Performance

- **Discovery**: <50ms for typical skill sets
- **Execution Overhead**: ~50ms to spawn process
- **Token Usage**: ~70 tokens per skill (vs 125+ traditional)
- **Scalability**: Handles 80+ skills within 15KB token budget
- **Build Size**: 116KB minified

## Comparison

| Feature | Claude Code | OpenSkills |
|---------|-------------|------------|
| Skill Format | SKILL.md | SKILL.md ✅ |
| Discovery | Automatic | Automatic ✅ |
| Execution | Internal Skill tool | `openskills exec` command |
| Progressive Disclosure | 3 levels | 3 levels ✅ |
| Token Efficiency | ~15KB for 80 skills | ~15KB for 83 skills ✅ |
| Agent Support | Claude only | Any agent ✅ |
| Default Location | `.claude/skills` | `.agent/skills` |
| Architecture | Prompt injection | Script execution |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

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
- [Security](SECURITY.md) - Security considerations

### Technical Docs
- [Progressive Disclosure](docs/technical/PROGRESSIVE_DISCLOSURE_OPTIMIZATION.md)
- [Execution Architecture](docs/technical/OPENSKILLS_V3_EXECUTION.md)
- [Performance Analysis](docs/technical/PERFORMANCE_OPTIMIZATION.md)

## License

MIT - see [LICENSE](LICENSE)

## Credits

Inspired by [Anthropic's Claude Skills](https://www.anthropic.com/news/skills) and their [engineering blog post](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).
Forked from [numman-ali/openskills](https://github.com/numman-ali/openskills), with improvements based on ["Claude Agent Skills: A First Principles Deep Dive"](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/).

---

<div align="center">

**Remember**: Skills are tools to execute, not documentation to read. That's the OpenSkills way.

[Report Bug](https://github.com/ain3sh/openskills/issues) • [Request Feature](https://github.com/ain3sh/openskills/issues) • [Discussions](https://github.com/ain3sh/openskills/discussions)

</div>
