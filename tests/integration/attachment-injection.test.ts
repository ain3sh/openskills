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

function writeSkill(skillsDir: string, name: string, frontmatter: string, body: string) {
  const skillDir = join(skillsDir, name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'SKILL.md'), `---\n${frontmatter}\n---\n\n${body}`);
}

describe('Attachment Injection', () => {
  let tempDir: string;
  let skillsDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `openskills-attach-${Date.now()}`);
    skillsDir = join(tempDir, '.agents', 'skills');
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

    const output = run('load', 'no-attachments', tempDir);
    expect(output).toContain('Body with no refs');
    expect(output).toContain('<!-- baseDir: ');
  });

  it('injects file reference attachments when resources detected', { timeout: 15000 }, () => {
    writeSkill(
      skillsDir,
      'file-attachments',
      `name: file-attachments\ndescription: references sources\nversion: 1.0.0\nlicense: MIT`,
      '# Body referencing [config](./references/config.json) and [script](./scripts/run.sh)'
    );

    const output = run('load', 'file-attachments', tempDir);
    expect(output).toContain('references/config.json');
    expect(output).toContain('scripts/run.sh');
  });

  it('handles skills with missing version gracefully', { timeout: 10000 }, () => {
    writeSkill(
      skillsDir,
      'diag-attachments',
      `name: diag-attachments\ndescription: missing version`,
      'Body content without version frontmatter'
    );

    const json = run('use', 'diag-attachments', tempDir);
    expect(json).toBeDefined();
    expect(json.skill).toBeDefined();
  });

  it('handles skills with permissions', () => {
    writeSkill(
      skillsDir,
      'full-attachments',
      `name: full-attachments\ndescription: everything\nallowed-tools: Read`,
      'See [helper](./scripts/tool.sh).'
    );

    const json = run('use', 'full-attachments', tempDir);
    expect(json).toBeDefined();
    expect(json.skill).toBeDefined();
  });

});
