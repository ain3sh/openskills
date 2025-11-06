import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { askUserPermission } from '../../src/utils/interactive.js';

describe('askUserPermission', () => {
  let originalIsTTY: boolean | undefined;
  
  beforeEach(() => {
    // Save original TTY state
    originalIsTTY = process.stdin.isTTY;
  });
  
  afterEach(() => {
    // Restore original TTY state
    if (originalIsTTY !== undefined) {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: originalIsTTY,
        writable: true,
        configurable: true
      });
    }
    vi.restoreAllMocks();
  });
  
  it('returns true when force flag is set', async () => {
    const result = await askUserPermission('test-skill', { force: true });
    expect(result).toBe(true);
  });
  
  it('bypasses prompt with yes option', async () => {
    const result = await askUserPermission('pdf-extractor', { force: true });
    expect(result).toBe(true);
  });
  
  it('returns false in non-interactive mode', async () => {
    const result = await askUserPermission('test-skill', { nonInteractive: true });
    expect(result).toBe(false);
  });
  
  it('returns false when stdin is not TTY', async () => {
    // Mock stdin.isTTY to false
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      writable: true,
      configurable: true
    });
    
    const result = await askUserPermission('test-skill');
    expect(result).toBe(false);
  });
  
  it('returns false when stdout is not TTY', async () => {
    // Mock both stdin and stdout TTY status
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      writable: true,
      configurable: true
    });
    Object.defineProperty(process.stdout, 'isTTY', {
      value: false,
      writable: true,
      configurable: true
    });
    
    const result = await askUserPermission('test-skill');
    expect(result).toBe(false);
  });
  
  it('force flag takes precedence over non-interactive mode', async () => {
    // Even in non-interactive, force should approve
    const result = await askUserPermission('test-skill', { 
      force: true, 
      nonInteractive: true 
    });
    expect(result).toBe(true);
  });
  
  it('handles multiple skills with force flag', async () => {
    const skills = ['pdf', 'xlsx', 'docx'];
    const results = await Promise.all(
      skills.map(skill => askUserPermission(skill, { force: true }))
    );
    expect(results).toEqual([true, true, true]);
  });
  
  it('provides helpful warning in non-interactive mode', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    await askUserPermission('dangerous-skill', { nonInteractive: true });
    
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Non-interactive mode')
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('--yes flag')
    );
    
    warnSpy.mockRestore();
  });
  
  it('does not show warnings when force is true', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    await askUserPermission('test-skill', { force: true, nonInteractive: true });
    
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
