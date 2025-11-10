import { describe, it, expect } from 'vitest';
import { extractRelativeRefs } from '../../src/utils/refs.js';
import { normalizePermissions } from '../../src/utils/permissions.js';

/**
 * ReDoS (Regular Expression Denial of Service) Security Tests
 * 
 * These tests verify that regex patterns are bounded and cannot cause
 * catastrophic backtracking that would freeze the Node.js event loop.
 * 
 * All tests should complete in < 100ms. If a test hangs, it indicates
 * an unbounded regex vulnerability.
 */

describe('ReDoS Protection', () => {
  describe('extractRelativeRefs', () => {
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

  describe('normalizePermissions', () => {
    it('should handle normal tool names quickly', () => {
      const start = Date.now();
      const perms = normalizePermissions({
        allowed: ['Read', 'Write', 'Bash(git:*)']
      });
      const elapsed = Date.now() - start;
      
      expect(perms.tools).toContain('Read');
      expect(perms.tools).toContain('Edit'); // Write→Edit normalized
      expect(perms.tools).toContain('Execute'); // Bash→Execute normalized
      expect(perms.shellAllowPatterns).toContain('git:*');
      expect(elapsed).toBeLessThan(100);
    });

    it('should reject tool names > 50 chars', () => {
      const longToolName = 'a'.repeat(100);
      const perms = normalizePermissions({
        allowed: [longToolName]
      });
      
      // Should not match the regex, falls back to adding trimmed string
      expect(perms.tools).toContain(longToolName);
    });

    it('should NOT hang on malicious tool name (unbounded outer group attack)', () => {
      const start = Date.now();
      // Attack vector: Tool name with 10,000+ word characters
      const malicious = 'a'.repeat(10000);
      const perms = normalizePermissions({
        allowed: [malicious]
      });
      const elapsed = Date.now() - start;
      
      // Should complete quickly (< 100ms) even with malicious input
      expect(elapsed).toBeLessThan(100);
      // Should still add to tools (fallback when regex doesn't match)
      expect(perms.tools).toHaveLength(1);
    });

    it('should handle maximum valid tool name (50 chars)', () => {
      const start = Date.now();
      const maxToolName = 'a'.repeat(50);
      const perms = normalizePermissions({
        allowed: [`${maxToolName}(pattern)`]
      });
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(100);
      expect(perms.tools).toHaveLength(1);
      expect(perms.shellAllowPatterns).toContain('pattern');
    });

    it('should reject scoped patterns > 1000 chars', () => {
      const longPattern = 'a'.repeat(1500);
      const perms = normalizePermissions({
        allowed: [`Bash(${longPattern})`]
      });
      
      // Regex won't match due to pattern length limit
      expect(perms.tools).toHaveLength(1);
    });
  });
});
