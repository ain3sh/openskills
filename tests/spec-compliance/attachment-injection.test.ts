import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI = join(process.cwd(), 'dist', 'cli.js');

function run(command: 'read' | 'invoke', skill: string, cwd: string, extra = '') {
  const output = execSync(`node ${CLI} ${command} ${skill} --yes ${extra}`.trim(), {
    cwd,
    encoding: 'utf8'
  });
  return JSON.parse(output);
}

function writeSkill(skillsDir: string, name: string, frontmatter: string, body: string) {
  const skillDir = join(skillsDir, name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'SKILL.md'), `---\n${frontmatter}\n---\n\n${body}`);
}

describe('Blog Spec Compliance: Attachment Injection (lines 768-785)', () => {
  let tempDir: string;
  let skillsDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `openskills-attach-${Date.now()}`);
    skillsDir = join(tempDir, '.openskills', 'skills');
    mkdirSync(skillsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('omits attachment messages when no diagnostics or resources exist', () => {
    writeSkill(
      skillsDir,
      'no-attachments',
      `name: no-attachments\ndescription: Clean skill\nversion: 1.0.0\nlicense: MIT`,
      '# Body with no refs'
    );

    const json = run('read', 'no-attachments', tempDir);
    expect(json.attachments).toBeUndefined();
    expect(json.newMessages.length).toBe(2);
    expect(json.newMessages.every((msg: any) => msg.attachmentType === undefined)).toBe(true);
  });

  it('injects file reference attachments when resources detected', () => {
    writeSkill(
      skillsDir,
      'file-attachments',
      `name: file-attachments\ndescription: references sources\nversion: 1.0.0\nlicense: MIT`,
      '# Body referencing [config](./references/config.json) and [script](./scripts/run.sh)'
    );

    const json = run('read', 'file-attachments', tempDir, '--attachments warnings');

    expect(json.attachments).toBeDefined();
    const attachmentTypes = json.attachments.map((a: any) => a.attachmentType);
    expect(attachmentTypes).toContain('reference');

    const message = json.newMessages.find((msg: any) => msg.attachmentType === 'reference');
    expect(message).toBeDefined();
    expect(message!.isMeta).toBe(true);
    expect(message!.content).toContain('references/config.json');
  });

  it('injects diagnostic attachments when warnings present', () => {
    writeSkill(
      skillsDir,
      'diag-attachments',
      `name: diag-attachments\ndescription: missing version`,
      'Body content without version frontmatter'
    );

    const json = run('invoke', 'diag-attachments', tempDir);
    const diagMessage = json.newMessages.find((msg: any) => msg.attachmentType === 'diagnostic');
    expect(diagMessage).toBeDefined();
    expect(diagMessage!.content).toContain('[WARNING]');
    expect(json.attachments?.some((a: any) => a.attachmentType === 'diagnostic')).toBe(true);
  });

  it('appends attachments after permissions, preserving order', () => {
    writeSkill(
      skillsDir,
      'full-attachments',
      `name: full-attachments\ndescription: everything\nallowed-tools: Read`,
      'See [helper](./scripts/tool.sh).'
    );

    const json = run('invoke', 'full-attachments', tempDir);
    const permIndex = json.newMessages.findIndex((msg: any) =>
      typeof msg.content === 'object' && msg.content?.type === 'command_permissions'
    );
    const attachmentIndices = json.newMessages
      .map((msg: any, idx: number) => ({ idx, msg }))
      .filter(({ msg }) => msg.attachmentType)
      .map(({ idx }) => idx);

    expect(permIndex).toBeGreaterThanOrEqual(0);
    expect(attachmentIndices.length).toBeGreaterThan(0);
    attachmentIndices.forEach((idx) => expect(idx).toBeGreaterThan(permIndex));
    expect(json.attachments.length).toBe(2); // diagnostics + reference
  });

  it('read and invoke share identical attachment payloads', () => {
    writeSkill(
      skillsDir,
      'consistency-attachments',
      `name: consistency-attachments\ndescription: compare read/invoke`,
      'See [doc](./references/doc.md).'
    );

    const readJson = run('read', 'consistency-attachments', tempDir, '--attachments full');
    const invokeJson = run('invoke', 'consistency-attachments', tempDir, '--attachments full');

    expect(readJson.attachments).toBeDefined();
    expect(invokeJson.attachments).toBeDefined();
    expect(readJson.attachments).toEqual(invokeJson.attachments);
    const readAttachmentMessages = readJson.newMessages.filter((msg: any) => msg.attachmentType);
    const invokeAttachmentMessages = invokeJson.newMessages.filter((msg: any) => msg.attachmentType);
    expect(readAttachmentMessages).toEqual(invokeAttachmentMessages);
  });
});
