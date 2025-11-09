import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { writeFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadConfig, configToPermissionRules, clearConfigCache } from '../../src/utils/config.js';

describe('loadConfig', () => {
  const testDir = join(tmpdir(), `openskills-config-test-${Date.now()}`);
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });
  
  beforeEach(() => {
    // Clear cache before each test to ensure clean state
    clearConfigCache();
  });

  afterAll(() => {
    process.chdir(originalCwd);
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('returns default config when no files exist', () => {
    const config = loadConfig();
    
    expect(config.tokenBudget).toBe(15000);
    expect(config.permissions?.skills?.default).toBe('ask');
    expect(config.permissions?.skills?.deny).toEqual([]);
    expect(config.permissions?.skills?.allow).toEqual([]);
  });

  it('loads project config', () => {
    writeFileSync(join(testDir, '.openskills.json'), JSON.stringify({
      tokenBudget: 20000,
      permissions: {
        skills: {
          deny: ['dangerous-*'],
          allow: ['pdf', 'xlsx'],
          default: 'deny'
        }
      }
    }));

    const config = loadConfig();
    
    expect(config.tokenBudget).toBe(20000);
    expect(config.permissions?.skills?.default).toBe('deny');
    expect(config.permissions?.skills?.deny).toContain('dangerous-*');
    expect(config.permissions?.skills?.allow).toContain('pdf');
  });

  it('handles invalid JSON gracefully', () => {
    // Delete file first to ensure clean state (cache invalidation)
    try {
      rmSync(join(testDir, '.openskills.json'));
    } catch {
      // File might not exist
    }
    
    // Now write invalid JSON
    writeFileSync(join(testDir, '.openskills.json'), 'invalid json{');
    
    // Should not throw, return defaults
    const config = loadConfig();
    expect(config.tokenBudget).toBe(15000);
  });

  it('merges configs with project overriding global', () => {
    // This test would need to mock homedir, skipping for now
    // In real scenario: global sets tokenBudget: 10000, project sets tokenBudget: 20000
    // Result: tokenBudget should be 20000
  });
});

describe('configToPermissionRules', () => {
  it('converts deny patterns to rules', () => {
    const config = {
      permissions: {
        skills: {
          deny: ['test-*', 'dangerous'],
          allow: [],
          default: 'ask' as const
        }
      },
      tokenBudget: 15000
    };

    const rules = configToPermissionRules(config);
    
    expect(rules.length).toBe(2);
    expect(rules[0]).toEqual({ pattern: 'test-*', behavior: 'deny' });
    expect(rules[1]).toEqual({ pattern: 'dangerous', behavior: 'deny' });
  });

  it('converts allow patterns to rules', () => {
    const config = {
      permissions: {
        skills: {
          deny: [],
          allow: ['pdf*', 'xlsx'],
          default: 'ask' as const
        }
      },
      tokenBudget: 15000
    };

    const rules = configToPermissionRules(config);
    
    expect(rules.length).toBe(2);
    expect(rules[0]).toEqual({ pattern: 'pdf*', behavior: 'allow' });
    expect(rules[1]).toEqual({ pattern: 'xlsx', behavior: 'allow' });
  });

  it('maintains deny before allow order', () => {
    const config = {
      permissions: {
        skills: {
          deny: ['dangerous'],
          allow: ['safe'],
          default: 'ask' as const
        }
      },
      tokenBudget: 15000
    };

    const rules = configToPermissionRules(config);
    
    expect(rules.length).toBe(2);
    expect(rules[0].behavior).toBe('deny');
    expect(rules[1].behavior).toBe('allow');
  });

  it('returns empty array when no permissions defined', () => {
    const config = {
      tokenBudget: 15000
    };

    const rules = configToPermissionRules(config);
    expect(rules).toEqual([]);
  });
});
