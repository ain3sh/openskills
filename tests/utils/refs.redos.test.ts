import { describe, it, expect } from 'vitest';
import { extractRelativeRefs } from '../../src/utils/refs.js';

describe('extractRelativeRefs security bounds', () => {
  it('ignores overly long path segments and excessive nesting', () => {
    const longSeg = 'a'.repeat(200);
    const many = Array.from({ length: 20 }, () => longSeg).join('/');
    const malicious = ` see ( ${'references/' + many} ) and also scripts/${longSeg}`;
    const ok = 'assets/img/logo.png';
    const body = `${malicious} plus ${ok}`;
    const refs = extractRelativeRefs(body);
    // should capture only the valid reference
    expect(refs).toContain('assets/img/logo.png');
    expect(refs.find((r) => r.includes(longSeg))).toBeUndefined();
  });
});
