# 🎉 OpenSkills v2.1.0 Release Notes

## 🚀 Introducing @SKILLS.md Transclusion

We're thrilled to announce OpenSkills v2.1.0, featuring the revolutionary **@SKILLS.md transclusion pattern** that brings token-efficient skill management to all AI coding agents!

### What's New

#### **@SKILLS.md Transclusion Pattern** 
The headline feature that changes how skills are managed:

- **Cleaner AGENTS.md**: No more embedded XML cluttering your files
- **Dynamic Updates**: Skills list updates without modifying AGENTS.md
- **Token Efficient**: Save ~2000 tokens per AGENTS.md read
- **Multiple Syntaxes**: Supports `@SKILLS.md`, `@include: SKILLS.md`, and HTML comments
- **Smart Detection**: Automatically preserves existing patterns

#### **New Commands**

```bash
# Generate standalone SKILLS.md
openskills generate-skills-md

# Sync with transclusion mode
openskills sync --transclusion

# Custom patterns
openskills sync --transclusion-pattern "@include: SKILLS.md"
```

### Quick Start

1. **Install from npm:**
   ```bash
   npm install -g openskills@2.1.0
   ```

2. **Install skills from Anthropic's marketplace:**
   ```bash
   openskills install anthropics/skills
   ```

3. **Use transclusion mode:**
   ```bash
   openskills sync --transclusion
   ```

Your AGENTS.md now contains just `@SKILLS.md` instead of hundreds of lines of XML!

### Migration from v2.0.0

Existing users can seamlessly migrate:

```bash
# Update OpenSkills
npm update -g openskills

# Convert to transclusion mode
openskills sync --transclusion
```

Your existing skills remain intact, only the reference method changes.

### Key Statistics

- **Test Coverage**: 165 tests, all passing ✅
- **Parity with Claude Code**: ~85%
- **Token Savings**: ~2000 tokens per AGENTS.md read
- **Supported Agents**: Claude Code, Cursor, Windsurf, Aider, Factory Droid
- **Skills Compatible**: 100% compatible with Anthropic's marketplace

### Configuration

Set your default preference in `.openskills.json`:

```json
{
  "sync": {
    "mode": "transclusion",
    "transclusionPattern": "@SKILLS.md"
  }
}
```

### Example: Before and After

**Before (v2.0.0):**
```markdown
# AGENTS.md
<skills_system priority="1">
  <!-- 200+ lines of XML -->
  <skill>...</skill>
  <skill>...</skill>
  <!-- ... -->
</skills_system>
```

**After (v2.1.0):**
```markdown
# AGENTS.md

## Skills

@SKILLS.md
```

### Tested With Real Skills

We've thoroughly tested with Anthropic's official `skill-creator` skill:
- ✅ Installation from marketplace
- ✅ Dynamic SKILLS.md generation
- ✅ Transclusion reference working
- ✅ Skill execution through OpenSkills

### Contributing

OpenSkills is open source! Contributions welcome at:
https://github.com/ain3sh/openskills

### Credits

Special thanks to:
- Original OpenSkills by [@numman-ali](https://github.com/numman-ali)
- Claude Skills Deep Dive by [@Lee-Hanchung](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- The Anthropic team for the Skills specification

### What's Next

- MCP server integration (planned)
- More output formats
- Enhanced skill discovery
- Performance optimizations

---

**Full Changelog**: https://github.com/ain3sh/openskills/blob/main/CHANGELOG.md

**Report Issues**: https://github.com/ain3sh/openskills/issues

**Not affiliated with Anthropic.** Claude, Claude Code, and Agent Skills are trademarks of Anthropic, PBC.
