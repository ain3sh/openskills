import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { SkillSource } from '../types.js';

interface InstalledPluginsFile {
  version?: number;
  plugins?: Record<
    string,
    {
      version?: string;
      installPath?: string;
      isLocal?: boolean;
      gitCommitSha?: string;
      installedAt?: string;
      lastUpdated?: string;
    }
  >;
}

function safeReadJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function splitPluginKey(pluginKey: string): { pluginName: string; marketplace: string } | null {
  const at = pluginKey.lastIndexOf('@');
  if (at <= 0 || at === pluginKey.length - 1) return null;
  return { pluginName: pluginKey.slice(0, at), marketplace: pluginKey.slice(at + 1) };
}

function findLatestVersionDir(cacheBase: string): string | null {
  if (!existsSync(cacheBase)) return null;
  try {
    const entries = readdirSync(cacheBase, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    if (dirs.length === 0) return null;
    if (dirs.length === 1) return join(cacheBase, dirs[0]);

    // Sort: semver first (descending), then lexical, 'unknown' last
    dirs.sort((a, b) => {
      const aIsSemver = /^\d+\.\d+\.\d+/.test(a);
      const bIsSemver = /^\d+\.\d+\.\d+/.test(b);

      if (aIsSemver && bIsSemver) {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
          if (aParts[i] !== bParts[i]) return bParts[i] - aParts[i];
        }
        return 0;
      }
      if (aIsSemver) return -1;
      if (bIsSemver) return 1;
      if (a === 'unknown') return 1;
      if (b === 'unknown') return -1;
      return b.localeCompare(a);
    });

    return join(cacheBase, dirs[0]);
  } catch {
    return null;
  }
}

function readClaudeEnabledPlugins(options: { homeDir: string; cwd: string }):
  | { hasConfig: false; enabled: null }
  | { hasConfig: true; enabled: Set<string> } {
  const userSettingsPath = join(options.homeDir, '.claude', 'settings.json');
  const projectSettingsPath = join(options.cwd, '.claude', 'settings.json');
  const projectLocalSettingsPath = join(options.cwd, '.claude', 'settings.local.json');

  const userSettings = safeReadJson<Record<string, any>>(userSettingsPath) ?? {};
  const projectSettings = safeReadJson<Record<string, any>>(projectSettingsPath) ?? {};
  const projectLocalSettings = safeReadJson<Record<string, any>>(projectLocalSettingsPath) ?? {};

  const userEnabled = (userSettings as any)?.enabledPlugins;
  const projectEnabled = (projectSettings as any)?.enabledPlugins;
  const projectLocalEnabled = (projectLocalSettings as any)?.enabledPlugins;

  const merged: Record<string, boolean> = {};

  // Precedence: user < project < project.local
  if (userEnabled && typeof userEnabled === 'object') Object.assign(merged, userEnabled);
  if (projectEnabled && typeof projectEnabled === 'object') Object.assign(merged, projectEnabled);
  if (projectLocalEnabled && typeof projectLocalEnabled === 'object') Object.assign(merged, projectLocalEnabled);

  const keys = Object.keys(merged);
  if (keys.length === 0) return { hasConfig: false, enabled: null };

  const enabled = new Set(keys.filter((k) => merged[k] === true));
  return { hasConfig: true, enabled };
}

export function discoverClaudePluginSkillSources(options?: {
  homeDir?: string;
  cwd?: string;
}): SkillSource[] {
  const homeDir = options?.homeDir ?? homedir();
  const cwd = options?.cwd ?? process.cwd();
  const claudePluginsDir = join(homeDir, '.claude', 'plugins');

  const installed = safeReadJson<InstalledPluginsFile>(join(claudePluginsDir, 'installed_plugins.json'));
  if (!installed?.plugins) return [];

  const enabledPlugins = readClaudeEnabledPlugins({ homeDir, cwd });

  const sources: SkillSource[] = [];
  let priority = 7;

  for (const [pluginKey] of Object.entries(installed.plugins)) {
    const split = splitPluginKey(pluginKey);
    if (!split) continue;

    const pluginEnabled = enabledPlugins.hasConfig ? enabledPlugins.enabled.has(pluginKey) : undefined;

    // Derive cache path from plugin key
    const cacheBase = join(claudePluginsDir, 'cache', split.marketplace, split.pluginName);
    const pluginRoot = findLatestVersionDir(cacheBase);
    if (!pluginRoot) continue;

    const candidateRoots: string[] = [];
    const skillsDir = join(pluginRoot, 'skills');
    if (existsSync(skillsDir)) candidateRoots.push(skillsDir);
    if (existsSync(join(pluginRoot, 'SKILL.md'))) candidateRoots.push(pluginRoot);

    for (const root of candidateRoots) {
      if (!existsSync(root)) continue;

      const isSingle = existsSync(join(root, 'SKILL.md'));

      sources.push({
        type: 'plugin',
        path: root,
        priority: priority++,
        pluginId: pluginKey,
        layout: isSingle ? 'single' : 'collection',
        pluginEnabled,
      });
    }
  }

  // De-dupe identical paths
  const seenPaths = new Set<string>();
  return sources.filter((s) => {
    if (seenPaths.has(s.path)) return false;
    seenPaths.add(s.path);
    return true;
  });
}
