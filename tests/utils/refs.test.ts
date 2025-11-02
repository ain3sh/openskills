import { describe, it, expect } from 'vitest';
import { extractRelativeRefs } from '../../src/utils/refs.js';

describe('extractRelativeRefs', () => {
  it('finds references/scripts/assets paths', () => {
    const body = `See references/foo.pdf and scripts/run.sh. Image: assets/img/logo.png`;
    const refs = extractRelativeRefs(body);
    expect(refs).toContain('references/foo.pdf');
    expect(refs).toContain('scripts/run.sh');
    expect(refs).toContain('assets/img/logo.png');
  });
});
