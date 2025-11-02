import { describe, it, expect } from 'vitest';
import { normalizePermissions } from '../../src/utils/permissions.js';

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
