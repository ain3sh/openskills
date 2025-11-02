## Minimal MCP stdio skill server (example)

This directory contains a tiny MCP server example implemented with FastMCP (Python) over stdio.

Purpose
- Demonstrates how an agent can expose OpenSkills‑style tools via MCP without any network services.
- Good for local dev or embedding alongside a repo.

Files
- `skill_server.py` – minimal FastMCP server using stdio transport.

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
    "openskills-example": {
      "command": "python",
      "args": ["examples/mcp/skill_server.py"],
      "transport": { "stdio": true }
    }
  }
}
```

Debugging
- Launch your client with MCP debug flags (e.g., `--mcp-debug`) to see connection and capability logs.

Notes
- This example is intentionally minimal; extend with real tools/resources as needed.