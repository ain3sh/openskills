import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { writeFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('load command', () => {
  const testDir = join(tmpdir(), `openskills-load-test-${Date.now()}`);
  const skillsDir = join(testDir, '.claude', 'skills');
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);

    // Create a complete skill
    const completeSkillDir = join(skillsDir, 'complete-skill');
    mkdirSync(completeSkillDir, { recursive: true });
    writeFileSync(
      join(completeSkillDir, 'SKILL.md'),
      `---
name: complete-skill
description: A complete test skill
version: 1.0.0
license: MIT
---

# Complete Skill

This skill has all required fields.
`
    );

    // Create a minimal skill (no version/license)
    const minimalSkillDir = join(skillsDir, 'minimal-skill');
    mkdirSync(minimalSkillDir, { recursive: true });
    writeFileSync(
      join(minimalSkillDir, 'SKILL.md'),
      `---
name: minimal-skill
description: A minimal test skill
---

# Minimal Skill

This skill has only required fields.
`
    );
  });

  afterAll(() => {
    process.chdir(originalCwd);
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('outputs skill prompt with baseDir comment', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const mod = await import('../../src/commands/load.js');
      await mod.loadSkill('complete-skill', { yes: true });
      
      const output = String(logSpy.mock.calls[0][0] ?? '');
      expect(output).toContain('<!-- baseDir:');
      expect(output).toContain('Complete Skill');
      expect(output).toContain('all required fields');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('loads minimal skill without errors', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const mod = await import('../../src/commands/load.js');
      await mod.loadSkill('minimal-skill', { yes: true });
      
      const output = String(logSpy.mock.calls[0][0] ?? '');
      expect(output).toContain('<!-- baseDir:');
      expect(output).toContain('Minimal Skill');
    } finally {
      logSpy.mockRestore();
    }
  });
});
