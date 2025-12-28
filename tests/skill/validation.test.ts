import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { validateSkillCommand } from '../../src/skill/validation.js';
import { SkillErrorCode } from '../../src/types.js';

describe('validateSkillCommand', () => {
  const testDir = join(tmpdir(), `openskills-validation-test-${Date.now()}`);
  const skillsDir = join(testDir, '.claude/skills');

  beforeAll(() => {
    // Create test skills directory
    mkdirSync(skillsDir, { recursive: true });
    
    // Create a valid skill
    const validSkillDir = join(skillsDir, 'valid-skill');
    mkdirSync(validSkillDir);
    writeFileSync(join(validSkillDir, 'SKILL.md'), `---
name: valid-skill
description: A valid test skill
---

# Valid Skill
This is a valid skill for testing.
`);

    // Create skill without description (not prompt-based)
    const noDescSkillDir = join(skillsDir, 'no-desc-skill');
    mkdirSync(noDescSkillDir);
    writeFileSync(join(noDescSkillDir, 'SKILL.md'), `---
name: no-desc-skill
---

# No Description Skill
This skill has no description.
`);

    // Create skill with completely broken format (no frontmatter delimiters)
    const invalidSkillDir = join(skillsDir, 'broken-skill');
    mkdirSync(invalidSkillDir);
    writeFileSync(join(invalidSkillDir, 'SKILL.md'), `This is not a valid SKILL.md file at all
No frontmatter, no structure.
Just random text.
`);

    // Create skill where SKILL.md is a directory (causes LOAD_FAILED)
    const loadFailedDir = join(skillsDir, 'load-failed');
    mkdirSync(join(loadFailedDir, 'SKILL.md'), { recursive: true });

    // Change to test directory for search
    process.chdir(testDir);
  });

  afterAll(() => {
    // Cleanup
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should return EMPTY_COMMAND error for empty string', () => {
    const result = validateSkillCommand('');
    
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(SkillErrorCode.EMPTY_COMMAND);
    expect(result.message).toContain('Empty skill command');
    expect(result.suggestion).toContain('openskills read');
  });

  it('should return EMPTY_COMMAND error for whitespace-only string', () => {
    const result = validateSkillCommand('   ');
    
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(SkillErrorCode.EMPTY_COMMAND);
  });

  it('should return UNKNOWN_SKILL error for non-existent skill', () => {
    const result = validateSkillCommand('non-existent-skill');
    
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(SkillErrorCode.UNKNOWN_SKILL);
    expect(result.message).toContain('non-existent-skill');
    expect(result.suggestion).toContain('openskills list');
  });

  it('should return NOT_PROMPT_BASED error for skill without description', () => {
    const result = validateSkillCommand('no-desc-skill');
    
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(SkillErrorCode.NOT_PROMPT_BASED);
    expect(result.message).toContain('not prompt-based');
    expect(result.suggestion).toContain('description field');
  });

  it('should return NOT_PROMPT_BASED error for skill with broken format', () => {
    const result = validateSkillCommand('broken-skill');
    
    // Broken frontmatter gets parsed but has no description
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(SkillErrorCode.NOT_PROMPT_BASED);
    expect(result.message).toContain('not prompt-based');
  });

  it('should return LOAD_FAILED error when SKILL.md is unreadable', () => {
    const result = validateSkillCommand('load-failed');
    
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(SkillErrorCode.LOAD_FAILED);
    expect(result.message).toContain('Failed to load');
  });

  it('should return valid result for valid skill', () => {
    const result = validateSkillCommand('valid-skill');
    
    expect(result.valid).toBe(true);
    expect(result.errorCode).toBeUndefined();
    expect(result.message).toBeUndefined();
  });

  it('should provide helpful suggestions for all error cases', () => {
    const testCases = [
      { name: '', hasCode: SkillErrorCode.EMPTY_COMMAND },
      { name: 'unknown', hasCode: SkillErrorCode.UNKNOWN_SKILL },
      { name: 'no-desc-skill', hasCode: SkillErrorCode.NOT_PROMPT_BASED },
    ];

    for (const testCase of testCases) {
      const result = validateSkillCommand(testCase.name);
      expect(result.suggestion).toBeDefined();
      expect(result.suggestion!.length).toBeGreaterThan(10);
      expect(result.errorCode).toBe(testCase.hasCode);
    }
  });
});
