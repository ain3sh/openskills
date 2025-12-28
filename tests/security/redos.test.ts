import { describe, it, expect } from 'vitest';
import { extractRelativeRefs } from '../../src/skill/refs.js';

/**
 * ReDoS (Regular Expression Denial of Service) Security Tests
 * 
 * These tests verify that regex patterns are bounded and cannot cause
 * catastrophic backtracking that would freeze the Node.js event loop.
 * 
 * All tests should complete in < 100ms. If a test hangs, it indicates
 * an unbounded regex vulnerability.
 */

describe('extractRelativeRefs', () => {
  describe('basic functionality', () => {
    it('finds references/scripts/assets paths', () => {
      const body = `See references/foo.pdf and scripts/run.sh. Image: assets/img/logo.png`;
      const refs = extractRelativeRefs(body);
      expect(refs).toContain('references/foo.pdf');
      expect(refs).toContain('scripts/run.sh');
      expect(refs).toContain('assets/img/logo.png');
    });
  });

  describe('security bounds', () => {
    it('ignores overly long path segments and excessive nesting', () => {
      const longSeg = 'a'.repeat(200);
      const many = Array.from({ length: 20 }, () => longSeg).join('/');
      const malicious = ` see ( ${'references/' + many} ) and also scripts/${longSeg}`;
      const ok = 'assets/img/logo.png';
      const body = `${malicious} plus ${ok}`;
      const refs = extractRelativeRefs(body);
      expect(refs).toContain('assets/img/logo.png');
      expect(refs.find((r) => r.includes(longSeg))).toBeUndefined();
    });
  });

  describe('ReDoS protection', () => {
    it('should handle normal paths quickly', () => {
      const start = Date.now();
      const md = 'Use `scripts/init.py` and `references/guide.md`';
      const refs = extractRelativeRefs(md);
      const elapsed = Date.now() - start;
      
      expect(refs).toContain('scripts/init.py');
      expect(refs).toContain('references/guide.md');
      expect(elapsed).toBeLessThan(100);
    });

    it('should reject paths with segments > 100 chars', () => {
      const longSegment = 'a'.repeat(150);
      const md = `scripts/${longSegment}/file.py`;
      const refs = extractRelativeRefs(md);
      
      // Should not match because segment exceeds MAX_PATH_SEGMENT_LENGTH (100)
      expect(refs).toEqual([]);
    });

    it('should truncate paths deeper than 10 levels', () => {
      // Create a path with 15 nested levels (15 'a/' segments after 'scripts/')
      const deepPath = 'scripts/' + 'a/'.repeat(15) + 'file.py';
      const md = `Use ${deepPath}`;
      const refs = extractRelativeRefs(md);
      
      // Regex matches up to 11 path components after the base (scripts/references/assets)
      // Pattern: base + required_segment + up_to_10_more = 11 total after base
      expect(refs).toHaveLength(1);
      expect(refs[0]).toBe('scripts/a/a/a/a/a/a/a/a/a/a/a'); // 11 'a' components
    });

    it('should NOT hang on malicious input (catastrophic backtracking attack)', () => {
      const start = Date.now();
      // Attack vector: Long nested path that could cause exponential backtracking
      const malicious = 'scripts/' + 'a/'.repeat(100) + 'aaaaaaaaaaaaaa';
      const md = `Use ${malicious}`;
      const refs = extractRelativeRefs(md);
      const elapsed = Date.now() - start;
      
      // Should complete quickly (< 100ms) even with malicious input
      expect(elapsed).toBeLessThan(100);
      // Should match up to the limit (11 components) and truncate the rest
      expect(refs).toHaveLength(1);
      expect(refs[0]).toBe('scripts/a/a/a/a/a/a/a/a/a/a/a'); // 11 'a' components
    });

    it('should handle maximum valid path (100 chars x 10 levels)', () => {
      const start = Date.now();
      // Maximum valid path: 10 segments of 100 chars each
      const segments = Array(10).fill('a'.repeat(100));
      const validPath = `scripts/${segments.join('/')}`;
      const md = `Use ${validPath}`;
      const refs = extractRelativeRefs(md);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(100);
      expect(refs).toHaveLength(1);
    });
  });
});
