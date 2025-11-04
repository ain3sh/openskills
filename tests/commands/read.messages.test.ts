import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { writeFileSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

describe('read --format=json message visibility', () => {
  const baseDir = join(process.cwd(), '.claude', 'skills', 'test-skill');
  const skillPath = join(baseDir, 'SKILL.md');

  beforeAll(() => {
    // Create a fake skill folder/file
    if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true });
    writeFileSync(
      skillPath,
      `---\nname: test-skill\ndescription: A test skill\nallowed-tools: [Read]\nmodel: fake-model\n---\n\n# Body\nHello world.\n`
    );
  });

  afterAll(() => {
    rmSync(join(process.cwd(), '.claude'), { recursive: true, force: true });
  });

  it('emits exactly one visible command-message and hides skill+metadata', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mod = await import('../../src/commands/read.js');
    try {
      mod.readSkill('test-skill', { format: 'json' });
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
    } finally {
      logSpy.mockRestore();
    }
  });
});
