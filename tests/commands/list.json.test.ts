import { describe, it, expect, vi } from 'vitest';
import { listSkills } from '../../src/commands/list.js';

describe('list command agent payload', () => {
  it('emits structured JSON snapshot by default', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      listSkills({ all: true });
      expect(logSpy).toHaveBeenCalledTimes(1);
      const arg = String(logSpy.mock.calls[0][0] ?? '');
      const payload = JSON.parse(arg);
      expect(payload).toHaveProperty('instructions');
      expect(payload).toHaveProperty('available_skills_xml');
      expect(Array.isArray(payload.skills)).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });
});
