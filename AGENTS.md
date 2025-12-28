# AGENTS.md

Instructions for AI agents working on the OpenSkills codebase.

## Overview

OpenSkills is a CLI tool for managing AI agent skills. It follows an **execution-first** and **agent-first** architecture:

- **Execution-first**: Skills contain scripts that run in isolated processes
- **Agent-first**: All commands are non-interactive by default (`--tui` enables interactive mode)

## Project Structure

```
src/
├── cli.ts                 # CLI entry point (Commander.js)
├── types.ts               # Shared TypeScript types
│
├── commands/              # CLI command handlers (18 files)
│   ├── install.ts         # Install skills from GitHub
│   ├── list.ts            # List installed skills
│   ├── load.ts            # Output full skill prompt
│   ├── use.ts             # Output execution payload (JSON)
│   ├── exec.ts            # Execute skill scripts
│   ├── sync.ts            # Sync skills to AGENTS.md
│   └── ...
│
├── skill/                 # Core skill logic
│   ├── discovery.ts       # Find skills across all sources
│   ├── frontmatter.ts     # Parse SKILL.md YAML frontmatter
│   ├── validation.ts      # Validate skill structure
│   ├── scripts.ts         # Script discovery and execution
│   ├── permissions.ts     # Permission checking
│   ├── attachments.ts     # Build skill attachments
│   ├── refs.ts            # Extract file references
│   └── presentability.ts  # Filter hidden/disabled skills
│
├── agent/                 # Agent platform integration
│   ├── plugins.ts         # Claude plugin discovery
│   ├── agents-md.ts       # AGENTS.md manipulation
│   ├── tool-description.ts # Build Skill tool descriptions
│   └── interactive.ts     # TUI prompts
│
├── config/                # Configuration
│   ├── dirs.ts            # Skill directory resolution
│   ├── loader.ts          # Load .openskills.json config
│   ├── settings.ts        # Edit agent settings files
│   └── cache.ts           # Fast disk caching
│
├── marketplace/           # External sources
│   └── github.ts          # GitHub skill installation
│
└── telemetry/             # Usage tracking
    └── tracker.ts         # Anonymous telemetry
```

## Key Commands

```bash
openskills install <source>    # Install skills (non-interactive by default)
openskills list                # List skills as JSON
openskills load <skill>        # Output skill prompt (text)
openskills use <skill>         # Output execution payload (JSON)
openskills exec <skill> <path> # Run a skill script
openskills sync                # Sync to AGENTS.md (transclusion by default)
```

All commands accept `--tui` for interactive mode.

## Testing

```bash
npm test           # Run all 147 tests
npm run typecheck  # TypeScript checking
npm run build      # Build to dist/
```

Test structure mirrors src/:

```
tests/
├── commands/      # CLI command tests
├── skill/         # Skill logic tests
├── agent/         # Agent integration tests
├── config/        # Configuration tests
├── integration/   # E2E integration tests
└── security/      # Security tests (ReDoS, etc.)
```

## Code Conventions

1. **Agent-first**: Use `tui?: boolean` option, not `yes?: boolean`. Default is non-interactive.
2. **Transclusion default**: `sync` creates `.agent/SKILLS.md` by default, `--direct` embeds inline.
3. **Agent aliases**: After `openskills install-hooks`, these shortcuts are available:
   - `install-skill`, `list-skills`, `load-skill`, `use-skill`, `sync-skills`
   - `describe-skill`, `suggest-skill`, `execute-skill-script`
4. **Official spec only**: SKILL.md frontmatter follows [Claude Code Skills spec](https://code.claude.com/docs/en/skills.md):
   - Required: `name`, `description`
   - Optional: `allowed-tools`, `model`, `version`, `license`, etc.
   - No snake_case variants (no `allowed_tools`, use `allowed-tools`)

## Skill Discovery Priority

Skills are discovered from these locations (highest priority first):

1. `./.agent/skills/` - Project agent-agnostic
2. `~/.agent/skills/` - Global agent-agnostic
3. `./.claude/skills/` - Project Claude-specific
4. `~/.claude/skills/` - Global Claude-specific
5. Claude plugins (via `~/.claude/plugins.json`)
6. Built-in skills

## Making Changes

1. Run `npm run typecheck` before committing
2. Run `npm test` to verify all 147 tests pass
3. Follow existing code patterns in the relevant directory
4. Update tests in the corresponding `tests/` subdirectory

---

## Skills

@.agent/SKILLS.md
