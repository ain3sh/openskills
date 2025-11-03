import json
import shutil
import subprocess
from typing import Any, Dict, List, Tuple
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("openskills_skill")


def _run(cmd: List[str]) -> Tuple[int, str, str]:
    """Run a command and capture stdout/stderr.

    Returns: (code, stdout, stderr)
    """
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr


def _list_skills() -> Tuple[List[Dict[str, Any]], str]:
    """Return (skills, description) using openskills tool-description --format=json.

    skills: list of { name, description, version?, license? }
    description: human-readable one- or multi-line description
    """
    code, out, err = _run(["openskills", "tool-description", "--format=json"])
    if code != 0:
        # Fallback description when openskills is not available
        desc = (
            "Skill meta-tool: call by name to load instructions. "
            "(openskills CLI not found or failed; install with npm i -g openskills)"
        )
        return [], desc
    try:
        data = json.loads(out)
    except Exception:
        return [], "Skill meta-tool: call by name to load instructions. (invalid JSON from openskills)"

    skills = data.get("skills") or []
    names = ", ".join(s.get("name", "") for s in skills)
    one_line = data.get("oneLine") or f"Skill tool: call by name to load instructions. Skills: {names}".strip()
    detailed = data.get("detailed") or one_line
    return skills, detailed


_SKILLS, _DESC = _list_skills()


def _ensure_openskills() -> Tuple[bool, str]:
    """Check that `openskills` binary is available in PATH."""
    path = shutil.which("openskills")
    if not path:
        return False, "`openskills` CLI not found in PATH. Install with: npm i -g openskills"
    return True, path


def _skill_doc() -> str:
    names = ", ".join(s.get("name", "") for s in _SKILLS)
    meta = "Use the Skill tool to invoke a specific skill by name. "
    if names:
        meta += f"Available skills: {names}."
    else:
        meta += "No skills discovered at startup."
    meta += "\nArgument: command — exact skill name (string)."
    return meta


def Skill(command: str) -> Dict[str, Any]:  # noqa: N802 (keep exact tool name for parity)
    """Dynamically load a skill by name and return JSON for context injection.

    This calls `openskills read <skill> --format=json` and returns the parsed JSON
    containing `newMessages` (with isMeta separation) and `contextModifier` for the host to apply.
    """
    ok, msg = _ensure_openskills()
    if not ok:
        return {"error": msg}

    # Validate against discovered skills; refresh once if unknown
    global _SKILLS, _DESC
    known = {s.get("name", "") for s in _SKILLS}
    if command not in known:
        # one-time refresh to avoid stale cache
        _SKILLS, _DESC = _list_skills()
        known = {s.get("name", "") for s in _SKILLS}
        if command not in known:
            return {"error": f"Unknown skill: {command}", "knownSkills": sorted(list(known))}

    code, out, err = _run(["openskills", "read", command, "--format=json"])
    if code != 0:
        return {"error": err or out or "failed to run openskills"}
    try:
        payload = json.loads(out)
    except Exception as e:  # pragma: no cover - runtime-only
        return {"error": f"invalid JSON from openskills: {e}"}
    return payload


# Register the tool with a dynamic description sourced at startup
Skill.__doc__ = _skill_doc()
Skill = mcp.tool()(Skill)  # type: ignore


@mcp.tool()
def skill_refresh() -> Dict[str, Any]:
    """Refresh the Skill tool's cached skill list and return current metadata."""
    global _SKILLS, _DESC
    _SKILLS, _DESC = _list_skills()
    return {"skills": _SKILLS, "description": _DESC}


if __name__ == "__main__":
    mcp.run(transport="stdio")
