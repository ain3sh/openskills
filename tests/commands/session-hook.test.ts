import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { sessionHook } from '../../src/commands/session-hook';

vi.mock('node:fs');
vi.mock('node:os');

describe('sessionHook', () => {
  const homeDir = path.normalize('/home/user');
  const envFile = path.normalize('/tmp/env_file');

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // mock process.exit to avoid killing test runner
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    delete process.env.CLAUDE_ENV_FILE;
    delete process.env.DROID_ENV_FILE;
    delete process.env.FACTORY_ENV_FILE;
  });

  it('should append PATH to CLAUDE_ENV_FILE', async () => {
    process.env.CLAUDE_ENV_FILE = envFile;
    await sessionHook();

    const expectedBin = path.join(homeDir, '.openskills', 'bin');
    const expectedContent = `\nexport PATH="${expectedBin}:$PATH"\n`;
    
    expect(fs.appendFileSync).toHaveBeenCalledWith(envFile, expectedContent);
  });

  it('should append PATH to DROID_ENV_FILE', async () => {
    process.env.DROID_ENV_FILE = envFile;
    await sessionHook();

    const expectedBin = path.join(homeDir, '.openskills', 'bin');
    const expectedContent = `\nexport PATH="${expectedBin}:$PATH"\n`;
    
    expect(fs.appendFileSync).toHaveBeenCalledWith(envFile, expectedContent);
  });

  it('should do nothing if no ENV_FILE is set', async () => {
    await sessionHook();
    expect(fs.appendFileSync).not.toHaveBeenCalled();
  });
});
