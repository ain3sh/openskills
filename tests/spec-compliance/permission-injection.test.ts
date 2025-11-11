import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI = join(process.cwd(), 'dist', 'cli.js');

function runCli(command: 'read' | 'invoke', skill: string, cwd: string) {
  const output = execSync(`node ${CLI} ${command} ${skill} --yes`, {
    cwd,
    encoding: 'utf8'
  });
  return JSON.parse(output);
}

function createSkill(base: string, name: string, frontmatter: string, body = 'Skill body content') {
  const skillDir = join(base, name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'SKILL.md'), `---\n${frontmatter}\n---\n\n${body}`);
}

describe('Blog Spec Compliance: Permission Injection (lines 773-783)', () => {
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

  it('does not inject command_permissions when allowed-tools/model absent (blog line 773)', () => {
    createSkill(skillsDir, 'minimal-perm', `name: minimal-perm\ndescription: No extra permissions\nversion: 1.0.0`);

    const json = runCli('read', 'minimal-perm', tempDir);

    const permissionsMessage = json.newMessages.find((msg: any) =>
      typeof msg.content === 'object' && msg.content?.type === 'command_permissions'
    );

    expect(permissionsMessage).toBeUndefined();
    expect(json.newMessages).toHaveLength(2); // baseline two messages
  });

  it('injects command_permissions when allowed-tools specified (blog line 776)', () => {
    createSkill(
      skillsDir,
      'tool-perm',
      `name: tool-perm\ndescription: Uses explicit allowed tools\nversion: 1.0.0\nallowed-tools: Read, Write ,  Bash(git:*)`
    );

    const json = runCli('invoke', 'tool-perm', tempDir);
    const permissionsMessage = json.newMessages.find((msg: any) =>
      typeof msg.content === 'object' && msg.content?.type === 'command_permissions'
    );

    expect(json.newMessages).toHaveLength(3); // two base + permissions
    expect(permissionsMessage).toBeDefined();
    expect(permissionsMessage!.content.allowedTools).toEqual([
      'Read',
      'Write',
      'Bash(git:*)'
    ]);
    expect(permissionsMessage!.content.model).toBeNull();
  });

  it('injects command_permissions when model override requested (blog line 780)', () => {
    createSkill(
      skillsDir,
      'model-perm',
      `name: model-perm\ndescription: Requests claude-3-haiku\nversion: 1.0.0\nmodel: claude-3-haiku`
    );

    const json = runCli('read', 'model-perm', tempDir);
    const permissionsMessage = json.newMessages.find((msg: any) =>
      typeof msg.content === 'object' && msg.content?.type === 'command_permissions'
    );

    expect(permissionsMessage).toBeDefined();
    expect(permissionsMessage!.content.allowedTools).toEqual([]);
    expect(permissionsMessage!.content.model).toBe('claude-3-haiku');
    expect(json.newMessages.length).toBe(3);
  });

  it('read and invoke emit identical permission payloads (blog line 783)', () => {
    createSkill(
      skillsDir,
      'consistency-perm',
      `name: consistency-perm\ndescription: Consistency check\nversion: 1.0.0\nallowed-tools: Read\nmodel: claude-3-sonnet`
    );

    const readJson = runCli('read', 'consistency-perm', tempDir);
    const invokeJson = runCli('invoke', 'consistency-perm', tempDir);

    const readPerm = readJson.newMessages.find((msg: any) =>
      typeof msg.content === 'object' && msg.content?.type === 'command_permissions'
    );
    const invokePerm = invokeJson.newMessages.find((msg: any) =>
      typeof msg.content === 'object' && msg.content?.type === 'command_permissions'
    );

    expect(readPerm).toBeDefined();
    expect(invokePerm).toBeDefined();
    expect(readPerm!.content).toEqual({
      type: 'command_permissions',
      allowedTools: ['Read'],
      model: 'claude-3-sonnet'
    });
    expect(invokePerm!.content).toEqual(readPerm!.content);
  });
});
