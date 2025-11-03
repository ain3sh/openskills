export interface NormalizedPermissions {
  tools?: string[];
  shellAllowPatterns?: string[];
  shellDenyPatterns?: string[];
}

/**
 * Parse allowed-tools/deny-tools patterns like:
 * - "Read", "Edit", "Execute(git*,node)", "Bash(pdftotext*)"
 */
export function normalizePermissions(input: { allowed?: unknown; deny?: unknown }): NormalizedPermissions {
  const out: NormalizedPermissions = {};
  const allowedArr = toArray(input.allowed);
  const denyArr = toArray(input.deny);

  const toolSet = new Set<string>();
  const shellAllow = new Set<string>();
  const shellDeny = new Set<string>();

  for (const item of allowedArr) parseOne(item, toolSet, shellAllow);
  for (const item of denyArr) parseOne(item, undefined, shellDeny);

  if (toolSet.size) out.tools = Array.from(toolSet);
  if (shellAllow.size) out.shellAllowPatterns = Array.from(shellAllow);
  if (shellDeny.size) out.shellDenyPatterns = Array.from(shellDeny);
  return out;
}

function toArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}

function parseOne(item: string, toolSet?: Set<string>, shellPatterns?: Set<string>) {
  const m = /^(\w{1,50})(?:\(([^)]{0,1000})\))?$/i.exec(item.trim());
  if (!m) {
    if (toolSet) toolSet.add(item.trim());
    return;
  }
  const tool = normalizeToolId(m[1]);
  if (toolSet) toolSet.add(tool);
  const patterns = (m[2] || '').split(',').map((s) => s.trim()).filter(Boolean);
  for (const p of patterns) shellPatterns?.add(p);
}

function normalizeToolId(id: string): string {
  const map: Record<string, string> = {
    write: 'Edit',
    edit: 'Edit',
    create: 'Edit',
    read: 'Read',
    execute: 'Execute',
    bash: 'Execute',
    shell: 'Execute',
    websearch: 'WebSearch',
    fetchurl: 'FetchUrl',
    fetch: 'FetchUrl',
  };
  const key = id.toLowerCase();
  return map[key] || id;
}
