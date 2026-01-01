import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI = join(process.cwd(), 'dist', 'cli.js');

function run(command: 'load' | 'use', skill: string, cwd: string, extra = '') {
  const output = execSync(`node ${CLI} ${command} ${skill} ${extra}`.trim(), {
    cwd,
    env: { ...process.env, HOME: cwd },
    encoding: 'utf8'
  });
  if (command === 'use') {
    return JSON.parse(output);
  }
  return output;
}

describe('Load/Use Parity', () => {
  let tempDir: string;
  let skillsDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `openskills-parity-${Date.now()}`);
    skillsDir = join(tempDir, '.agent', 'skills');
    mkdirSync(skillsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('load returns text, use returns JSON for same skill', { timeout: 10000 }, () => {
    const skillDir = join(skillsDir, 'pdf-example');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: pdf-example
description: PDF processing skill
version: 1.2.3
license: MIT
allowed-tools: Read, Bash(pdftotext:*)
model: claude-3-sonnet
---

You are a PDF processing specialist.
`);

    const loadOutput = run('load', 'pdf-example', tempDir);
    const useJson = run('use', 'pdf-example', tempDir);

    expect(loadOutput).toContain('You are a PDF processing specialist');
    
    expect(useJson.skill).toBeDefined();
    expect(useJson.skill.name).toBe('pdf-example');
    expect(useJson.permissions).toEqual({
      allowedTools: ['Read', 'Bash(pdftotext:*)'],
      model: 'claude-3-sonnet'
    });
  });

  it('use returns permissions from frontmatter', () => {
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

    const json = run('use', 'base-check', tempDir);
    expect(json).toBeDefined();
    expect(json.skill.name).toBe('base-check');
    expect(json.permissions).toEqual({ allowedTools: ['Read'] });
  });
});
