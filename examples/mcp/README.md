## MCP stdio Skill meta-tool server (example)

This directory contains a FastMCP (Python) server over stdio that exposes a single meta-tool named `Skill`.

What it does
- At startup, it generates a dynamic description by invoking:
  - `openskills tool-description --format=json`
- It exposes one tool: `Skill(command: string)`
  - On call, it runs: `openskills read <command> --format=json`
  - Returns the parsed JSON with `newMessages` (including hidden `isMeta: true` content) and a `contextModifier` for the host to apply
- Also provides `skill_refresh()` to refresh the cached skill list

Files
- `skill_server.py` – stdio FastMCP server implementing the `Skill` tool

Prereqs
- Python 3.10+
- `openskills` CLI available on PATH (install with `npm i -g openskills`)

Run (local)
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install fastmcp
python examples/mcp/skill_server.py
```

Use with MCP clients
- Add an entry to your MCP configuration (global, project, or checked‑in `.mcp.json`).
- Example `.mcp.json` snippet:
```json
{
  "mcpServers": {
    "openskills-skill": {
      "command": "python",
      "args": ["examples/mcp/skill_server.py"],
      "transport": { "stdio": true }
    }
  }
}
```

Other configuration examples
- Absolute paths (Windows):
```json
{
  "mcpServers": {
    "openskills-skill": {
      "command": "C:/Python312/python.exe",
      "args": ["C:/path/to/repo/examples/mcp/skill_server.py"],
      "transport": { "stdio": true }
    }
  }
}
```

- Environment override when Node/npm globals aren’t on PATH:
```json
{
  "mcpServers": {
    "openskills-skill": {
      "command": "python",
      "args": ["examples/mcp/skill_server.py"],
      "env": { "PATH": "/usr/local/bin:/opt/homebrew/bin:${PATH}" },
      "transport": { "stdio": true }
    }
  }
}
```

- HTTP transport (if you adapt the server to run over HTTP instead of stdio):
```json
{
  "mcpServers": {
    "openskills-skill": { "url": "http://localhost:8000/mcp/" }
  }
}
```

Calling the tool
- Tool name: `Skill`
- Argument: `{ "command": "<skillName>" }`
- Behavior: returns the JSON payload from `openskills read <skill> --format=json`

Debugging
- Launch your client with MCP debug flags (e.g., `--mcp-debug`) to see connection and capability logs.

Notes
- The description is generated at startup; run `skill_refresh` to update the discovery cache at runtime.
- Configuration keys follow common MCP client conventions (mcpServers/command/args/env). For client‑specific details, see:
  - Cline: https://docs.cline.bot/mcp/configuring-mcp-servers
  - Continue: https://docs.continue.dev/customize/deep-dives/mcp
  - FastMCP JSON config: https://gofastmcp.com/integrations/mcp-json-configuration