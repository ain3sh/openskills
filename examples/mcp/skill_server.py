import json
import subprocess
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("openskills-skill")

@mcp.tool()
def skill_load(name: str) -> dict:
    r = subprocess.run(["openskills", "read", name, "--format=json"], capture_output=True, text=True)
    if r.returncode != 0:
        return {"error": r.stderr or r.stdout, "code": r.returncode}
    return json.loads(r.stdout)

if __name__ == "__main__":
    mcp.run(transport="stdio")
