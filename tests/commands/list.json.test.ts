import { describe, it, expect, vi } from 'vitest';
import { listSkills } from '../../src/commands/list.js';

describe('list --format=json purity', () => {
  it('emits only JSON without prelude/header', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      listSkills({ format: 'json', all: true });
      expect(logSpy).toHaveBeenCalledTimes(1);
      const arg = String(logSpy.mock.calls[0][0] ?? '');
      expect(() => JSON.parse(arg)).not.toThrow();
    } finally {
      logSpy.mockRestore();
    }
  });
});
