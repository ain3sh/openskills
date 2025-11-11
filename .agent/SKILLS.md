<!-- OpenSkills Generated - Do Not Edit Manually -->
<!-- Last Updated: 2025-11-11T16:04:21.820Z -->
<!-- Skills Count: 5 -->

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<available_skills>
"skill-creator": Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.
"slack-gif-creator": Toolkit for creating animated GIFs optimized for Slack, with validators for size constraints and composable animation primitives. This skill applies when users request animated GIFs or emoji animations for Slack from descriptions like "make me a GIF for Slack of X doing Y".
"mcp-builder": Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate external APIs or services, whether in Python (FastMCP) or Node/TypeScript (MCP SDK).
"session-start-hook": Creating and developing startup hooks for Claude Code on the web. Use when the user wants to set up a repository for Claude Code on the web, create a SessionStart hook to ensure their project can run tests and linters during web sessions.
"hello-world": Example built-in skill that demonstrates the skill format and serves as a template
</available_skills>

<usage>
When a skill is needed, get execution details:
openskills invoke <skill-name> --format=execution
</usage>
<!-- SKILLS_TABLE_END -->

</skills_system>
