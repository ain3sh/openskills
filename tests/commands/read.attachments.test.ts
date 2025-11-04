import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { writeFileSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

describe('read --format=json attachments', () => {
  const baseDir = join(process.cwd(), '.claude', 'skills', 'attach-test');
  const skillPath = join(baseDir, 'SKILL.md');

  beforeEach(() => {
    // Create fresh directory for each test
    if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(join(process.cwd(), '.claude'), { recursive: true, force: true });
  });

  it('includes diagnostics attachment when skill has no version/license', async () => {
    writeFileSync(
      skillPath,
      `---\nname: attach-test\ndescription: Test skill for attachments\n---\n\n# Test\nNo version or license.`
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const mod = await import('../../src/commands/read.js');
      mod.readSkill('attach-test', { format: 'json' });
      
      const output = JSON.parse(String(logSpy.mock.calls[0][0] ?? '{}'));
      
      expect(output.attachments).toBeDefined();
      expect(output.attachments.length).toBeGreaterThan(0);
      
      const diagnostic = output.attachments.find((a: any) => a.type === 'diagnostics');
      expect(diagnostic).toBeDefined();
      expect(diagnostic.content).toContain('version');
      expect(diagnostic.content).toContain('license');
      expect(diagnostic.metadata.level).toBe('warning');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('includes file_reference attachment when skill has bundled resources', async () => {
    writeFileSync(
      skillPath,
      `---\nname: attach-test\ndescription: Test skill with references\nversion: 1.0.0\nlicense: MIT\n---\n\n# Test\nSee [config](./references/config.json) and [script](./scripts/helper.py).`
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const mod = await import('../../src/commands/read.js');
      mod.readSkill('attach-test', { format: 'json' });
      
      const output = JSON.parse(String(logSpy.mock.calls[0][0] ?? '{}'));
      
      expect(output.attachments).toBeDefined();
      
      const fileRef = output.attachments.find((a: any) => a.type === 'file_reference');
      expect(fileRef).toBeDefined();
      expect(fileRef.content).toContain('references/config.json');
      expect(fileRef.content).toContain('scripts/helper.py');
      expect(fileRef.metadata.count).toBe(2);
      expect(fileRef.metadata.files).toContain('references/config.json');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('excludes attachments field when nothing to attach', async () => {
    writeFileSync(
      skillPath,
      `---\nname: attach-test\ndescription: Complete skill\nversion: 1.0.0\nlicense: MIT\n---\n\n# Test\nNo issues or resources.`
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const mod = await import('../../src/commands/read.js');
      mod.readSkill('attach-test', { format: 'json' });
      
      const output = JSON.parse(String(logSpy.mock.calls[0][0] ?? '{}'));
      
      // attachments field should be undefined when empty
      expect(output.attachments).toBeUndefined();
    } finally {
      logSpy.mockRestore();
    }
  });

  it('includes multiple attachments when applicable', async () => {
    writeFileSync(
      skillPath,
      `---\nname: attach-test\ndescription: Skill with both issues and resources\n---\n\n# Test\nSee [helper](./scripts/tool.sh).`
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const mod = await import('../../src/commands/read.js');
      mod.readSkill('attach-test', { format: 'json' });
      
      const output = JSON.parse(String(logSpy.mock.calls[0][0] ?? '{}'));
      
      expect(output.attachments).toBeDefined();
      expect(output.attachments.length).toBe(2);  // diagnostics + file_reference
      
      const types = output.attachments.map((a: any) => a.type);
      expect(types).toContain('diagnostics');
      expect(types).toContain('file_reference');
    } finally {
      logSpy.mockRestore();
    }
  });
});
