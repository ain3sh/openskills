---
description: Non-interactive OpenSkills executor (pass-through or NL→CLI)
argument-hint: <subcommand|query>
---

Goal: run OpenSkills non-interactively. All relevant commands now emit JSON by default. If $ARGUMENTS begins with a known subcommand, pass it through exactly; otherwise map natural language to one minimal openskills call.

Non-interactive rules
- No `--format` flags are necessary; commands are agent-ready out of the box.
- Use `-y` for install/sync if you need to skip confirmations.
- Do not use interactive flows (e.g., manage).

Pass-through (run exactly as typed)
- read | describe | list | suggest | tool-description | skill-prompt | validate | install | remove | sync

NL→CLI routing (choose ONE)
- Discover skills → `openskills tool-description`
- Rank for "<need>" → `openskills suggest "<need>"`
- Use skill <name> → `openskills read <name>`
- Validate skill <name> → `openskills validate <name> [--lint-frontmatter]`
- Install repo <owner/repo> → `openskills install <owner/repo> -y [--global|--universal]`

Action templates
- `openskills read <skill>`
- `openskills suggest "<query>" [--limit N]`
- `openskills list [--all|--include-hidden|--include-disabled]`
- `openskills tool-description [--compact]`
- `openskills validate <skill>|--all [--lint-frontmatter]`
- `openskills install <owner/repo> -y`
- `openskills remove <skill>`
- `openskills sync -y`

Execution
- If $ARGUMENTS starts with a pass-through subcommand → run `openskills $ARGUMENTS`.
- Else → pick one template above that best satisfies the request and run it.