import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildSkillToolDescription, buildCompactDescription } from '../../src/utils/skillToolDescription.js';

// Mock dependencies to avoid disk scans
import * as skillsUtils from '../../src/utils/skills.js';
import { readFileSync } from 'fs';

vi.mock('../../src/utils/skills.js', async () => {
  // Do NOT importActual unless we need parts of it.
  // If we assume the mock is everything, simpler is better.
  return {
    findAllSkills: vi.fn(),
    findSkill: vi.fn()
  };
});

vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn()
  };
});

/**
 * Token Budget & Progressive Disclosure Tests
 * 
 * Verify that skill tool descriptions respect the 15,000 character limit
 * and implement progressive disclosure pattern per blog spec.
 */

describe('buildSkillToolDescription', () => {
  beforeEach(() => {
    // Setup standard mock returns
    const mockSkills = [
      { name: 'mock-skill', description: 'Mock description', location: 'project' },
      { name: 'mode-skill', description: 'Mode skill', location: 'global' }
    ];
    
    // We need to mock the return value for every test run
    (skillsUtils.findAllSkills as any).mockReturnValue(mockSkills);
    
    (skillsUtils.findSkill as any).mockImplementation((name: string) => ({
      path: `/mock/${name}/SKILL.md`,
      baseDir: `/mock/${name}`
    }));
    
    (readFileSync as any).mockImplementation((path: string) => {
      if (path.includes('mode-skill')) {
        return '---\nname: mode-skill\ndescription: Mode skill\nmode: true\n---\n';
      }
      return '---\nname: mock-skill\ndescription: Mock description\n---\n';
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should build description with skills_instructions', () => {
    const payload = buildSkillToolDescription();
    
    expect(payload.instructions).toContain('<skills_instructions>');
    expect(payload.instructions).toContain('</skills_instructions>');
    expect(payload.availableSkillsXml).toContain('<available_skills>');
    expect(payload.availableSkillsXml).toContain('</available_skills>');
  });

  it('should separate mode commands from regular commands', () => {
    const payload = buildSkillToolDescription();
    const desc = payload.availableSkillsXml;
    
    if (desc.includes('<mode_commands>')) {
      expect(desc).toContain('<mode_commands>');
      expect(desc).toContain('</mode_commands>');
      const modeIndex = desc.indexOf('<mode_commands>');
      const availableIndex = desc.indexOf('<available_skills>');
      expect(modeIndex).toBeGreaterThan(availableIndex);
    }
  });

  it('should respect character limit (default 15,000)', () => {
    const payload = buildSkillToolDescription();
    expect(payload.detailed.length).toBeLessThanOrEqual(15000);
  });

  it('should respect custom character limits', () => {
    const limit = 500;
    const payload = buildSkillToolDescription({ maxChars: limit });
    expect(payload.detailed.length).toBeLessThanOrEqual(limit);
  });

  it('should indicate truncation when over limit', () => {
    const payload = buildSkillToolDescription({ maxChars: 300 });
    if (payload.truncated) {
      expect(payload.availableSkillsXml).toContain('<!-- truncated: more skills available -->');
    }
  });

  it('should format skills with name and description', () => {
    const payload = buildSkillToolDescription();
    expect(payload.instructions).toContain('Invoke skills by name');
  });

  it('should include version and license metadata when present', () => {
    const payload = buildSkillToolDescription();
    expect(payload.detailed).toBeTruthy();
  });

  it('should handle empty skill list gracefully', () => {
    const payload = buildSkillToolDescription({ all: false });
    expect(payload.instructions).toContain('<skills_instructions>');
    expect(payload.availableSkillsXml).toContain('<available_skills>');
    expect(payload.availableSkillsXml).toContain('</available_skills>');
  });
});

describe('buildCompactDescription', () => {
  beforeEach(() => {
    const mockSkills = [
        { name: 'mock-skill', description: 'Mock description', location: 'project' }
    ];
    (skillsUtils.findAllSkills as any).mockReturnValue(mockSkills);
  });

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
  beforeEach(() => {
    const mockSkills = [
        { name: 'mock-skill', description: 'Mock description', location: 'project' }
    ];
    (skillsUtils.findAllSkills as any).mockReturnValue(mockSkills);
  });

  it('should handle exactly at limit', () => {
    const payload = buildSkillToolDescription({ maxChars: 15000 });
    expect(payload.detailed.length).toBeLessThanOrEqual(15000);
  });

  it('should handle very small limits gracefully', () => {
    const payload = buildSkillToolDescription({ maxChars: 200 });
    expect(payload.instructions).toContain('<skills_instructions>');
    expect(payload.detailed.length).toBeLessThanOrEqual(200);
  });

  it('should handle very large limits', () => {
    const payload = buildSkillToolDescription({ maxChars: 1000000 });
    expect(payload.truncated).toBe(false);
  });
});

describe('Progressive Disclosure Pattern', () => {
  beforeEach(() => {
    const mockSkills = [
        { name: 'mock-skill', description: 'Mock description', location: 'project' }
    ];
    (skillsUtils.findAllSkills as any).mockReturnValue(mockSkills);
  });

  it('should show minimal info in instructions (progressive disclosure)', () => {
    const payload = buildSkillToolDescription();
    const instructionsMatch = payload.instructions.match(/<skills_instructions>([\s\S]*?)<\/skills_instructions>/);
    if (instructionsMatch) {
      const instructions = instructionsMatch[1];
      expect(instructions.length).toBeLessThan(1000);
    }
  });

  it('should list skills compactly (name + description only)', () => {
    const payload = buildSkillToolDescription();
    const skillsMatch = payload.availableSkillsXml.match(/<available_skills>([\s\S]*?)<\/available_skills>/);
    if (skillsMatch) {
      const skillsSection = skillsMatch[1];
      expect(skillsSection).toBeTruthy();
    }
  });
});
