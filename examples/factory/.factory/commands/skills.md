---
description: Use OpenSkills non‑interactively; map natural language to openskills CLI calls; or pass subcommands straight through
argument-hint: <subcommand-or-natural-language>
---

You are operating in a non‑interactive environment. Execute OpenSkills via CLI only, passing flags so commands never prompt. If `$ARGUMENTS` begins with a known subcommand, pass it through to `openskills` unchanged. Otherwise, interpret `$ARGUMENTS` as a natural language request and select the appropriate `openskills` command(s).

Core rules
- Never use interactive flows (e.g., `manage`).
- Prefer JSON outputs for machine handling: add `--format=json` to commands that support it.
- For installs, use `-y` to avoid prompts.
- When permissions/models are elevated, surface them in your response using the JSON fields; host UI handles user approval.

Known subcommands (pass‑through if `$ARGUMENTS` starts with one of these)
- `read <skill> --format=json`
- `describe [<skill>]` (JSON output)
- `list --format=json [--all|--include-hidden|--include-disabled]`
- `suggest "<query>" --format=json [--all] [--limit N]`
- `tool-description --format=json [--all|--include-hidden|--include-disabled] [--compact]`
- `skill-prompt --format=json [--all|--include-hidden|--include-disabled]`
- `validate <skill>|--all --format=json [--lint-frontmatter]`
- `install <owner/repo> -y [--global|--universal]`
- `remove <skill>`
- `sync -y`

Natural language routing (if `$ARGUMENTS` does NOT start with a known subcommand)
1) Discovery
   - To list available skills succinctly: run `openskills tool-description --format=json`.
   - To rank skills for a need: run `openskills suggest "$ARGUMENTS" --format=json` and present the top candidates.
2) Load & use a skill
   - When a specific skill is chosen or referenced, run `openskills read <skill> --format=json` and include the resulting `newMessages` and `contextModifier` in the next turn’s context.
3) Validate a skill’s resources
   - If asked to check scripts/assets/references, run `openskills validate <skill> --format=json [--lint-frontmatter]` and summarize any missing resources or script issues.
4) Installation/removal
   - If asked explicitly to install, run `openskills install <owner/repo> -y [--global|--universal]`.
   - If asked to remove, run `openskills remove <skill>`.

Execution guidance
- Always execute using the shell/Execute tool, e.g.:
  ```bash
  openskills <subcommand and flags>
  ```
- Do not attempt interactive confirmations. Prefer flags shown above.
- For `read --format=json`, expect output fields:
  - `newMessages`: array with `[ {isMeta:false}, {isMeta:true}, {isMeta:false} ]` progressive disclosure
  - `contextModifier`: includes `allowedTools`, `model`, `disableModelInvocation`, `reasoningEffort`, `mode`, `tokens`, and `normalizedPermissions` ({ tools, shellAllowPatterns, shellDenyPatterns })
- For `validate --format=json`, expect categorization: `missing[]`, `scriptIssues[]`, `references[]`, and optional `frontmatterLint` with `unknownKeys[]` and `typeErrors[]` if `--lint-frontmatter` is used.

Examples
- “Which skills should I use for PDF text extraction?”
  1. Run: `openskills suggest "pdf text extraction" --format=json`
  2. Propose the top skills; after selection, run: `openskills read <chosen-skill> --format=json`

- “Load the repo diagnosis skill and follow instructions.”
  - Run: `openskills read repo-diagnosis --format=json`

- “Validate that the skill’s scripts exist and are executable.”
  - Run: `openskills validate repo-diagnosis --format=json --lint-frontmatter`

Pass‑through usage (user already specifies subcommand)
- `/skills read pdf --format=json`
  - You run exactly: `openskills read pdf --format=json`.
- `/skills suggest "summarize architectural diagrams" --format=json --limit 8`
  - You run exactly: `openskills suggest "summarize architectural diagrams" --format=json --limit 8`.

Safety & approvals
- Do not block on approvals in this environment. Instead, surface requested permissions and model overrides from `contextModifier.normalizedPermissions` and related fields; host UI handles user consent.

***

Input to process now: `$ARGUMENTS`

If it starts with a known subcommand, run `openskills $ARGUMENTS`.
Otherwise, choose and run the minimal set of `openskills` command(s) that satisfy the user’s request, adhering to the rules above.