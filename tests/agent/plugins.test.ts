import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { discoverClaudePluginSkillSources } from '../../src/agent/plugins.js';

function writeJson(path: string, value: unknown) {
  writeFileSync(path, JSON.stringify(value, null, 2));
}

describe('discoverClaudePluginSkillSources (manifest-driven)', () => {
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

  it('discovers single-skill directories declared via marketplace.json skills[]', () => {
    const claudePluginsDir = join(homeDir, '.claude', 'plugins');
    const marketplaceRoot = join(claudePluginsDir, 'marketplaces', 'mkt1');

    mkdirSync(join(marketplaceRoot, '.claude-plugin'), { recursive: true });
    mkdirSync(join(claudePluginsDir, 'marketplaces'), { recursive: true });

    // Skill directories (each is a single skill with SKILL.md at root)
    mkdirSync(join(marketplaceRoot, 'skill-a'), { recursive: true });
    mkdirSync(join(marketplaceRoot, 'skill-b'), { recursive: true });
    writeFileSync(join(marketplaceRoot, 'skill-a', 'SKILL.md'), '---\ndescription: A\n---\n');
    writeFileSync(join(marketplaceRoot, 'skill-b', 'SKILL.md'), '---\ndescription: B\n---\n');

    writeJson(join(claudePluginsDir, 'known_marketplaces.json'), {
      mkt1: { installLocation: marketplaceRoot },
    });

    writeJson(join(marketplaceRoot, '.claude-plugin', 'marketplace.json'), {
      name: 'mkt1',
      plugins: [
        {
          name: 'example-skills',
          source: './',
          skills: ['./skill-a', './skill-b'],
        },
      ],
    });

    writeJson(join(claudePluginsDir, 'installed_plugins.json'), {
      version: 1,
      plugins: {
        'example-skills@mkt1': {
          version: 'unknown',
          installPath: marketplaceRoot,
        },
      },
    });

    // Enabled plugins config
    mkdirSync(join(homeDir, '.claude'), { recursive: true });
    writeJson(join(homeDir, '.claude', 'settings.json'), {
      enabledPlugins: { 'example-skills@mkt1': true },
    });

    const sources = discoverClaudePluginSkillSources({ homeDir, cwd });
    expect(sources).toHaveLength(2);

    for (const s of sources) {
      expect(s.type).toBe('plugin');
      expect(s.pluginId).toBe('example-skills@mkt1');
      expect(s.pluginEnabled).toBe(true);
      expect(s.layout).toBe('single');
    }

    const paths = sources.map((s) => s.path);
    expect(paths).toContain(join(marketplaceRoot, 'skill-a'));
    expect(paths).toContain(join(marketplaceRoot, 'skill-b'));
  });

  it('discovers collection plugins via plugin source -> pluginRoot/skills', () => {
    const claudePluginsDir = join(homeDir, '.claude', 'plugins');
    const marketplaceRoot = join(claudePluginsDir, 'marketplaces', 'mkt1');
    const pluginRoot = join(marketplaceRoot, 'plugins', 'my-plugin');
    const skillsDir = join(pluginRoot, 'skills');
    const skillX = join(skillsDir, 'x');

    mkdirSync(join(marketplaceRoot, '.claude-plugin'), { recursive: true });
    mkdirSync(skillX, { recursive: true });
    writeFileSync(join(skillX, 'SKILL.md'), '---\ndescription: X\n---\n');

    writeJson(join(claudePluginsDir, 'known_marketplaces.json'), {
      mkt1: { installLocation: marketplaceRoot },
    });

    writeJson(join(marketplaceRoot, '.claude-plugin', 'marketplace.json'), {
      name: 'mkt1',
      plugins: [
        {
          name: 'my-plugin',
          source: './plugins/my-plugin',
        },
      ],
    });

    writeJson(join(claudePluginsDir, 'installed_plugins.json'), {
      version: 1,
      plugins: {
        'my-plugin@mkt1': {
          version: '1.0.0',
          installPath: pluginRoot,
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
    const marketplaceRoot = join(claudePluginsDir, 'marketplaces', 'mkt1');
    const pluginRoot = join(marketplaceRoot, 'plugins', 'my-plugin');
    const skillsDir = join(pluginRoot, 'skills');
    const skillX = join(skillsDir, 'x');

    mkdirSync(join(marketplaceRoot, '.claude-plugin'), { recursive: true });
    mkdirSync(skillX, { recursive: true });
    writeFileSync(join(skillX, 'SKILL.md'), '---\ndescription: X\n---\n');

    writeJson(join(claudePluginsDir, 'known_marketplaces.json'), {
      mkt1: { installLocation: marketplaceRoot },
    });

    writeJson(join(marketplaceRoot, '.claude-plugin', 'marketplace.json'), {
      name: 'mkt1',
      plugins: [
        {
          name: 'my-plugin',
          source: './plugins/my-plugin',
        },
      ],
    });

    writeJson(join(claudePluginsDir, 'installed_plugins.json'), {
      version: 1,
      plugins: {
        'my-plugin@mkt1': {
          version: '1.0.0',
          installPath: pluginRoot,
        },
      },
    });

    const sources = discoverClaudePluginSkillSources({ homeDir, cwd });
    expect(sources).toHaveLength(1);
    expect(sources[0].pluginEnabled).toBeUndefined();
  });
});
