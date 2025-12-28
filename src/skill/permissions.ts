import type { PermissionRule, PermissionCheckResult } from '../types.js';

// Security constant to prevent ReDoS (Regular Expression Denial of Service)
const MAX_SKILL_PATTERN_LENGTH = 100; // Max characters for skill name patterns

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
function matchesPattern(name: string, pattern: string): boolean {
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
