<!-- OpenSkills Generated - Do Not Edit Manually -->
<!-- Last Updated: 2025-11-19T01:39:38.860Z -->
<!-- Skills Count: 15 -->

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<available_skills>
"mcp-builder": Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate external APIs or services, whether in Python (FastMCP) or Node/TypeScript (MCP SDK).
"skill-creator": Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.
"slack-gif-creator": Toolkit for creating animated GIFs optimized for Slack, with validators for size constraints and composable animation primitives. This skill applies when users request animated GIFs or emoji animations for Slack from descriptions like "make me a GIF for Slack of X doing Y".
"theme-factory": Toolkit for styling artifacts with a theme. These artifacts can be slides, docs, reportings, HTML landing pages, etc. There are 10 pre-set themes with colors/fonts that you can apply to any artifact that has been creating, or can generate a new theme on-the-fly.
"ask-notebooklm": Use this skill to query your Google NotebookLM notebooks directly from Claude Code for source-grounded, citation-backed answers from Gemini. Browser automation, library management, persistent auth. Drastically reduced hallucinations through document-only responses.
"organize-file": Intelligently organizes your files and folders across your computer by understanding context, finding duplicates, suggesting better structures, and automating cleanup tasks. Reduces cognitive load and keeps your digital workspace tidy without manual effort.
"algorithmic-art": Creating algorithmic art using p5.js with seeded randomness and interactive parameter exploration. Use this when users request creating art using code, generative art, algorithmic art, flow fields, or particle systems. Create original algorithmic art rather than copying existing artists' work to avoid copyright violations.
"artifacts-builder": Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend web technologies (React, Tailwind CSS, shadcn/ui). Use for complex artifacts requiring state management, routing, or shadcn/ui components - not for simple single-file HTML/JSX artifacts.
"brand-guidelines": Applies Anthropic's official brand colors and typography to any sort of artifact that may benefit from having Anthropic's look-and-feel. Use it when brand colors or style guidelines, visual formatting, or company design standards apply.
"canvas-design": Create beautiful visual art in .png and .pdf documents using design philosophy. You should use this skill when the user asks to create a poster, piece of art, design, or other static piece. Create original visual designs, never copying existing artists' work to avoid copyright violations.
"frontend-design": Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics.
"internal-comms": A set of resources to help me write all kinds of internal communications, using the formats that my company likes to use. Claude should use this skill whenever asked to write some sort of internal communications (status reports, leadership updates, 3P updates, company newsletters, FAQs, incident reports, project updates, etc.).
"template-skill": Replace with description of the skill and when Claude should use it.
"webapp-testing": Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.
"hello-world": Example built-in skill that demonstrates the skill format and serves as a template
</available_skills>

<usage>
When a skill is needed, get execution details:
openskills use <skill-name>

Command reference:
- openskills list (list available skills)
- openskills use <skill> (get execution instructions)
- openskills load <skill> (read full skill prompt)
- openskills exec <skill> <script> (execute script directly)
- openskills suggest <query> (find relevant skills)
- openskills describe [skill] (get skill metadata)
</usage>
<!-- SKILLS_TABLE_END -->

</skills_system>
