import { describe, it, expect } from 'vitest';
import { parseFrontmatter, extractYamlField } from '../../src/utils/yaml.js';

describe('parseFrontmatter', () => {
  it('parses multi-line description and fields', () => {
    const content = `---\nname: pdf\ndescription: |\n  Line 1\n  Line 2\nallowed-tools:\n  - Read\n  - Write\nmodel: anthropic/claude-3.7\ndisable-model-invocation: false\n---\nBody here`;
    const { frontmatter, body } = parseFrontmatter<Record<string, any>>(content);
    expect(frontmatter.name).toBe('pdf');
    expect(String(frontmatter.description)).toContain('Line 1');
    expect(Array.isArray(frontmatter['allowed-tools'] ?? frontmatter.allowed_tools)).toBe(true);
    expect(frontmatter.model).toBe('anthropic/claude-3.7');
    expect(frontmatter['disable-model-invocation']).toBe(false);
    expect(body.trim()).toBe('Body here');
  });
});

describe('extractYamlField (compat)', () => {
  it('reads simple string fields', () => {
    const content = `---\nname: test\ndescription: Hello\n---\nX`;
    expect(extractYamlField(content, 'name')).toBe('test');
    expect(extractYamlField(content, 'description')).toBe('Hello');
  });
});
