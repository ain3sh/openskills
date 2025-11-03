## MCP stdio Skill meta-tool server (example)

This directory contains a Node/TypeScript MCP server (using the official TS SDK) over stdio that exposes a single meta-tool named `Skill`.

What it does
- At startup, it generates a dynamic description by invoking:
  - `openskills tool-description --format=json`
- It exposes one tool: `Skill(command: string)`
  - On call, it runs: `openskills read <command> --format=json`
  - Returns the parsed JSON with `newMessages` (including hidden `isMeta: true` content) and a `contextModifier` for the host to apply
- Also provides `skill_refresh()` to refresh the cached skill list

Files
- `skill_server.ts` – stdio MCP server implementing the `Skill` tool

Prereqs
- Node.js 20+
- `openskills` CLI available on PATH (install with `npm i -g openskills`)

Build & run (local)
```bash
npm install
npm run build
node dist/examples/mcp/skill_server.js
```

Use with MCP clients
- Add an entry to your MCP configuration (global, project, or checked‑in `.mcp.json`).
- Example `.mcp.json` snippet:
```json
{
  "mcpServers": {
    "openskills-skill": { "command": "node", "args": ["dist/examples/mcp/skill_server.js"], "transport": { "stdio": true } }
  }
}
```

Other configuration examples
- Absolute paths (Windows):
```json
{
  "mcpServers": {
    "openskills-skill": { "command": "node", "args": ["C:/path/to/repo/dist/examples/mcp/skill_server.js"], "transport": { "stdio": true } }
  }
}
```

- Environment override when Node/npm globals aren’t on PATH:
```json
{
  "mcpServers": {
    "openskills-skill": { "command": "node", "args": ["dist/examples/mcp/skill_server.js"], "env": { "PATH": "/usr/local/bin:/opt/homebrew/bin:${PATH}" }, "transport": { "stdio": true } }
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