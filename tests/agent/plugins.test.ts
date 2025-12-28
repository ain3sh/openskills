import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { discoverClaudePluginSkillSources } from '../../src/agent/plugins.js';

function writeJson(path: string, value: unknown) {
  writeFileSync(path, JSON.stringify(value, null, 2));
}

describe('discoverClaudePluginSkillSources (cache-based)', () => {
  let homeDir: string;
  let cwd: string;

  beforeEach(() => {
    homeDir = join(tmpdir(), `openskills-claude-home-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    cwd = join(tmpdir(), `openskills-claude-cwd-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    mkdirSync(homeDir, { recursive: true });
    mkdirSync(cwd, { recursive: true });
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  });

  it('discovers skills from cache directory structure', () => {
    const claudePluginsDir = join(homeDir, '.claude', 'plugins');
    // Cache structure: cache/{marketplace}/{plugin}/{version}/
    const pluginCache = join(claudePluginsDir, 'cache', 'mkt1', 'example-skills', '1.0.0');
    const skillsDir = join(pluginCache, 'skills');

    mkdirSync(join(skillsDir, 'skill-a'), { recursive: true });
    mkdirSync(join(skillsDir, 'skill-b'), { recursive: true });
    writeFileSync(join(skillsDir, 'skill-a', 'SKILL.md'), '---\ndescription: A\n---\n');
    writeFileSync(join(skillsDir, 'skill-b', 'SKILL.md'), '---\ndescription: B\n---\n');

    writeJson(join(claudePluginsDir, 'installed_plugins.json'), {
      version: 1,
      plugins: {
        'example-skills@mkt1': {
          version: '1.0.0',
        },
      },
    });

    // Enabled plugins config
    mkdirSync(join(homeDir, '.claude'), { recursive: true });
    writeJson(join(homeDir, '.claude', 'settings.json'), {
      enabledPlugins: { 'example-skills@mkt1': true },
    });

    const sources = discoverClaudePluginSkillSources({ homeDir, cwd });
    expect(sources).toHaveLength(1);
    expect(sources[0].type).toBe('plugin');
    expect(sources[0].pluginId).toBe('example-skills@mkt1');
    expect(sources[0].pluginEnabled).toBe(true);
    expect(sources[0].layout).toBe('collection');
    expect(sources[0].path).toBe(skillsDir);
  });

  it('discovers collection plugins from cache with disabled status', () => {
    const claudePluginsDir = join(homeDir, '.claude', 'plugins');
    const pluginCache = join(claudePluginsDir, 'cache', 'mkt1', 'my-plugin', '1.0.0');
    const skillsDir = join(pluginCache, 'skills');
    const skillX = join(skillsDir, 'x');

    mkdirSync(skillX, { recursive: true });
    writeFileSync(join(skillX, 'SKILL.md'), '---\ndescription: X\n---\n');

    writeJson(join(claudePluginsDir, 'installed_plugins.json'), {
      version: 1,
      plugins: {
        'my-plugin@mkt1': {
          version: '1.0.0',
        },
      },
    });

    // Enabled plugins config - explicitly disabled
    mkdirSync(join(homeDir, '.claude'), { recursive: true });
    writeJson(join(homeDir, '.claude', 'settings.json'), {
      enabledPlugins: { 'my-plugin@mkt1': false },
    });

    const sources = discoverClaudePluginSkillSources({ homeDir, cwd });
    expect(sources).toHaveLength(1);
    expect(sources[0].path).toBe(skillsDir);
    expect(sources[0].layout).toBe('collection');
    expect(sources[0].pluginId).toBe('my-plugin@mkt1');
    expect(sources[0].pluginEnabled).toBe(false);
  });

  it('leaves pluginEnabled undefined when enabledPlugins is not configured', () => {
    const claudePluginsDir = join(homeDir, '.claude', 'plugins');
    const pluginCache = join(claudePluginsDir, 'cache', 'mkt1', 'my-plugin', '1.0.0');
    const skillsDir = join(pluginCache, 'skills');
    const skillX = join(skillsDir, 'x');

    mkdirSync(skillX, { recursive: true });
    writeFileSync(join(skillX, 'SKILL.md'), '---\ndescription: X\n---\n');

    writeJson(join(claudePluginsDir, 'installed_plugins.json'), {
      version: 1,
      plugins: {
        'my-plugin@mkt1': {
          version: '1.0.0',
        },
      },
    });

    const sources = discoverClaudePluginSkillSources({ homeDir, cwd });
    expect(sources).toHaveLength(1);
    expect(sources[0].pluginEnabled).toBeUndefined();
  });

  it('selects latest semver version when multiple versions exist', () => {
    const claudePluginsDir = join(homeDir, '.claude', 'plugins');
    const cacheBase = join(claudePluginsDir, 'cache', 'mkt1', 'my-plugin');

    // Create multiple version directories
    mkdirSync(join(cacheBase, '1.0.0', 'skills', 'old'), { recursive: true });
    mkdirSync(join(cacheBase, '2.1.0', 'skills', 'new'), { recursive: true });
    mkdirSync(join(cacheBase, '1.5.0', 'skills', 'mid'), { recursive: true });
    writeFileSync(join(cacheBase, '1.0.0', 'skills', 'old', 'SKILL.md'), '---\ndescription: old\n---\n');
    writeFileSync(join(cacheBase, '2.1.0', 'skills', 'new', 'SKILL.md'), '---\ndescription: new\n---\n');
    writeFileSync(join(cacheBase, '1.5.0', 'skills', 'mid', 'SKILL.md'), '---\ndescription: mid\n---\n');

    writeJson(join(claudePluginsDir, 'installed_plugins.json'), {
      version: 1,
      plugins: { 'my-plugin@mkt1': {} },
    });

    const sources = discoverClaudePluginSkillSources({ homeDir, cwd });
    expect(sources).toHaveLength(1);
    // Should pick 2.1.0 as latest
    expect(sources[0].path).toBe(join(cacheBase, '2.1.0', 'skills'));
  });

  it('prefers semver versions over commit hashes', () => {
    const claudePluginsDir = join(homeDir, '.claude', 'plugins');
    const cacheBase = join(claudePluginsDir, 'cache', 'mkt1', 'my-plugin');

    mkdirSync(join(cacheBase, 'abc123def', 'skills', 'hash'), { recursive: true });
    mkdirSync(join(cacheBase, '1.0.0', 'skills', 'semver'), { recursive: true });
    writeFileSync(join(cacheBase, 'abc123def', 'skills', 'hash', 'SKILL.md'), '---\ndescription: hash\n---\n');
    writeFileSync(join(cacheBase, '1.0.0', 'skills', 'semver', 'SKILL.md'), '---\ndescription: semver\n---\n');

    writeJson(join(claudePluginsDir, 'installed_plugins.json'), {
      version: 1,
      plugins: { 'my-plugin@mkt1': {} },
    });

    const sources = discoverClaudePluginSkillSources({ homeDir, cwd });
    expect(sources).toHaveLength(1);
    expect(sources[0].path).toBe(join(cacheBase, '1.0.0', 'skills'));
  });
});
