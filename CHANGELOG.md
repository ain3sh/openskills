# Changelog

All notable changes to OpenSkills will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2024-11-10

### Added
- **@SKILLS.md Transclusion Pattern** - Revolutionary new feature for token-efficient skill management
  - `generate-skills-md` command for standalone SKILLS.md generation
  - `--transclusion` flag for sync command
  - Support for multiple include syntaxes (@SKILLS.md, @include:, HTML comments)
  - Automatic detection and preservation of existing transclusion patterns
  - Configuration support for default sync mode
- **Comprehensive test suite** for transclusion functionality
- **Multiple output formats** for SKILLS.md (XML, Markdown, Compact)
- **Smart pattern detection** for existing transclusion references

### Changed
- Enhanced sync command with transclusion mode support
- Improved AGENTS.md handling to preserve user content
- Updated configuration system to support sync preferences
- Expanded .gitignore for better project hygiene

### Fixed
- HTML comment style skills section removal now works correctly
- Pattern detection order optimized for correct precedence
- Config merging properly handles new sync settings

## [2.0.0] - 2024-11-03

### Added
- Complete rewrite for Anthropic Skills specification parity
- Two-message injection pattern matching Claude Code
- Full YAML frontmatter support
- Resource bundling (scripts/, references/, assets/)
- Permission system (allow/deny/ask)
- GitHub marketplace installation
- Slash command export
- JSON output mode for headless agents
- Telemetry system (privacy-first, local only)
- Comprehensive test coverage (165 tests)

### Changed
- Complete architectural overhaul for Claude Skills compatibility
- Multi-source skill discovery with priority-based deduplication
- 60-second caching for performance optimization
- Progressive disclosure pattern implementation

### Removed
- Legacy skill format support
- Old configuration system

## [1.0.0] - 2024-10-15

### Added
- Initial release by numman-ali
- Basic skill loading functionality
- Simple CLI interface
- Project and global installation modes

---

For detailed release notes, see [GitHub Releases](https://github.com/ain3sh/openskills/releases)
