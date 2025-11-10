import { describe, it, expect } from 'vitest';
import { isPresentable } from '../../src/utils/presentability.js';

describe('isPresentable', () => {
  it('requires description or when_to_use by default when requireDescription', () => {
    expect(isPresentable({ enabled: true, description: '' }, { requireDescription: true })).toBe(false);
    expect(isPresentable({ enabled: true, when_to_use: 'Use when X' } as any, { requireDescription: true })).toBe(true);
    expect(isPresentable({ enabled: true, description: 'Desc' }, { requireDescription: true })).toBe(true);
  });
  it('filters hidden/unlisted/disabled by default', () => {
    expect(isPresentable({ enabled: false, description: 'd' }, { requireDescription: true })).toBe(false);
    expect(isPresentable({ hidden: true, description: 'd' }, { requireDescription: true })).toBe(false);
    expect(isPresentable({ unlisted: true, description: 'd' }, { requireDescription: true })).toBe(false);
  });
  it('can include hidden/disabled via options', () => {
    expect(isPresentable({ enabled: false, description: 'd' }, { includeDisabled: true, requireDescription: true })).toBe(true);
    expect(isPresentable({ hidden: true, description: 'd' }, { includeHidden: true, requireDescription: true })).toBe(true);
    expect(isPresentable({ unlisted: true, description: 'd' }, { includeUnlisted: true, requireDescription: true })).toBe(true);
  });
});
