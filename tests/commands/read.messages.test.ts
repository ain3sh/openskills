import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { writeFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('read --format=json message visibility', () => {
  // Use tmpdir with unique name to avoid conflicts
  const testDir = join(tmpdir(), `openskills-messages-test-${Date.now()}`);
  const baseDir = join(testDir, '.claude', 'skills', 'test-skill');
  const skillPath = join(baseDir, 'SKILL.md');
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
    // Change to test directory for skill discovery
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
    
    // Create a fake skill folder/file
    mkdirSync(baseDir, { recursive: true });
    writeFileSync(
      skillPath,
      `---\nname: test-skill\ndescription: A test skill\nallowed-tools: [Read]\nmodel: fake-model\n---\n\n# Body\nHello world.\n`
    );
  });

  afterAll(() => {
    // Restore original directory
    process.chdir(originalCwd);
    // Remove entire test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('emits exactly one visible command-message and hides skill+metadata', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mod = await import('../../src/commands/read.js');
    try {
      await mod.readSkill('test-skill', { format: 'json', yes: true });
      expect(logSpy).toHaveBeenCalledTimes(1);
      const arg = String(logSpy.mock.calls[0][0] ?? '');
      const payload = JSON.parse(arg);
      const msgs = payload?.newMessages || [];
      const visible = msgs.filter((m: any) => !m.isMeta);
      const hidden = msgs.filter((m: any) => m.isMeta);
      expect(visible.length).toBe(1);
      expect(String(visible[0]?.content || '')).toContain('<command-message>');
      // Two hidden: body and metadata
      expect(hidden.length).toBe(2);
      const hiddenText = hidden.map((m: any) => String(m.content || '')).join('\n');
      expect(hiddenText).toContain('<!-- baseDir: ');
      expect(hiddenText).toContain('<metadata ');
      
      // Attachments may be present (diagnostics for missing version/license)
      // This is okay - we're testing message visibility, not attachment presence
      expect(payload.attachments === undefined || Array.isArray(payload.attachments)).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });
});
