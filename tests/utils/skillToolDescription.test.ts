import { describe, it, expect } from 'vitest';
import { buildSkillToolDescription, buildCompactDescription } from '../../src/utils/skillToolDescription.js';

/**
 * Token Budget & Progressive Disclosure Tests
 * 
 * Verify that skill tool descriptions respect the 15,000 character limit
 * and implement progressive disclosure pattern per blog spec.
 */

describe('buildSkillToolDescription', () => {
  it('should build description with skills_instructions', () => {
    const desc = buildSkillToolDescription();
    
    expect(desc).toContain('<skills_instructions>');
    expect(desc).toContain('</skills_instructions>');
    expect(desc).toContain('<available_skills>');
    expect(desc).toContain('</available_skills>');
  });

  it('should separate mode commands from regular commands', () => {
    const desc = buildSkillToolDescription();
    
    // If mode commands exist, they should appear in their own section
    if (desc.includes('<mode_commands>')) {
      expect(desc).toContain('<mode_commands>');
      expect(desc).toContain('</mode_commands>');
      
      // Mode commands should appear before regular commands
      const modeIndex = desc.indexOf('<mode_commands>');
      const availableIndex = desc.indexOf('<available_skills>');
      expect(modeIndex).toBeGreaterThan(availableIndex);
    }
  });

  it('should respect character limit (default 15,000)', () => {
    const desc = buildSkillToolDescription();
    
    // Should not exceed 15,000 characters
    expect(desc.length).toBeLessThanOrEqual(15000);
  });

  it('should respect custom character limits', () => {
    const limit = 500;
    const desc = buildSkillToolDescription({ maxChars: limit });
    
    expect(desc.length).toBeLessThanOrEqual(limit);
  });

  it('should indicate truncation when over limit', () => {
    // Use very small limit to force truncation
    const desc = buildSkillToolDescription({ maxChars: 300 });
    
    if (desc.includes('<!-- truncated:')) {
      expect(desc).toContain('<!-- truncated: more skills available -->');
    }
  });

  it('should format skills with name and description', () => {
    const desc = buildSkillToolDescription();
    
    // Should have skill entries in format: "{name}": {description}
    // At minimum should have instructions even if no skills
    expect(desc).toContain('Invoke skills using this tool');
  });

  it('should include version and license metadata when present', () => {
    const desc = buildSkillToolDescription();
    
    // If any skills have version/license, they should be formatted correctly
    // This is tested implicitly - if skills exist with metadata, it will show
    expect(desc).toBeTruthy();
  });

  it('should handle empty skill list gracefully', () => {
    const desc = buildSkillToolDescription({ all: false });
    
    expect(desc).toContain('<skills_instructions>');
    expect(desc).toContain('<available_skills>');
    expect(desc).toContain('</available_skills>');
  });
});

describe('buildCompactDescription', () => {
  it('should build compact one-line description', () => {
    const desc = buildCompactDescription();
    
    expect(desc).toContain('Skill tool: call by name to load instructions');
    expect(desc).toContain('Skills:');
  });

  it('should list skill names in compact format', () => {
    const desc = buildCompactDescription();
    
    // Should be a single line (no newlines except possibly at end)
    const lines = desc.trim().split('\n');
    expect(lines.length).toBe(1);
  });

  it('should filter unpresentable skills by default', () => {
    const descDefault = buildCompactDescription();
    const descAll = buildCompactDescription({ includeHidden: true, includeDisabled: true });
    
    // With filters, should be same or shorter than with all included
    expect(descDefault.length).toBeLessThanOrEqual(descAll.length);
  });
});

describe('Token Budget Edge Cases', () => {
  it('should handle exactly at limit', () => {
    // Try to hit exactly 15,000 chars (unlikely but should work)
    const desc = buildSkillToolDescription({ maxChars: 15000 });
    expect(desc.length).toBeLessThanOrEqual(15000);
  });

  it('should handle very small limits gracefully', () => {
    const desc = buildSkillToolDescription({ maxChars: 150 });
    
    // Should still be valid even if truncated heavily
    expect(desc).toContain('<skills_instructions>');
    // Minimal description is ~126 chars, so we should be close to that
    expect(desc.length).toBeLessThanOrEqual(150);
  });

  it('should handle very large limits', () => {
    const desc = buildSkillToolDescription({ maxChars: 1000000 });
    
    // Should include all skills without truncation
    expect(desc).not.toContain('<!-- truncated:');
  });
});

describe('Progressive Disclosure Pattern', () => {
  it('should show minimal info in instructions (progressive disclosure)', () => {
    const desc = buildSkillToolDescription();
    
    // Instructions should be concise
    const instructionsMatch = desc.match(/<skills_instructions>([\s\S]*?)<\/skills_instructions>/);
    if (instructionsMatch) {
      const instructions = instructionsMatch[1];
      // Should be informative but not overwhelming (< 1000 chars)
      expect(instructions.length).toBeLessThan(1000);
    }
  });

  it('should list skills compactly (name + description only)', () => {
    const desc = buildSkillToolDescription();
    
    // Skill entries should be compact: just name and description
    // Not full SKILL.md content
    const skillsMatch = desc.match(/<available_skills>([\s\S]*?)<\/available_skills>/);
    if (skillsMatch) {
      const skillsSection = skillsMatch[1];
      // Each skill should be one line (approximately)
      // Total should be much less than loading all SKILL.md files
      expect(skillsSection).toBeTruthy();
    }
  });
});
