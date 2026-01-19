# Creating Skills

A guide to authoring skills for AI agents using OpenSkills.

## Quick Start

1. Create a skill directory with a SKILL.md file:

```
my-skill/
├── SKILL.md          # Required
├── scripts/          # Executable scripts
│   └── main.py
└── references/       # Optional documentation
    └── api.md
```

2. Write your SKILL.md with frontmatter:

```markdown
---
name: my-skill
description: Brief description of what this skill does
version: 1.0.0
---

# My Skill

Instructions for the AI agent on how to use this skill.

## Scripts

- `scripts/main.py` - Main processing script
```

3. Install and test:

```bash
openskills install ./my-skill
openskills use my-skill
openskills exec my-skill scripts/main.py
```

## SKILL.md Specification

Skills follow the [Claude Code Skills spec](https://code.claude.com/docs/en/skills.md).

### Required Fields

| Field | Description |
|-------|-------------|
| `name` | Unique skill identifier (lowercase, hyphens allowed) |
| `description` | Brief description for discovery (~100 chars) |

### Optional Fields

| Field | Description |
|-------|-------------|
| `version` | Semantic version (e.g., `1.0.0`) |
| `license` | License identifier (e.g., `MIT`) |
| `author` | Author name or email |
| `allowed-tools` | Tools the skill needs (e.g., `Read, Write, Bash(git:*)`) |
| `model` | Preferred model (e.g., `claude-3-sonnet`) |
| `aliases` | Alternative names for discovery |
| `keywords` | Search keywords |
| `tags` | Categorization tags |

### Example Frontmatter

```yaml
---
name: pdf-extractor
description: Extract and process content from PDF files
version: 2.0.0
license: MIT
author: your-name
allowed-tools: Read, Bash(pdftotext:*)
keywords: [pdf, extract, document]
---
```

## Directory Structure

```
my-skill/
├── SKILL.md              # Required: Instructions and metadata
├── scripts/              # Executable scripts (auto-discovered)
│   ├── main.py           # Primary script
│   ├── validate.sh       # Helper scripts
│   └── utils.py
├── templates/            # Alternative script location
│   └── generator.py
├── references/           # Documentation (loaded on demand)
│   ├── api.md
│   └── examples.md
└── assets/               # Static resources
    └── template.html
```

### Script Discovery

OpenSkills automatically discovers scripts in these directories:
- `scripts/`
- `templates/`
- `bin/`
- Root directory

Supported extensions: `.py`, `.sh`, `.bash`, `.js`, `.mjs`

## Writing Scripts

### Environment Variables

Scripts receive these environment variables:

| Variable | Description |
|----------|-------------|
| `SKILL_BASE` | Absolute path to skill directory |
| `SKILL_NAME` | Name of the skill |
| `WORK_DIR` | Current working directory |

### Python Example

```python
#!/usr/bin/env python3
"""
Process input files and generate output.
"""
import os
import sys

skill_base = os.environ.get('SKILL_BASE', '.')
work_dir = os.environ.get('WORK_DIR', '.')

def main():
    # Your script logic here
    print(f"Running from {skill_base}")
    print(f"Working in {work_dir}")

if __name__ == '__main__':
    main()
```

### Bash Example

```bash
#!/usr/bin/env bash
# Validate input files
set -e

SKILL_BASE="${SKILL_BASE:-.}"
WORK_DIR="${WORK_DIR:-.}"

echo "Running from $SKILL_BASE"
echo "Working in $WORK_DIR"

# Your script logic here
```

### Best Practices

1. **Use shebang lines** - `#!/usr/bin/env python3` for portability
2. **Include docstrings** - First line becomes the script description
3. **Handle missing env vars** - Provide defaults with `${VAR:-default}`
4. **Exit with proper codes** - `0` for success, non-zero for errors
5. **Print to stdout** - Agents capture script output

## Writing Instructions

The body of SKILL.md contains instructions for the AI agent.

### Good Instructions

```markdown
# PDF Extractor

This skill extracts text content from PDF files.

## Usage

1. Get execution context: `openskills use pdf-extractor`
2. Run the extraction script:
   ```bash
   python {baseDir}/scripts/extract.py --input document.pdf
   ```

## Scripts

- `scripts/extract.py` - Extract text from PDF
  - Arguments: `--input <file>` (required), `--output <file>` (optional)
  - Returns: Extracted text to stdout or file

## Examples

Extract text from a PDF:
```bash
python {baseDir}/scripts/extract.py --input report.pdf > text.txt
```
```

### Tips

- Use `{baseDir}` placeholder for paths - agents substitute the actual path
- Document script arguments clearly
- Provide copy-paste examples
- Keep instructions focused on execution, not theory

## Testing Your Skill

```bash
# List skills to verify discovery
openskills list

# Get execution context
openskills use my-skill

# Test script execution
openskills exec my-skill scripts/main.py --arg value

# Load full content
openskills load my-skill
```

## Installation Locations

| Location | Command | Scope |
|----------|---------|-------|
| `.agents/skills/` | `openskills install ./skill` | Project (default) |
| `~/.agents/skills/` | `openskills install ./skill --global` | Global |

## Common Patterns

### Skill with Multiple Scripts

```markdown
---
name: data-processor
description: Process and transform data files
---

# Data Processor

## Scripts

- `scripts/validate.py` - Validate input format
- `scripts/transform.py` - Apply transformations  
- `scripts/export.py` - Export to various formats

## Workflow

1. Validate: `python {baseDir}/scripts/validate.py --input data.csv`
2. Transform: `python {baseDir}/scripts/transform.py --input data.csv --rules rules.json`
3. Export: `python {baseDir}/scripts/export.py --input transformed.csv --format xlsx`
```

### Skill with References

```markdown
---
name: api-client
description: Client for interacting with external API
---

# API Client

See `references/api.md` for full API documentation.

## Quick Start

```bash
python {baseDir}/scripts/client.py --endpoint users --method GET
```
```

## Publishing Skills

1. Host on GitHub: `github.com/username/skills/my-skill`
2. Users install via: `openskills install username/skills/my-skill`

### Repository Structure

```
your-skills-repo/
├── skill-one/
│   └── SKILL.md
├── skill-two/
│   └── SKILL.md
└── README.md
```

## See Also

- [Architecture](architecture.md) - Technical deep dive
- [Claude Code Skills Spec](https://code.claude.com/docs/en/skills.md) - Official specification
