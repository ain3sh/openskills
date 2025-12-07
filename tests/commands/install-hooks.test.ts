import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { installHooks } from '../../src/commands/install-hooks';

vi.mock('node:fs');
vi.mock('node:os');

describe('installHooks', () => {
  const homeDir = path.normalize('/home/user');
  const cwd = path.normalize('/project');

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);
    vi.spyOn(process, 'cwd').mockReturnValue(cwd);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Default mocks
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.readFileSync).mockReturnValue('{}');
  });

  it('should create aliases and update global settings by default (claude)', async () => {
    await installHooks({});

    // Check bin dir creation
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining(path.join('.openskills', 'bin')), 
      { recursive: true }
    );

    // Check aliases creation
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(path.join('.openskills', 'bin', 'install-skill')),
      expect.stringContaining('openskills install'),
      expect.any(Object)
    );

    // Check settings update
    const settingsPath = path.join(homeDir, '.claude', 'settings.json');
    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    const settingsCall = writeCalls.find(call => (call[0] as string) === settingsPath);
    
    expect(settingsCall).toBeDefined();
    const writtenSettings = JSON.parse(settingsCall![1] as string);
    expect(writtenSettings.hooks.SessionStart[0].hooks[0].command).toBe('openskills session-hook');
  });

  it('should support droid agent', async () => {
    await installHooks({ agent: 'droid' });

    const settingsPath = path.join(homeDir, '.factory', 'settings.json');
    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    const settingsCall = writeCalls.find(call => (call[0] as string) === settingsPath);
    
    expect(settingsCall).toBeDefined();
    
    // Verify Droid-specific hook format per Factory cookbook
    const writtenSettings = JSON.parse(settingsCall![1] as string);
    const hookEntry = writtenSettings.hooks.SessionStart[0];
    
    // Droid format: no matcher field
    expect(hookEntry.matcher).toBeUndefined();
    
    // Droid format: includes timeout
    expect(hookEntry.hooks[0].timeout).toBe(10);
    expect(hookEntry.hooks[0].command).toBe('openskills session-hook');
  });

  it('should use matcher for claude agent', async () => {
    await installHooks({ agent: 'claude' });

    const settingsPath = path.join(homeDir, '.claude', 'settings.json');
    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    const settingsCall = writeCalls.find(call => (call[0] as string) === settingsPath);
    
    expect(settingsCall).toBeDefined();
    
    // Verify Claude-specific hook format
    const writtenSettings = JSON.parse(settingsCall![1] as string);
    const hookEntry = writtenSettings.hooks.SessionStart[0];
    
    // Claude format: uses matcher
    expect(hookEntry.matcher).toBe('startup|resume|compact');
    
    // Claude format: no timeout
    expect(hookEntry.hooks[0].timeout).toBeUndefined();
    expect(hookEntry.hooks[0].command).toBe('openskills session-hook');
  });

  it('should update project settings when requested', async () => {
    await installHooks({ project: true });

    const settingsPath = path.join(cwd, '.claude', 'settings.json');
    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    const settingsCall = writeCalls.find(call => (call[0] as string) === settingsPath);
    
    expect(settingsCall).toBeDefined();
  });

  it('should not write settings file in manual mode', async () => {
    await installHooks({ manual: true });

    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    // Should only write alias scripts, not settings.json
    const settingsWrites = writeCalls.filter(call => 
      (call[0] as string).endsWith('settings.json')
    );
    
    expect(settingsWrites).toHaveLength(0);
    // But should still create aliases
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(path.join('.openskills', 'bin', 'install-skill')),
      expect.stringContaining('openskills install'),
      expect.any(Object)
    );
  });
  
  it('should preserve existing hooks', async () => {
    const existingSettings = {
      hooks: {
        SessionStart: [
          { matcher: 'startup', hooks: [{ command: 'echo hello' }] }
        ]
      }
    };
    
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingSettings));

    await installHooks({});

    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    // Need to find the settings.json call, checking both user and project logic (default is global)
    const settingsPath = path.join(homeDir, '.claude', 'settings.json');
    const settingsCall = writeCalls.find(call => (call[0] as string) === settingsPath);
    
    const writtenSettings = JSON.parse(settingsCall![1] as string);
    expect(writtenSettings.hooks.SessionStart).toHaveLength(2);
    expect(writtenSettings.hooks.SessionStart[0].hooks[0].command).toBe('echo hello');
    expect(writtenSettings.hooks.SessionStart[1].hooks[0].command).toBe('openskills session-hook');
  });
});
