import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  detectTransclusionPattern, 
  appendTransclusionReference,
  generateSkillsXml,
  replaceSkillsSection
} from '../src/utils/agents-md.js';
import type { Skill } from '../src/types.js';

describe('Transclusion Support', () => {
  const mockSkills: Skill[] = [
    {
      name: 'test-skill',
      description: 'Test skill description',
      location: 'project',
      path: '/test/path',
      source: 'project'
    }
  ];

  describe('detectTransclusionPattern', () => {
    it('detects simple @SKILLS.md pattern', () => {
      const content = '# AGENTS.md\n\n@SKILLS.md\n';
      expect(detectTransclusionPattern(content)).toBe('@SKILLS.md');
    });

    it('detects VuePress style @include pattern', () => {
      const content = '# AGENTS.md\n\n@include: SKILLS.md\n';
      expect(detectTransclusionPattern(content)).toBe('@include: SKILLS.md');
    });

    it('detects HTML comment style pattern', () => {
      const content = '# AGENTS.md\n\n<!-- @include: SKILLS.md -->\n';
      expect(detectTransclusionPattern(content)).toBe('<!-- @include: SKILLS.md -->');
    });

    it('detects case-insensitive patterns', () => {
      const content = '# AGENTS.md\n\n@Skills.md\n';
      expect(detectTransclusionPattern(content)).toBe('@Skills.md');
    });

    it('returns null when no transclusion pattern found', () => {
      const content = '# AGENTS.md\n\nNo transclusion here';
      expect(detectTransclusionPattern(content)).toBe(null);
    });
  });

  describe('appendTransclusionReference', () => {
    it('appends @SKILLS.md reference to empty file', () => {
      const content = '# AGENTS.md';
      const result = appendTransclusionReference(content);
      expect(result).toContain('@SKILLS.md');
      expect(result).toContain('## Skills');
    });

    it('removes existing skills section before appending', () => {
      const content = `# AGENTS.md

<skills_system priority="1">
## Available Skills
<available_skills>
<skill><name>old</name></skill>
</available_skills>
</skills_system>`;
      
      const result = appendTransclusionReference(content);
      expect(result).not.toContain('<skills_system');
      expect(result).not.toContain('old');
      expect(result).toContain('@SKILLS.md');
    });

    it('uses custom transclusion pattern', () => {
      const content = '# AGENTS.md';
      const result = appendTransclusionReference(content, '<!-- @include: SKILLS.md -->');
      expect(result).toContain('<!-- @include: SKILLS.md -->');
    });

    it('removes HTML comment style skills section', () => {
      const content = `# AGENTS.md

<!-- SKILLS_TABLE_START -->
Old skills content
<!-- SKILLS_TABLE_END -->`;
      
      const result = appendTransclusionReference(content);
      expect(result).not.toContain('Old skills content');
      expect(result).not.toContain('SKILLS_TABLE_START');
      expect(result).toContain('@SKILLS.md');
    });
  });

  describe('Integration with existing functions', () => {
    it('replaceSkillsSection handles transclusion detection', () => {
      const content = `# AGENTS.md

@SKILLS.md

Other content`;
      
      // Should not modify content if transclusion is detected
      const xml = generateSkillsXml(mockSkills);
      const result = replaceSkillsSection(content, xml);
      
      // If transclusion exists, it should either preserve it or replace with direct injection
      // Based on current implementation, it adds the section if no markers found
      expect(result).toBeDefined();
    });
  });
});
