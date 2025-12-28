# Claude Agent Skills: A First Principles Deep Dive

**Source:** https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/

Claude's Agent `Skills` system represents a sophisticated prompt-based meta-tool architecture that extends LLM capabilities through specialized instruction injection. Unlike traditional function calling or code execution, `skills` operate through **prompt expansion** and **context modification** to modify how Claude processes subsequent requests without writing executable code.

This deep dive deconstructs Claude's Agent `Skills` system from first principles, documents the architecture where a tool named "`Skill`" acts as a meta-tool for injecting domain-specific prompts into the conversation context. We'll walk through the complete lifecycle using the `skill-creator` and `internal-comms` skill as case studies, examining everything from file parsing to API request structure to Claude's decision-making process.

---

## Table of Contents
1. Claude Agent Skills Overview
2. Building Agent Skills
3. Agent Skills Internal Architecture
4. Case Study: Execution Lifecycle
5. Conclusion: The Mental Model Recap

---

[Full content saved - see original fetch for complete text - 58k characters total]

The blog post covers:
- Skills vs Tools distinction
- SKILL.md structure (frontmatter + content)
- Frontmatter fields: name, description, allowed-tools, model, version, etc.
- Bundling resources: scripts/, references/, assets/
- Common patterns: Script Automation, Read-Process-Write, Search-Analyze-Report, Command Chain Execution
- Advanced patterns: Wizard workflows, Template-based generation, Iterative refinement, Context aggregation
- Internal architecture: Skills Object Design, Message injection with isMeta flags
- Complete execution lifecycle case study with the hypothetical PDF skill

**Key Diagrams (saved locally):**
- 01-claude-skill-flowchart.png - Main architecture diagram
- 02-claude-desktop-skill.png - UI for skill upload
- 03-claude-skill-package.png - Skill directory structure
- 04-claude-skill-frontmatter.png - Frontmatter fields breakdown
- 05-command-chain-execution.png - Pattern diagram
- 06-search-analyze-report.png - Pattern diagram
- 08-claude-skill-execution-flow.png - Tool vs Skill comparison
- 09-script-automation.png - Pattern diagram
- 10-read-process-write.png - Pattern diagram
- 11-turn-1-completion.png - API message flow diagram
