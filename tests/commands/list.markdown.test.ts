import { describe, it, expect, vi } from 'vitest';
import { listSkills } from '../../src/commands/list.js';
import { mockSkills } from '../utils/mockSkills.js'; // Hypothetical mock?
// Actually, listSkills relies on disk scan. We should mock 'findSkill' or run in isolated env.
// But listSkills imports findAllSkills from ../utils/skills.js which scans disk.
// If we run this in the repo root, it scans actual skills.
// If there is a skill that is broken/missing, it might fail.
// The error was ENOENT: no such file or directory, open '/mnt/d/Personal_Folders/Tocho/ain3sh/openskills/.claude/skills/huge/SKILL.md'
// It seems `findAllSkills` found a skill named `huge` but `readFileSync` failed?
// This suggests a race condition or a stale cache or a symlink issue?
// Or maybe 'huge' is a test skill created by another test that wasn't cleaned up properly?

// Let's mock findAllSkills to return predictable data.
import * as skillsUtils from '../../src/skill/discovery.js';

vi.mock('../../src/skill/discovery.js', async () => {
  return {
    findAllSkills: vi.fn(() => [
      {
        name: 'mock-skill',
        description: 'A mock skill',
        location: 'project',
        path: '/mock/path/SKILL.md',
        baseDir: '/mock/path'
      }
    ]),
    findSkill: vi.fn((name) => {
        if (name === 'mock-skill') {
            return {
                path: '/mock/path/SKILL.md',
                baseDir: '/mock/path'
            };
        }
        return null;
    })
  };
});

import { readFileSync } from 'fs';
vi.mock('fs', async () => {
    const actual = await vi.importActual('fs');
    return {
        ...actual,
        readFileSync: vi.fn((path, encoding) => {
            if (path === '/mock/path/SKILL.md') {
                return '---\nname: mock-skill\ndescription: A mock skill\n---\n';
            }
            return (actual as any).readFileSync(path, encoding);
        })
    };
});

describe('list command output', () => {
  it('emits Markdown list by default', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      listSkills({ all: true });
      
      const output = logSpy.mock.calls.map(args => args.join(' ')).join('\n');
      
      expect(output).toContain('# Available Skills (1)');
      expect(output).toContain('## Project Skills (1)');
      expect(output).toContain('**mock-skill**: A mock skill');
      
      // Ensure no JSON
      expect(() => JSON.parse(output)).toThrow();
    } finally {
      logSpy.mockRestore();
      vi.restoreAllMocks();
    }
  });
});
