import { describe, it, expect } from 'vitest';
import { lintFrontmatter } from '../../src/utils/frontmatterLint.js';

describe('lintFrontmatter', () => {
  it('flags unknown keys and type mismatches', () => {
    const res = lintFrontmatter({
      name: 'test',
      description: ['not-string'],
      foo: 'bar',
      enabled: 'yes',
      aliases: [1, 2, 3],
    } as any);
    expect(res.unknownKeys).toContain('foo');
    expect(res.typeErrors.some((s) => s.includes('description'))).toBe(true);
    expect(res.typeErrors.some((s) => s.includes('enabled'))).toBe(true);
    expect(res.typeErrors.some((s) => s.includes('aliases'))).toBe(true);
  });
});
