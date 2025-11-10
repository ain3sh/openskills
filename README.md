# OpenSkills

[![npm version](https://img.shields.io/npm/v/openskills.svg)](https://www.npmjs.com/package/openskills)
[![npm downloads](https://img.shields.io/npm/dm/openskills.svg)](https://www.npmjs.com/package/openskills)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Universal skills loader for AI coding agents** — brings Anthropic's Claude Skills system to any agent (Cursor, Windsurf, Aider, etc.) with complete parity to Claude Code's implementation.

## 🚀 Quick Install

**Option A — Binary (no Node.js required):**
```bash
curl -fsSL https://ain3sh.com/openskills/install.sh | bash
```

**Option B — npm:**
```bash
npm i -g openskills
```

---

## What Is This?

OpenSkills implements [Anthropic's Agent Skills specification](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) as a universal CLI tool, enabling **any AI coding agent** to use the same skill system as Claude Code.

### Key Features

✅ **100% Format Compatibility** — Same SKILL.md format, same `<available_skills>` XML, same progressive disclosure  
✅ **Universal Agent Support** — Works with Claude Code, Cursor, Windsurf, Aider, and any agent with CLI access  
✅ **GitHub Skill Marketplace** — Install from [anthropics/skills](https://github.com/anthropics/skills) or any GitHub repo  
✅ **Same Folder Structure** — Uses `.openskills/skills/` by default (also reads `.agent/skills/` and `.claude/skills/` for compatibility)  
✅ **Bundled Resources** — Full support for `scripts/`, `references/`, and `assets/` directories  
✅ **Zero Dependencies** — Single binary executable or npm package  

### For Claude Code Users

- Install skills from **any GitHub repo**, not just the Anthropic marketplace
- Share skills across multiple agents
- Version control your skills in your project repository

### For Other Agent Users (Cursor, Windsurf, Aider)

- Get Claude Code's skills system in your agent
- Access Anthropic's skill marketplace via GitHub
- Use progressive disclosure to keep context clean

---

## How It Works

### The Skills Architecture

Both Claude Code and OpenSkills use the same **progressive disclosure pattern**:

1. **System Prompt** lists available skills in `<available_skills>` XML
2. **Agent sees** skill names and descriptions (lightweight)
3. **When needed**, agent invokes skill by name
4. **Full instructions** load into context
5. **Agent follows** detailed instructions to complete task

**The only difference:** Claude Code uses `Skill("name")` tool, OpenSkills uses `openskills read name` CLI command.

### Format Example

**In AGENTS.md (or Claude's system prompt):**
```xml
<available_skills>
<skill>
<name>pdf</name>
<description>PDF manipulation toolkit for extracting text, creating documents, merging/splitting files...</description>
<location>project</location>
</skill>
</available_skills>
```

**When invoked, SKILL.md loads:**
```markdown
---
name: pdf
description: PDF manipulation toolkit...
allowed-tools: Bash, Read, Edit
---

# PDF Skill Instructions

When the user asks you to work with PDFs, follow these steps:

1. Install dependencies: `pip install pypdf2`
2. For text extraction, use the script in scripts/extract_text.py
3. Base directory for bundled resources: {baseDir}
...
```

### Side-by-Side Comparison

| Feature | Claude Code | OpenSkills |
|---------|-------------|------------|
| **Format** | SKILL.md (YAML + Markdown) | SKILL.md (YAML + Markdown) ✅ |
| **Invocation** | `Skill("name")` tool | `openskills read name` CLI |
| **Folder** | `.claude/skills/` | `.openskills/skills/` (reads `.claude/skills/` too) ✅ |
| **Discovery** | `<available_skills>` XML | `<available_skills>` XML ✅ |
| **Marketplace** | Built-in | GitHub (anthropics/skills) |
| **Resources** | `scripts/`, `references/`, `assets/` | `scripts/`, `references/`, `assets/` ✅ |
| **Agent Support** | Claude Code only | Claude Code + Cursor + Windsurf + Aider ✅ |

**Everything is identical except the invocation method.**

---

## Quick Start

### 1. Install OpenSkills

```bash
# Binary (recommended - no Node.js required)
curl -fsSL https://ain3sh.com/openskills/install.sh | bash

# Or via npm
npm i -g openskills
```

### 2. Install Skills

```bash
# From Anthropic's marketplace (interactive selection)
openskills install anthropics/skills

# Or from any GitHub repo
openskills install your-org/custom-skills
```

Interactive TUI lets you select which skills to install:
```
◉ pdf - PDF manipulation toolkit
◯ xlsx - Spreadsheet creation and editing
◉ docx - Document creation with tracked changes
◯ pptx - Presentation creation
```

### 3. Sync to AGENTS.md

```bash
openskills sync
```

This updates your `AGENTS.md` with the `<available_skills>` block. Done! Your agent can now discover and use skills.

---

## Commands

### Installation & Management

```bash
# Install skills (interactive TUI)
openskills install <github-repo>
openskills install <github-repo> --global  # Install to ~/.openskills/skills
openskills install <github-repo> --universal  # Install to .agent/skills (advanced)

# List installed skills
openskills list

# Remove skills (interactive TUI)
openskills manage
openskills remove <skill-name>  # Non-interactive removal
```

### Agent Usage

```bash
# Load skill for agent (outputs SKILL.md content)
openskills read <skill-name>

# Suggest skills based on query (semantic search)
openskills suggest "work with spreadsheets"

# Sync AGENTS.md with installed skills
openskills sync

# Generate standalone SKILLS.md (for transclusion)
openskills generate-skills-md

# Use transclusion mode (@SKILLS.md reference)
openskills sync --transclusion
```

### Transclusion Mode (New!)

Instead of embedding skills directly in AGENTS.md, you can use transclusion:

```bash
# Generate SKILLS.md separately
openskills generate-skills-md --format xml

# Or use sync with transclusion mode
openskills sync --transclusion
```

This adds `@SKILLS.md` to AGENTS.md instead of embedding the XML directly:

```markdown
# AGENTS.md
[... your content ...]

## Skills

@SKILLS.md
```

**Benefits:**
- Cleaner AGENTS.md file
- SKILLS.md can be gitignored if desired  
- Dynamic updates without modifying AGENTS.md
- Supports multiple patterns: `@SKILLS.md`, `@include: SKILLS.md`, `<!-- @include: SKILLS.md -->`

**Note:** Transclusion requires agent support for the `@filename` pattern, which is not standard markdown.

### Utilities

```bash
# Validate skill format
openskills validate <skill-name>

# View telemetry stats
openskills telemetry --stats

# Interactive shell
openskills tui
```

---

## Installation Modes

### Default: Project Install

```bash
openskills install anthropics/skills
# → Installs to ./.openskills/skills/ (gitignored)
```

**Best for:** Project-specific skills, no conflict with Claude Code

### Global Install

```bash
openskills install anthropics/skills --global
# → Installs to ~/.openskills/skills/ (shared across projects)
```

**Best for:** Personal skill library, CLI usage

### Universal Install (Advanced)

```bash
openskills install anthropics/skills --universal
# → Installs to ./.agent/skills/
```

**Best for:** Multi-agent setups where you use Claude Code + other agents with one AGENTS.md

**Why?** Prevents duplicate skill listings when Claude Code shows its native marketplace plugins alongside AGENTS.md skills.

**Search Priority:**
1. `./.openskills/skills/` (project - default)
2. `./.agent/skills/` (project universal)
3. `~/.openskills/skills/` (global - default)
4. `~/.agent/skills/` (global universal)
5. `./.claude/skills/` (project Claude - compatibility)
6. `~/.claude/skills/` (global Claude - compatibility)

Skills with the same name only appear once (highest priority wins).

---

## Creating Custom Skills

### Minimal Skill

```
my-skill/
└── SKILL.md
```

**SKILL.md:**
```markdown
---
name: my-skill
description: What this skill does and when to use it
---

# Instructions

When the user asks you to [task], follow these steps:

1. [Step 1]
2. [Step 2]
...
```

### Skill with Resources

```
my-skill/
├── SKILL.md
├── scripts/
│   └── process.py
├── references/
│   └── api-docs.md
└── assets/
    └── template.json
```

Reference resources in SKILL.md using `{baseDir}`:
```markdown
1. Read the API docs in {baseDir}/references/api-docs.md
2. Run {baseDir}/scripts/process.py
3. Use template from {baseDir}/assets/template.json
```

### Publishing

1. Create GitHub repo: `your-username/my-skill`
2. Add SKILL.md (and optional resources)
3. Users install with: `openskills install your-username/my-skill`

### Best Practices

- **Use Anthropic's skill-creator** for comprehensive authoring guidance:
  ```bash
  openskills install anthropics/skills
  openskills read skill-creator
  ```
- Write descriptions that help agents decide when to use the skill
- Use imperative language in instructions ("Do X", not "You can do X")
- Test with multiple agents to ensure clarity
- Include example usage when helpful

---

## Popular Skills from Anthropic's Marketplace

Browse the full collection at [github.com/anthropics/skills](https://github.com/anthropics/skills):

- **xlsx** — Spreadsheet creation, editing, formulas, data analysis
- **docx** — Document creation with tracked changes and comments
- **pdf** — PDF manipulation (extract, merge, split, forms)
- **pptx** — Presentation creation and editing
- **canvas-design** — Create posters and visual designs
- **mcp-builder** — Build Model Context Protocol servers
- **skill-creator** — Detailed guide for authoring skills

---

## 📚 For Agent Developers

### JSON Output Reference

OpenSkills is a CLI that outputs JSON. What you do with it is your choice.

#### Discover Skills
```bash
openskills list
```

Returns: Array of skills with metadata (name, description, version, etc.)

#### Invoke Skill
```bash
openskills invoke <skill-name> --yes
```

Returns (example with permissions + attachments):
```json
{
  "skill": {
    "name": "pdf",
    "baseDir": "/path/to/skills/pdf",
    "version": "2.1.0"
  },
  "newMessages": [
    {
      "role": "user",
      "content": "<command-message>The \"pdf\" skill is loading</command-message>\n<command-name>pdf</command-name>",
      "isMeta": false
    },
    {
      "role": "user",
      "content": "<!-- baseDir: /path/to/skills/pdf -->\n...SKILL.md instructions...",
      "isMeta": true
    },
    {
      "role": "user",
      "content": {
        "type": "command_permissions",
        "allowedTools": ["Read", "Bash(pdftotext:*)"],
        "model": "claude-3-7-sonnet-20250219"
      },
      "isMeta": true
    },
    {
      "role": "user",
      "content": "Bundled resources available in /path/to/skills/pdf:\n- scripts/extract.sh\n- references/summary.md",
      "isMeta": true,
      "attachmentType": "reference"
    }
  ],
  "contextModifier": {
    "allowedTools": ["Read", "Bash(pdftotext:*)"],
    "model": "claude-3-7-sonnet-20250219",
    "tokens": 4096,
    "normalizedPermissions": {
      "tools": ["Read", "Execute"],
      "shellAllowPatterns": ["pdftotext:*"]
    }
  },
  "attachments": [
    {
      "role": "user",
      "content": "Bundled resources available in /path/to/skills/pdf:\n- scripts/extract.sh\n- references/summary.md",
      "isMeta": true,
      "attachmentType": "reference"
    }
  ]
}
```

**What is contextModifier?**

Metadata about what the skill wants. Your agent decides whether to:
- Enforce it strictly (like Claude Code does)
- Use as a suggestion
- Ignore entirely

**No rules. Your agent, your call.**

OpenSkills follows the blog’s **two-message base pattern**:

1. **Visible metadata** (`isMeta: false`) – `<command-message>` + `<command-name>` so humans see which skill loaded.
2. **Hidden prompt** (`isMeta: true`) – SKILL.md content with a prepended `<!-- baseDir: ... -->` comment.

Additional messages are injected **only when needed**:
- A single `command_permissions` object when `allowed-tools` or `model` overrides are declared.
- Attachment messages (`attachmentType`: `diagnostic`, `reference`, or `context`) when diagnostics/resources are available.

---

## 🚀 Using Skills with Slash Commands

OpenSkills works perfectly with CLIs that support custom slash commands (markdown-based shortcuts).

### Quick Setup (Factory Droid)

**1. Export all skills as slash commands:**
```bash
openskills export-all-slash --dir .factory/commands
```

**2. Reload commands in Droid:**
```
/commands → press R
```

**3. Use skills:**
```
/pdf
/xlsx
/skill-creator
```

### Manual Setup

Export a single skill:
```bash
openskills export-slash pdf > .factory/commands/pdf.md
```

The generated markdown file:
```markdown
---
description: Extract text from PDF documents
---
$(openskills invoke pdf --yes --format=prompt)
```

When you type `/pdf`, the skill's SKILL.md instructions load directly into the conversation.

### How It Works

1. `/pdf` triggers the markdown slash command
2. Command runs `openskills invoke pdf --format=prompt`
3. Outputs SKILL.md content via system notification
4. Agent sees the skill instructions as injected context
5. Agent follows the instructions

**This is functionally identical to Claude Code's Skill tool**, but works with ANY CLI that supports markdown slash commands.

### Supported CLIs

- ✅ **Factory Droid** (`.factory/commands/`)
- ✅ **Cursor** (`.cursor/commands/` - experimental)
- ✅ **Windsurf** (`.windsurf/commands/` - experimental)
- ✅ Any CLI implementing markdown slash commands

### Why Slash Commands > MCP

**MCP Skill Server:**
- Requires server running
- Adds latency
- Consumes tokens for tool description
- Meta-tool overhead in every request

**Slash Commands:**
- Direct skill injection
- Zero latency
- Zero tool overhead
- Simpler architecture
- Universal compatibility

Skills are prompt templates. Slash commands are the perfect delivery mechanism.

### Progressive Disclosure

Don't want to load all skills upfront? Use `/discover` for progressive disclosure:

**1. Export slash commands (including discover):**
```bash
openskills export-all-slash --dir .factory/commands
```

**2. In Droid, discover skills first:**
```
/discover
```

Outputs:
```
Skills provide specialized capabilities for specific tasks.

Available skills:
- pdf: Extract text from PDF documents
- xlsx: Process spreadsheet data
- skill-creator: Create new skills

Mode commands (change interaction mode):
- vision: Analyze images and visual content

To use a skill, type: /skill-name
```

**3. Load specific skill when needed:**
```
/pdf
```

**This is Claude Code's progressive disclosure pattern** - show skill list first (token-efficient), load full skill only when invoked. But works with ANY agent via slash commands.

**Token Budget:** The `/discover` command respects a 15,000 character limit (configurable with `--max-chars`). With large skill sets, lower-priority skills are truncated to fit the budget.

**Format Options:**
```bash
openskills discover --format=text   # Human-readable (default, for slash commands)
openskills discover --format=xml    # XML structure
openskills discover --format=json   # Full structured JSON
```

---

## Advanced Features

### JSON Output Mode

All commands support JSON output for programmatic usage:

```bash
openskills list --json
openskills read pdf --json
openskills suggest "spreadsheet" --json
```

Example output:
```json
{
  "skill": {
    "name": "pdf",
    "baseDir": "/project/.openskills/skills/pdf",
    "version": "2.1.0"
  },
  "content": "...",
  "contextModifier": {
    "allowedTools": ["Bash", "Read"],
    "model": "claude-3-7-sonnet-20250219"
  }
}
```

### Performance Optimizations

- **Smart Caching** — Skills and configs cached for 60s (auto-invalidates on changes)
- **Lazy Loading** — Commands loaded only when executed
- **Fast Path** — Built-in skills optimized for instant access

Cache location: `/tmp/.openskills-cache/` (OS manages cleanup)

### Privacy-First Telemetry

**What's tracked:** Command usage, skill names, success/failure, agent platform  
**What's NOT tracked:** File paths, repository info, PII

View your stats:
```bash
openskills telemetry --stats
```

Disable anytime:
```bash
openskills telemetry --disable
```

All data stays local in `~/.openskills/telemetry/`

---

## Why CLI Instead of MCP?

**MCP (Model Context Protocol)** is Anthropic's protocol for connecting AI to external tools and data sources. It's designed for:
- Database connections
- API integrations
- Real-time data fetching
- External service integration

**Skills** are fundamentally different:
- Static instruction sets (markdown files)
- Bundled resources (scripts, templates, references)
- Progressive disclosure pattern
- No server lifecycle to manage

**Why OpenSkills uses CLI:**

1. **Matches Anthropic's design** — Skills are SKILL.md files, not dynamic tools
2. **No server overhead** — Just files on disk
3. **Universal compatibility** — Works with any agent that can run CLI commands
4. **Simpler for users** — Install and use, no server configuration
5. **Follows the spec** — Implements what Anthropic documented

MCP and skills solve different problems. OpenSkills implements the skills specification the way it was designed.

---

## Requirements

- **Binaries:** No runtime required (single executable)
- **npm install:** Node.js 20.6+ (for ora dependency)
- **Git:** For cloning repositories

---

## Credits & Attribution

This project builds upon:

1. **Original OpenSkills** by [numman-ali](https://github.com/numman-ali/openskills) — Universal skills loader foundation
2. **Claude Skills Deep Dive** by [Lee-Hanchung](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) — Comprehensive reverse engineering of Anthropic's implementation

This fork (v2.0.0+) adds:
- Complete parity with Anthropic's implementation
- SEA binaries for zero-dependency distribution
- Enhanced security and permissions system
- Comprehensive test coverage (110 tests)
- Advanced features (progressive disclosure, semantic search, validation)

### Related Projects

- **Anthropic's Skills Marketplace:** [github.com/anthropics/skills](https://github.com/anthropics/skills)
- **Claude Code:** [claude.ai/download](https://claude.ai/download)
- **MCP Specification:** [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

## License

Apache 2.0

**Not affiliated with Anthropic.** Claude, Claude Code, and Agent Skills are trademarks of Anthropic, PBC.

Implements the [Agent Skills specification](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) as documented by Anthropic.

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Found this useful?** Follow [@nummanthinks](https://x.com/nummanthinks) for more AI tooling!
