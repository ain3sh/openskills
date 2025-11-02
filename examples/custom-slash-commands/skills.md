---
description: Non-interactive OpenSkills executor (pass-through or NL→CLI)
argument-hint: <subcommand|query>
---

Goal: run OpenSkills non-interactively. Prefer JSON outputs. If $ARGUMENTS begins with a known subcommand, pass it through exactly; otherwise map natural language to one minimal openskills call.

Non-interactive rules
- Add --format=json where supported; add -y for install/sync.
- Do not use interactive flows (e.g., manage).

Pass-through (run exactly as typed)
- read | describe | list | suggest | tool-description | skill-prompt | validate | install | remove | sync

NL→CLI routing (choose ONE)
- Discover skills → `openskills tool-description --format=json`
- Rank for "<need>" → `openskills suggest "<need>" --format=json`
- Use skill <name> → `openskills read <name> --format=json`
- Validate skill <name> → `openskills validate <name> --format=json [--lint-frontmatter]`
- Install repo <owner/repo> → `openskills install <owner/repo> -y [--global|--universal]`

Action templates
- `openskills read <skill> --format=json`
- `openskills suggest "<query>" --format=json [--limit N]`
- `openskills list --format=json [--all|--include-hidden|--include-disabled]`
- `openskills tool-description --format=json [--compact]`
- `openskills validate <skill>|--all --format=json [--lint-frontmatter]`
- `openskills install <owner/repo> -y`
- `openskills remove <skill>`
- `openskills sync -y`

Execution
- If $ARGUMENTS starts with a pass-through subcommand → run `openskills $ARGUMENTS`.
- Else → pick one template above that best satisfies the request and run it.