import { describe, it, expect } from 'vitest';
import { normalizePermissions, checkSkillPermissions, matchesPattern } from '../../src/utils/permissions.js';
import type { PermissionRule } from '../../src/types.js';

describe('normalizePermissions', () => {
  it('parses simple tool names', () => {
    const n = normalizePermissions({ allowed: ['Read','Write','WebSearch'] });
    expect(n.tools).toEqual(['Read','Edit','WebSearch']);
    expect(n.shellAllowPatterns).toBeUndefined();
  });

  it('parses tool patterns', () => {
    const n = normalizePermissions({ allowed: ['Execute(git*,node)','Bash(pdftotext*)'] });
    expect(n.tools?.sort()).toEqual(['Execute'].sort());
    expect(n.shellAllowPatterns?.sort()).toEqual(['git*','node','pdftotext*'].sort());
  });

  it('captures deny patterns', () => {
    const n = normalizePermissions({ allowed: ['Read'], deny: ['Execute(rm -rf*,mkfs*)'] });
    expect(n.tools).toEqual(['Read']);
    expect(n.shellDenyPatterns?.length).toBeGreaterThan(0);
  });
});

describe('matchesPattern', () => {
  it('matches exact skill names', () => {
    expect(matchesPattern('pdf-extractor', 'pdf-extractor')).toBe(true);
    expect(matchesPattern('pdf-extractor', 'xlsx-reader')).toBe(false);
  });

  it('matches prefix patterns with *', () => {
    expect(matchesPattern('pdf-extractor', 'pdf*')).toBe(true);
    expect(matchesPattern('pdf-reader', 'pdf*')).toBe(true);
    expect(matchesPattern('xlsx-reader', 'pdf*')).toBe(false);
  });

  it('matches suffix patterns with *', () => {
    expect(matchesPattern('pdf-creator', '*-creator')).toBe(true);
    expect(matchesPattern('skill-creator', '*-creator')).toBe(true);
    expect(matchesPattern('pdf-extractor', '*-creator')).toBe(false);
  });

  it('matches plugin patterns', () => {
    expect(matchesPattern('plugin:pdf-tools', 'plugin:*')).toBe(true);
    expect(matchesPattern('plugin:xlsx-tools', 'plugin:*')).toBe(true);
    expect(matchesPattern('builtin-skill', 'plugin:*')).toBe(false);
  });

  it('matches all with *', () => {
    expect(matchesPattern('any-skill', '*')).toBe(true);
    expect(matchesPattern('plugin:tools', '*')).toBe(true);
  });

  it('is case insensitive', () => {
    expect(matchesPattern('PDF-Extractor', 'pdf*')).toBe(true);
    expect(matchesPattern('pdf-extractor', 'PDF*')).toBe(true);
  });

  it('supports ? wildcard for single character', () => {
    expect(matchesPattern('pdf1', 'pdf?')).toBe(true);
    expect(matchesPattern('pdf2', 'pdf?')).toBe(true);
    expect(matchesPattern('pdf12', 'pdf?')).toBe(false);
  });

  it('rejects patterns over max length (security)', () => {
    const longPattern = 'a'.repeat(101);
    expect(matchesPattern('anything', longPattern)).toBe(false);
  });
});

describe('checkSkillPermissions', () => {
  it('denies when deny rule matches (highest priority)', () => {
    const rules: PermissionRule[] = [
      { pattern: 'dangerous-*', behavior: 'deny', message: 'Blocked for security' },
      { pattern: '*', behavior: 'allow' }, // Allow all
    ];

    const result = checkSkillPermissions('dangerous-skill', rules);
    expect(result.behavior).toBe('deny');
    expect(result.message).toContain('security');
  });

  it('allows when allow rule matches', () => {
    const rules: PermissionRule[] = [
      { pattern: 'pdf*', behavior: 'allow' },
    ];

    const result = checkSkillPermissions('pdf-extractor', rules);
    expect(result.behavior).toBe('allow');
  });

  it('defaults to ask when no rules match', () => {
    const rules: PermissionRule[] = [
      { pattern: 'pdf*', behavior: 'allow' },
    ];

    const result = checkSkillPermissions('xlsx-reader', rules);
    expect(result.behavior).toBe('ask');
    expect(result.message).toContain('xlsx-reader');
  });

  it('implements deny > allow > ask precedence', () => {
    const rules: PermissionRule[] = [
      { pattern: '*', behavior: 'allow' },      // Allow all
      { pattern: 'test*', behavior: 'deny' },   // But deny test*
    ];

    // Deny should win even though allow is first
    const denied = checkSkillPermissions('test-skill', rules);
    expect(denied.behavior).toBe('deny');

    // Non-test skills should be allowed
    const allowed = checkSkillPermissions('pdf-skill', rules);
    expect(allowed.behavior).toBe('allow');
  });

  it('returns ask for empty rules', () => {
    const result = checkSkillPermissions('any-skill', []);
    expect(result.behavior).toBe('ask');
  });

  it('uses custom deny message when provided', () => {
    const rules: PermissionRule[] = [
      { pattern: 'banned', behavior: 'deny', message: 'Custom block message' },
    ];

    const result = checkSkillPermissions('banned', rules);
    expect(result.message).toBe('Custom block message');
  });

  it('generates default deny message when not provided', () => {
    const rules: PermissionRule[] = [
      { pattern: 'blocked', behavior: 'deny' },
    ];

    const result = checkSkillPermissions('blocked', rules);
    expect(result.message).toContain('Blocked by permission rule');
  });
});
