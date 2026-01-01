import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs, { PathOrFileDescriptor } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parse } from 'jsonc-parser';
import { installHooks } from '../../src/commands/install-hooks';

type ReadFileSyncFn = (path: PathOrFileDescriptor) => string;

vi.mock('node:fs');
vi.mock('node:os');

describe('installHooks', () => {
  const homeDir = path.normalize('/home/user');
  const cwd = path.normalize('/project');

  const getWriteCall = (filePath: string) => {
    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    return writeCalls.find((call) => (call[0] as string) === filePath);
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);
    vi.spyOn(process, 'cwd').mockReturnValue(cwd);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.readFileSync).mockReturnValue('{}');
  });

  it('should install session hook script and update global settings by default (claude)', async () => {
    await installHooks({});

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining(path.join('.openskills', 'bin')), { recursive: true });

    const sessionHookScriptPath = path.join(homeDir, '.openskills', 'bin', 'openskills-session-hook');
    const sessionHookCall = getWriteCall(sessionHookScriptPath);
    expect(sessionHookCall).toBeDefined();
    const sessionHookText = (sessionHookCall![1] as string).toString();
    expect(sessionHookText).toContain('CLAUDE_ENV_FILE');
    expect(sessionHookText).toContain('export PATH="%s:%s"');

    const settingsPath = path.join(homeDir, '.claude', 'settings.json');
    const settingsCall = getWriteCall(settingsPath);

    expect(settingsCall).toBeDefined();
    const writtenSettings = JSON.parse((settingsCall![1] as string).toString());
    const entry = writtenSettings.hooks.SessionStart[0];
    const syncEntry = writtenSettings.hooks.SessionStart[1];

    expect(entry.matcher).toBe('startup');
    expect(entry.hooks[0].type).toBe('command');
    expect(entry.hooks[0].command).toBe(sessionHookScriptPath);
    expect(entry.hooks[0].timeout).toBe(10);

    expect(syncEntry.matcher).toBeUndefined();
    expect(syncEntry.hooks[0].type).toBe('command');
    expect(syncEntry.hooks[0].command).toContain('sync');
    expect(syncEntry.hooks[0].timeout).toBe(10);
  });

  it('should support droid agent and write to ~/.factory/settings.json', async () => {
    await installHooks({ agent: 'droid' });

    const sessionHookScriptPath = path.join(homeDir, '.openskills', 'bin', 'openskills-session-hook');

    const sessionHookCall = getWriteCall(sessionHookScriptPath);
    expect(sessionHookCall).toBeDefined();
    const sessionHookText = (sessionHookCall![1] as string).toString();
    expect(sessionHookText).toContain('ENV_FILE="${CLAUDE_ENV_FILE:-}"');
    expect(sessionHookText).toContain('# ENV_FILE="${DROID_ENV_FILE:-}"');
    expect(sessionHookText).toContain('export PATH="%s:%s"');

    const settingsPath = path.join(homeDir, '.factory', 'settings.json');
    const settingsCall = getWriteCall(settingsPath);

    expect(settingsCall).toBeDefined();
    const writtenSettings = JSON.parse((settingsCall![1] as string).toString());
    const entry = writtenSettings.hooks.SessionStart[0];
    const syncEntry = writtenSettings.hooks.SessionStart[1];

    expect(entry.matcher).toBe('startup');
    expect(entry.hooks[0].type).toBe('command');
    expect(entry.hooks[0].command).toBe(sessionHookScriptPath);
    expect(entry.hooks[0].timeout).toBe(10);

    expect(syncEntry.matcher).toBeUndefined();
    expect(syncEntry.hooks[0].type).toBe('command');
    expect(syncEntry.hooks[0].command).toContain('sync');
    expect(syncEntry.hooks[0].timeout).toBe(10);
  });

  it('should update project settings when requested', async () => {
    await installHooks({ project: true });

    const settingsPath = path.join(cwd, '.claude', 'settings.json');
    const settingsCall = getWriteCall(settingsPath);

    expect(settingsCall).toBeDefined();
  });

  it('should not write settings file in manual mode', async () => {
    await installHooks({ manual: true, agent: 'droid' });

    const settingsPath = path.join(homeDir, '.factory', 'settings.json');
    const settingsWrites = vi
      .mocked(fs.writeFileSync)
      .mock.calls.filter((call) => (call[0] as string) === settingsPath);

    expect(settingsWrites).toHaveLength(0);

    const outputText = vi
      .mocked(console.log)
      .mock.calls.map((c) => String(c[0] ?? ''))
      .join('\n');

    expect(outputText).toContain('Manual Configuration');
    expect(outputText).toContain('SessionStart');
  });

  it('should preserve existing hooks and append our SessionStart entry', async () => {
    const existingSettings = {
      hooks: {
        SessionStart: [{ matcher: 'startup', hooks: [{ type: 'command', command: 'echo hello' }] }],
        PreToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'echo pre' }] }],
      },
      otherKey: 'keep-me',
    };

    const settingsPath = path.join(homeDir, '.claude', 'settings.json');

    vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
      const str = p.toString();
      if (str === settingsPath) return true;
      return false;
    });

    vi.mocked(fs.readFileSync).mockImplementation(((p: PathOrFileDescriptor) => {
      const str = p.toString();
      if (str === settingsPath) return JSON.stringify(existingSettings);
      return '{}';
    }) as ReadFileSyncFn);

    await installHooks({});

    const settingsCall = getWriteCall(settingsPath);
    expect(settingsCall).toBeDefined();

    const written = JSON.parse((settingsCall![1] as string).toString());

    expect(written.otherKey).toBe('keep-me');
    expect(written.hooks.PreToolUse[0].hooks[0].command).toBe('echo pre');

    expect(written.hooks.SessionStart).toHaveLength(3);
    expect(written.hooks.SessionStart[0].hooks[0].command).toBe('echo hello');
    expect(written.hooks.SessionStart[1].hooks[0].command).toBe(path.join(homeDir, '.openskills', 'bin', 'openskills-session-hook'));
    expect(written.hooks.SessionStart[2].hooks[0].command).toContain('sync');
  });

  it('should parse and update Factory JSONC with in-body comments (droid)', async () => {
    const settingsPath = path.join(homeDir, '.factory', 'settings.json');
    const jsonc = `// Factory CLI Settings\n{\n  \"commandAllowlist\": [\n    \"ls\"\n  ],\n  // Commands that will be automatically allowed without confirmation.\n  \"hooks\": {\n    \"SessionStart\": []\n  }\n}`;

    vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => p.toString() === settingsPath);
    vi.mocked(fs.readFileSync).mockImplementation(((p: PathOrFileDescriptor) => (p.toString() === settingsPath ? jsonc : '{}')) as ReadFileSyncFn);

    await installHooks({ agent: 'droid' });

    const settingsCall = getWriteCall(settingsPath);
    expect(settingsCall).toBeDefined();

    const writtenText = (settingsCall![1] as string).toString();
    expect(writtenText).toContain('Commands that will be automatically allowed');

    const parsed = parse(writtenText) as any;
    expect(parsed.hooks.SessionStart[0].hooks[0].command).toBe(path.join(homeDir, '.openskills', 'bin', 'openskills-session-hook'));
    expect(parsed.hooks.SessionStart[1].hooks[0].command).toContain('sync');
  });

  it('should allow force overwrite on invalid JSON and write a backup', async () => {
    const settingsPath = path.join(homeDir, '.factory', 'settings.json');

    vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => p.toString() === settingsPath);
    vi.mocked(fs.readFileSync).mockImplementation(((p: PathOrFileDescriptor) => (p.toString() === settingsPath ? 'not json' : '{}')) as ReadFileSyncFn);

    await installHooks({ agent: 'droid', force: true });

    const backupCall = getWriteCall(`${settingsPath}.bak`);
    expect(backupCall).toBeDefined();

    const settingsCall = getWriteCall(settingsPath);
    expect(settingsCall).toBeDefined();

    const writtenSettings = JSON.parse((settingsCall![1] as string).toString());
    expect(Array.isArray(writtenSettings.hooks.SessionStart)).toBe(true);
  });

  it('should be idempotent for settings updates', async () => {
    const settingsPath = path.join(homeDir, '.claude', 'settings.json');
    const sessionHookScriptPath = path.join(homeDir, '.openskills', 'bin', 'openskills-session-hook');

    let settingsExists = false;
    let settingsText = '{}';

    vi.mocked(fs.existsSync).mockImplementation((p: fs.PathLike) => {
      const str = p.toString();
      if (str === settingsPath) return settingsExists;
      return false;
    });

    vi.mocked(fs.readFileSync).mockImplementation(((p: PathOrFileDescriptor) => {
      const str = p.toString();
      if (str === settingsPath) return settingsText;
      return '{}';
    }) as ReadFileSyncFn);

    vi.mocked(fs.writeFileSync).mockImplementation((p: any, data: any) => {
      const str = p.toString();
      if (str === settingsPath) {
        settingsExists = true;
        settingsText = data.toString();
      }
    });

    await installHooks({ agent: 'claude' });
    await installHooks({ agent: 'claude' });

    const parsed = JSON.parse(settingsText);
    const entries = parsed.hooks.SessionStart;
    const matches = entries.filter((e: any) => e?.hooks?.some((h: any) => h?.command === sessionHookScriptPath));
    expect(matches).toHaveLength(1);

    const syncMatches = entries.filter((e: any) => e?.hooks?.some((h: any) => typeof h?.command === 'string' && h.command.includes('sync')));
    expect(syncMatches).toHaveLength(1);
  });
});
