import { describe, it, expect } from 'vitest';
import { extractYamlField, hasValidFrontmatter, parseFrontmatter } from '../../src/skill/frontmatter.js';
import { lintFrontmatter } from '../../src/skill/frontmatter.js';

describe('extractYamlField', () => {
  it('should extract field from YAML frontmatter', () => {
    const content = `---
name: test-skill
description: Test description
---

Content`;

    expect(extractYamlField(content, 'name')).toBe('test-skill');
    expect(extractYamlField(content, 'description')).toBe('Test description');
  });

  it('should return empty string if field not found', () => {
    const content = `---
name: test-skill
---`;

    expect(extractYamlField(content, 'missing')).toBe('');
  });

  it('should handle multiline descriptions', () => {
    const content = `---
name: test
description: First line
---`;

    expect(extractYamlField(content, 'description')).toBe('First line');
  });
});

describe('hasValidFrontmatter', () => {
  it('should return true for valid frontmatter', () => {
    const content = `---
name: test
---

Content`;

    expect(hasValidFrontmatter(content)).toBe(true);
  });

  it('should return false for missing frontmatter', () => {
    const content = 'No frontmatter here';
    expect(hasValidFrontmatter(content)).toBe(false);
  });

  it('should return false for empty content', () => {
    expect(hasValidFrontmatter('')).toBe(false);
  });
});

describe('parseFrontmatter', () => {
  it('parses multi-line description and fields', () => {
    const content = `---\nname: pdf\ndescription: |\n  Line 1\n  Line 2\nallowed-tools:\n  - Read\n  - Write\nmodel: anthropic/claude-3.7\n---\nBody here`;
    const { frontmatter, body } = parseFrontmatter<Record<string, any>>(content);
    expect(frontmatter.name).toBe('pdf');
    expect(String(frontmatter.description)).toContain('Line 1');
    expect(Array.isArray(frontmatter['allowed-tools'])).toBe(true);
    expect(frontmatter.model).toBe('anthropic/claude-3.7');
    expect(body.trim()).toBe('Body here');
  });
});

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
