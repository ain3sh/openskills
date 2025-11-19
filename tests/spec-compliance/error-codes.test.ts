import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { validateSkillCommand } from '../../src/utils/validation.js';
import { SkillErrorCode } from '../../src/types.js';

const CLI = join(process.cwd(), 'dist', 'cli.js');

function runCliExpectError(args: string[], cwd: string) {
  try {
    execSync(`node ${CLI} ${args.join(' ')}`, { cwd, encoding: 'utf8' });
    throw new Error('Command unexpectedly succeeded');
  } catch (err: any) {
    const output = err.stdout?.toString() || err.message;
    return output.trim();
  }
}

describe('Blog Spec Compliance: Error Codes (lines 820-845)', () => {
  let tempDir: string;
  let skillsDir: string;
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
    tempDir = join(tmpdir(), `openskills-errors-${Date.now()}`);
    skillsDir = join(tempDir, '.agent', 'skills');
    mkdirSync(skillsDir, { recursive: true });

    // valid skill for baseline
    mkdirSync(join(skillsDir, 'valid-skill'), { recursive: true });
    writeFileSync(join(skillsDir, 'valid-skill', 'SKILL.md'), `---
name: valid-skill
description: baseline
version: 1.0.0
---

Body
`);

    // disable invocation
    mkdirSync(join(skillsDir, 'disabled-skill'), { recursive: true });
    writeFileSync(join(skillsDir, 'disabled-skill', 'SKILL.md'), `---
name: disabled-skill
description: disabled
disable-model-invocation: true
---

Body
`);

    // missing description (not prompt-based)
    mkdirSync(join(skillsDir, 'no-desc-skill'), { recursive: true });
    writeFileSync(join(skillsDir, 'no-desc-skill', 'SKILL.md'), `---
name: no-desc-skill
---

Body
`);

    // load failed scenario (SKILL.md is directory, not file)
    mkdirSync(join(skillsDir, 'load-failed', 'SKILL.md'), { recursive: true });

    process.chdir(tempDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('enumerates the five blog error codes via SkillErrorCode', () => {
    expect(SkillErrorCode.EMPTY_COMMAND).toBe(1);
    expect(SkillErrorCode.UNKNOWN_SKILL).toBe(2);
    expect(SkillErrorCode.LOAD_FAILED).toBe(3);
    expect(SkillErrorCode.INVOCATION_DISABLED).toBe(4);
    expect(SkillErrorCode.NOT_PROMPT_BASED).toBe(5);
  });

  it('returns EMPTY_COMMAND when input blank (blog line 824)', () => {
    const result = validateSkillCommand('   ');
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(SkillErrorCode.EMPTY_COMMAND);
  });

  it('returns UNKNOWN_SKILL for absent skills (blog line 829)', () => {
    const result = validateSkillCommand('ghost-skill');
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(SkillErrorCode.UNKNOWN_SKILL);

    const output = runCliExpectError(['load', 'ghost-skill'], tempDir);
    // load prints error to stderr, validate via output text if capture stderr, but runCliExpectError captures stdout/err
    expect(output).toContain('Unknown skill: ghost-skill');
  });

  it('returns LOAD_FAILED when SKILL.md unreadable (blog line 833)', () => {
    const result = validateSkillCommand('load-failed');
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(SkillErrorCode.LOAD_FAILED);
    expect(result.message).toContain('Failed to load');
  });

  it('returns INVOCATION_DISABLED for protected skills (blog line 836)', () => {
    const result = validateSkillCommand('disabled-skill');
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(SkillErrorCode.INVOCATION_DISABLED);

    const output = runCliExpectError(['load', 'disabled-skill'], tempDir);
    // load prints error to stderr
    // "Error: Skill "disabled-skill" cannot be automatically invoked" (or similar from checkSkillPermissions)
    // Actually load.ts: "Permission denied by permission rules"?
    // No, wait. disable-model-invocation sets contextModifier.disableModelInvocation.
    // Does it block `load`?
    // The `validateSkillCommand` check returns INVOCATION_DISABLED if frontmatter has it.
    // `load` calls `validateSkillCommand`? Yes.
    // So it should exit with error code.
    // Error message might be "Error: Skill invocation is disabled..." 
    // Let's check checkSkillPermissions/validateSkillCommand usage in load.ts.
    
    // load.ts:
    // const validation = validateSkillCommand(skillName);
    // if (!validation.valid) { console.error(validation.message); process.exit(errorCode); }
    
    expect(output).toContain('cannot be automatically invoked');
  });

  it('returns NOT_PROMPT_BASED when description missing (blog line 841)', () => {
    const result = validateSkillCommand('no-desc-skill');
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe(SkillErrorCode.NOT_PROMPT_BASED);
  });
});
