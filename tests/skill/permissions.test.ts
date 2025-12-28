import { describe, it, expect } from 'vitest';
import { checkSkillPermissions } from '../../src/skill/permissions.js';
import type { PermissionRule } from '../../src/types.js';

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
