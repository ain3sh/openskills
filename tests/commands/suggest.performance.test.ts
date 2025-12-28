import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { suggestSkills } from '../../src/commands/suggest.js';

const testDir = join(tmpdir(), `openskills-suggest-test-${Date.now()}`);
const skillDir = join(testDir, '.claude/skills/huge');
const skillFile = join(skillDir, 'SKILL.md');
let originalCwd: string;

beforeAll(() => {
  originalCwd = process.cwd();
  mkdirSync(skillDir, { recursive: true });
  const big = 'token '.repeat(50000); // ~300k chars
  const md = `---\nname: huge\ndescription: A huge skill for testing token counting performance\naliases: [tok]\n---\n\n${big}\n`;
  writeFileSync(skillFile, md, 'utf-8');
  process.chdir(testDir);
});

afterAll(() => {
  process.chdir(originalCwd);
  try { rmSync(testDir, { recursive: true, force: true }); } catch {}
});

describe('suggestSkills safe counting', () => {
  it('returns quickly and outputs JSON for long inputs', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      suggestSkills('token', { all: true, limit: 1 });
      expect(log).toHaveBeenCalledTimes(1);
      const out = String(log.mock.calls[0][0] ?? '');
      const arr = JSON.parse(out);
      expect(Array.isArray(arr)).toBe(true);
    } finally {
      log.mockRestore();
    }
  });
});
