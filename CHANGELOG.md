# Changelog

All notable changes to OpenSkills will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2024-12-28

### 🧹 Major Cleanup & Agent-First Architecture

This release removes legacy compatibility code, aligns with the official Claude Code Skills spec, and restructures the codebase for clarity.

### Changed

- **Agent-first by default** - All commands are now non-interactive by default
  - Use `--tui` flag for interactive mode (replaces `-y`/`--yes`)
  - `sync` now uses transclusion by default (`--direct` for inline embedding)
  - `sync` creates AGENTS.md if missing instead of erroring
- **Source restructure** - Replaced flat `src/utils/` with domain-specific directories:
  - `src/skill/` - Core skill logic (discovery, validation, frontmatter, etc.)
  - `src/agent/` - Agent platform integration (plugins, agents-md, etc.)
  - `src/config/` - Configuration and paths
  - `src/marketplace/` - GitHub integration
  - `src/telemetry/` - Usage tracking
- **Test restructure** - Tests now mirror src/ structure
- **Session hook fix** - Fixed PATH corruption bug in session hook script

### Removed

- **Legacy code cleanup**:
  - Removed `session-hook` command (replaced by bash script)
  - Removed `skill-prompt` command (superseded by `tool-description`)
  - Removed `list-skills` duplicate command
  - Removed all legacy command aliases (`install-skill`, `load-skill`, etc.)
  - Removed ALIASES system from install-hooks
  - Removed LEGACY_HOOK_COMMAND migration logic
- **Dead types**: Removed unused `SkillMetadata`, `ContextModifier`, `NewMessage`, `ReadJsonOutput`
- **Non-spec fields**: Removed support for fields not in official spec:
  - `when_to_use` / `when-to-use`
  - `disable-model-invocation` / `disable_model_invocation`
  - `reasoning-effort` / `reasoning_effort`
  - All snake_case variants (`allowed_tools`, etc.)
- **Dead functions**: Removed `escapeReg()`, `normalizePermissions()`, `getSearchDirs()`, `clearAllCaches()`, etc.
- **Outdated docs**: Removed 3 internal optimization reports from docs/

### Fixed

- Session hook now uses `${PATH:-fallback}` to prevent PATH corruption
- Tests no longer leave `.claude` folder at project root
- All 147 tests pass with proper isolation

## [2.0.0] - 2024-11-11

### 🚀 Complete Execution-First Architecture

This major release transforms OpenSkills into an **execution-first system** where skills are treated as executable toolkits rather than documentation to interpret. This is the first official major release of the ain3sh/openskills fork.

### Added
- **`openskills exec` command** - Direct script execution from skills
- **Script discovery system** - Automatic detection of Python, Bash, Node.js scripts
- **Execution format** (`--format=execution`) - Returns scripts list and environment
- **Progressive disclosure optimization** - Matches Anthropic's blog specification exactly
- **Environment injection** - SKILL_BASE and WORK_DIR variables for execution context
- **Script metadata extraction** - Descriptions from docstrings

### Changed
- **BREAKING**: Default installation path changed to `.agent/skills` (agent-agnostic)
- **BREAKING**: Skill discovery format simplified to `"name": description` only
- Skills are now **executed, not imported** - eliminating module import confusion
- Reduced discovery metadata by 44% (280 bytes/skill vs 500 bytes/skill)
- Moved execution instructions from Level 1 to Level 2 (progressive disclosure)
- Simplified skill search paths from 6+ to 4 essential ones
- Token usage reduced by ~45% for skill discovery

### Removed
- Removed `universal` flag (`.agent/skills` is now default)
- Removed verbose XML structure from discovery
- Removed baseDir and location from Level 1 discovery
- Removed legacy `.openskills` path support
- Removed 900+ bytes of execution instructions from discovery phase

### Fixed
- Skills now properly execute as standalone processes (security improvement)
- Progressive disclosure now matches blog specification precisely
- Can handle 80+ skills within 15KB token budget (vs 30 before)

### Performance
- Discovery: <50ms for typical skill sets
- Execution overhead: ~50ms to spawn process
- Build size: 116KB (optimized)
- Supports 100+ skills without context bloat



## [1.0.0] - 2024-11-08

### Added
- Initial release
- Basic skill installation from GitHub
- AGENTS.md synchronization
- JSON output support
