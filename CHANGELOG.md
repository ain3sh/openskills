# Changelog

All notable changes to OpenSkills will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
