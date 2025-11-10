import type { PermissionRule, PermissionCheckResult } from '../types.js';

// Security constants to prevent ReDoS (Regular Expression Denial of Service)
const MAX_TOOL_NAME_LENGTH = 50; // Max characters for tool name
const MAX_PATTERN_LENGTH = 1000; // Max characters for scoped permission patterns
const MAX_SKILL_PATTERN_LENGTH = 100; // Max characters for skill name patterns

export interface NormalizedPermissions {
  tools?: string[];
  shellAllowPatterns?: string[];
  shellDenyPatterns?: string[];
}

/**
 * Parse allowed-tools/deny-tools patterns like:
 * - "Read", "Edit", "Execute(git*,node)", "Bash(pdftotext*)"
 * 
 * Security: Regex is bounded to prevent catastrophic backtracking (ReDoS)
 * - Tool names limited to 50 chars
 * - Scoped patterns limited to 1000 chars
 * - Attack vector prevented: Tool names with 10,000+ word characters
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
  // Support comma-separated strings ("Read,Write,Execute(git:*)")
  const s = String(v);
  if (s.includes(',')) return s.split(',').map((p) => p.trim()).filter(Boolean);
  return [s.trim()];
}

function parseOne(item: string, toolSet?: Set<string>, shellPatterns?: Set<string>) {
  // Bounded regex: tool name max 50 chars, patterns max 1000 chars (prevents ReDoS)
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

/**
 * Check skill permissions against rules
 * 
 * Implements three-tier precedence per blog spec:
 * 1. Deny rules (block immediately) - highest priority
 * 2. Allow rules (permit if matched) - medium priority
 * 3. Ask behavior (default) - lowest priority
 * 
 * @param skillName - Name of skill to check (e.g., "pdf-extractor", "plugin:tools")
 * @param rules - Array of permission rules
 * @returns Permission check result with behavior and optional message
 */
export function checkSkillPermissions(
  skillName: string,
  rules: PermissionRule[]
): PermissionCheckResult {
  // 1. Check deny rules first (highest priority)
  for (const rule of rules.filter(r => r.behavior === 'deny')) {
    if (matchesPattern(skillName, rule.pattern)) {
      return {
        behavior: 'deny',
        message: rule.message || `Blocked by permission rule: ${rule.pattern}`
      };
    }
  }
  
  // 2. Check allow rules (medium priority)
  for (const rule of rules.filter(r => r.behavior === 'allow')) {
    if (matchesPattern(skillName, rule.pattern)) {
      return { behavior: 'allow' };
    }
  }
  
  // 3. Default: ask user (lowest priority)
  return {
    behavior: 'ask',
    message: `Execute skill: ${skillName}?`
  };
}

/**
 * Match skill name against pattern with wildcard support
 * 
 * Supported patterns:
 * - "pdf" - Exact match
 * - "pdf*" - Prefix (starts with "pdf")
 * - "*-creator" - Suffix (ends with "-creator")
 * - "plugin:*" - Prefix with colon
 * - "*" - Match all
 * 
 * Security: Pattern length bounded to prevent ReDoS
 * 
 * @param name - Skill name to test
 * @param pattern - Pattern with wildcards (* and ?)
 * @returns true if name matches pattern
 */
export function matchesPattern(name: string, pattern: string): boolean {
  // Security: Bound pattern length to prevent ReDoS
  if (pattern.length > MAX_SKILL_PATTERN_LENGTH) return false;
  
  // Exact match (fast path)
  if (pattern === name) return true;
  
  // Match all
  if (pattern === '*') return true;
  
  // Case-insensitive comparison
  const lowerName = name.toLowerCase();
  const lowerPattern = pattern.toLowerCase();
  
  // Escape regex special chars except * and ?
  const escaped = lowerPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape special chars
    .replace(/\*/g, '.*')                  // * becomes .*
    .replace(/\?/g, '.');                  // ? becomes .
  
  // Create bounded regex
  const regex = new RegExp(`^${escaped}$`);
  return regex.test(lowerName);
}
