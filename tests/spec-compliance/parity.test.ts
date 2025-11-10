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

describe('Blog Spec Compliance: Overall Parity (lines 692-785)', () => {
  let tempDir: string;
  let skillsDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `openskills-parity-${Date.now()}`);
    skillsDir = join(tempDir, '.openskills', 'skills');
    mkdirSync(skillsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('read and invoke mirror Claude blog example for complex skill', () => {
    const skillDir = join(skillsDir, 'pdf-example');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: pdf-example
description: Mirrors blog pdf flow
version: 1.2.3
license: MIT
allowed-tools: Read, Bash(pdftotext:*)
model: claude-3-sonnet
tokens: 4096
---

You are a PDF processing specialist.

Use the bundled helper in ./scripts/extract.sh and cite ./references/summary.md.
`);

    const readJson = run('read', 'pdf-example', tempDir, '--attachments warnings');
    const invokeJson = run('invoke', 'pdf-example', tempDir, '--attachments warnings');

    expect(readJson.newMessages).toEqual(invokeJson.newMessages);
    expect(readJson.contextModifier).toEqual(invokeJson.contextModifier);
    expect(readJson.attachments).toEqual(invokeJson.attachments);

    const metadataMessage = readJson.newMessages[0];
    const promptMessage = readJson.newMessages[1];
    const permissionMessage = readJson.newMessages.find((msg: any) =>
      typeof msg.content === 'object' && msg.content?.type === 'command_permissions'
    );
    const attachmentMessages = readJson.newMessages.filter((msg: any) => msg.attachmentType);

    expect(metadataMessage.isMeta).toBe(false);
    expect(promptMessage.isMeta).toBe(true);
    expect(permissionMessage).toBeDefined();
    expect(permissionMessage!.isMeta).toBe(true);
    expect(permissionMessage!.content.allowedTools).toEqual(['Read', 'Bash(pdftotext:*)']);
    expect(permissionMessage!.content.model).toBe('claude-3-sonnet');
    expect(attachmentMessages.length).toBeGreaterThan(0);
    attachmentMessages.forEach((msg: any) => expect(msg.isMeta).toBe(true));
  });

  it('maintains two-message base even with attachments and permissions', () => {
    const skillDir = join(skillsDir, 'base-check');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: base-check
description: ensures base pattern
allowed-tools: Read
version: 0.0.1
---

See ./scripts/tool.sh for helpers.
`);

    const json = run('invoke', 'base-check', tempDir);
    expect(json.newMessages[0].isMeta).toBe(false);
    expect(json.newMessages[1].isMeta).toBe(true);
    expect(json.newMessages.filter((msg: any) => !msg.isMeta).length).toBe(1);
    expect(json.newMessages.filter((msg: any) => msg.isMeta).length).toBe(json.newMessages.length - 1);
    expect(json.newMessages.length).toBeGreaterThanOrEqual(3);
  });
});
