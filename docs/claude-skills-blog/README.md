# Claude Skills Deep Dive - Reference Materials

This directory contains the complete reference materials from the blog post:
**"Claude Agent Skills: A First Principles Deep Dive"**
by Lee Hanchung (https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)

## Purpose

This represents the "bar" for what OpenSkills should achieve - a complete technical specification and architectural deep dive into how Claude's Skills system works.

## Contents

### Text Content
- `blog-content-full.md` - **COMPLETE** blog post (1,247 lines, 59KB) - USE THIS for analysis
- `blog-content.md` - Summary/overview only (42 lines)

### Diagrams (in order of appearance)

1. **01-claude-skill-flowchart.png** - Main architecture: How skills are used by Claude
2. **02-claude-desktop-skill.png** - UI: Skill upload interface
3. **03-claude-skill-package.png** - Structure: skill-creator package layout
4. **04-claude-skill-frontmatter.png** - Reference: Frontmatter fields breakdown
5. **05-command-chain-execution.png** - Pattern: Command Chain Execution
6. **06-search-analyze-report.png** - Pattern: Search-Analyze-Report
7. **08-claude-skill-execution-flow.png** - Architecture: Normal Tool vs Skill Tool comparison
8. **09-script-automation.png** - Pattern: Script Automation
9. **10-read-process-write.png** - Pattern: Read-Process-Write
10. **11-turn-1-completion.png** - Flow: API message injection and execution

## Key Concepts

### Core Architecture
- **Skills are NOT executable code** - They are prompt templates
- **Meta-tool architecture** - The `Skill` tool (capital S) manages individual skills
- **Dual context modification** - Skills modify both conversation context (via prompt injection) and execution context (via tool permissions and model override)
- **Progressive disclosure** - Show minimal info first, load details as needed

### Skills vs Tools
| Aspect | Traditional Tools | Skills |
|--------|------------------|--------|
| Execution Model | Synchronous, direct | Prompt expansion |
| Purpose | Perform specific operations | Guide complex workflows |
| Return Value | Immediate results | Context changes |
| Concurrency | Generally safe | Not concurrency-safe |

### SKILL.md Structure
```
---
name: skill-name              (required)
description: Brief overview   (required)
allowed-tools: "Bash, Read"   (optional)
model: "claude-opus-4-..."    (optional)
version: 1.0.0               (optional)
---

# Markdown content (instructions for Claude)
```

### Bundled Resources
- `scripts/` - Executable Python/Bash scripts
- `references/` - Documentation loaded into context
- `assets/` - Templates and binary files (not loaded into context)

### Message Injection Pattern
Skills inject TWO user messages:
1. **Metadata message** (`isMeta: false`) - VISIBLE to user, shows skill loading
2. **Skill prompt** (`isMeta: true`) - HIDDEN from UI, sent to API with full instructions

### Common Patterns
1. Script Automation - Offload to Python/Bash scripts
2. Read-Process-Write - File transformation
3. Search-Analyze-Report - Codebase analysis
4. Command Chain Execution - Multi-step operations

## Date Retrieved
2025-11-04

## Notes
All images and content are from the original blog post for reference purposes in building OpenSkills parity.
