import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI = join(process.cwd(), 'dist', 'cli.js');

function runCli(command: 'load' | 'use', skill: string, cwd: string) {
  const output = execSync(`node ${CLI} ${command} ${skill}`, {
    cwd,
    env: { ...process.env, HOME: cwd },
    encoding: 'utf8'
  });
  if (command === 'use') {
    return JSON.parse(output);
  }
  return output;
}

function createSkill(base: string, name: string, frontmatter: string, body = 'Skill body content') {
  const skillDir = join(base, name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'SKILL.md'), `---\n${frontmatter}\n---\n\n${body}`);
}

describe('Permission Injection', () => {
  let tempDir: string;
  let skillsDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `openskills-perm-${Date.now()}`);
    skillsDir = join(tempDir, '.agent', 'skills');
    mkdirSync(skillsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('does not inject permissions when allowed-tools/model absent', () => {
    createSkill(skillsDir, 'minimal-perm', `name: minimal-perm\ndescription: No extra permissions\nversion: 1.0.0`);

    const output = runCli('load', 'minimal-perm', tempDir);
    expect(output).toContain('Skill body content');
    expect(output).toContain('<!-- baseDir: ');
  });

  it('parses allowed-tools into permissions', { timeout: 15000 }, () => {
    createSkill(
      skillsDir,
      'tool-perm',
      `name: tool-perm\ndescription: Uses explicit allowed tools\nversion: 1.0.0\nallowed-tools: Read, Write ,  Bash(git:*)`
    );

    const json = runCli('use', 'tool-perm', tempDir);
    
    expect(json.permissions).toBeDefined();
    expect(json.permissions.allowedTools).toEqual(['Read', 'Write', 'Bash(git:*)']);
    expect(json.permissions.model).toBeUndefined();
  });

  it('parses model into permissions', () => {
    createSkill(
      skillsDir,
      'model-perm',
      `name: model-perm\ndescription: Requests claude-3-haiku\nversion: 1.0.0\nmodel: claude-3-haiku`
    );

    const json = runCli('use', 'model-perm', tempDir);
    
    expect(json.permissions).toBeDefined();
    expect(json.permissions.model).toBe('claude-3-haiku');
  });

  it('parses both allowed-tools and model', () => {
    createSkill(
      skillsDir,
      'consistency-perm',
      `name: consistency-perm\ndescription: Both permissions\nversion: 1.0.0\nallowed-tools: Read\nmodel: claude-3-sonnet`
    );

    const json = runCli('use', 'consistency-perm', tempDir);
    
    expect(json.permissions).toEqual({
      allowedTools: ['Read'],
      model: 'claude-3-sonnet'
    });
  });
});
