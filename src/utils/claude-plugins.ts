import { existsSync, readFileSync } from 'fs';
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

interface KnownMarketplacesFile {
  [marketplace: string]: {
    installLocation?: string;
    lastUpdated?: string;
    source?: unknown;
  };
}

interface MarketplaceManifest {
  name?: string;
  plugins?: Array<{
    name: string;
    source?: string;
    skills?: string[];
  }>;
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

function normalizeRelativePath(p: string): string {
  return p.startsWith('./') ? p.slice(2) : p;
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

function getMarketplaceManifestCached(options: {
  knownMarketplaces: KnownMarketplacesFile;
  marketplaceName: string;
  cache: Map<string, { marketplaceRoot: string; manifest: MarketplaceManifest } | null>;
}): { marketplaceRoot: string; manifest: MarketplaceManifest } | null {
  const cached = options.cache.get(options.marketplaceName);
  if (cached !== undefined) return cached;

  const known = options.knownMarketplaces[options.marketplaceName];
  const marketplaceRoot = known?.installLocation;
  if (!marketplaceRoot) {
    options.cache.set(options.marketplaceName, null);
    return null;
  }

  const manifestPath = join(marketplaceRoot, '.claude-plugin', 'marketplace.json');
  const manifest = safeReadJson<MarketplaceManifest>(manifestPath);
  if (!manifest) {
    options.cache.set(options.marketplaceName, null);
    return null;
  }

  const loaded = { marketplaceRoot, manifest };
  options.cache.set(options.marketplaceName, loaded);
  return loaded;
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

  const knownMarketplaces =
    safeReadJson<KnownMarketplacesFile>(join(claudePluginsDir, 'known_marketplaces.json')) ?? {};

  const marketplaceManifestCache = new Map<string, { marketplaceRoot: string; manifest: MarketplaceManifest } | null>();

  const enabledPlugins = readClaudeEnabledPlugins({ homeDir, cwd });

  const sources: SkillSource[] = [];
  let priority = 7;

  for (const [pluginKey, meta] of Object.entries(installed.plugins)) {
    const split = splitPluginKey(pluginKey);
    if (!split) continue;

    const pluginEnabled = enabledPlugins.hasConfig ? enabledPlugins.enabled.has(pluginKey) : undefined;
    const installPath = typeof meta?.installPath === 'string' ? meta.installPath : '';

    // Fast-path: most installed plugins have an installPath that is already the plugin root.
    // Avoid parsing large marketplace manifests unless we need them.
    const fastCandidateRoots: string[] = [];
    if (installPath) {
      const skillsDir = join(installPath, 'skills');
      if (existsSync(skillsDir)) fastCandidateRoots.push(skillsDir);
      if (existsSync(join(installPath, 'SKILL.md'))) fastCandidateRoots.push(installPath);
    }

    const candidateRoots: string[] = [];

    // Prefer installPath-derived candidates when present.
    candidateRoots.push(...fastCandidateRoots);

    // Fallback: consult marketplace manifest for cases like anthropic-agent-skills where
    // installPath points at the marketplace root and skills live elsewhere.
    if (candidateRoots.length === 0) {
      const marketplaceData = getMarketplaceManifestCached({
        knownMarketplaces,
        marketplaceName: split.marketplace,
        cache: marketplaceManifestCache,
      });

      const manifestPlugins = marketplaceData?.manifest?.plugins;
      const pluginEntry = Array.isArray(manifestPlugins)
        ? manifestPlugins.find((p) => p?.name === split.pluginName)
        : undefined;

      if (marketplaceData && pluginEntry) {
        if (pluginEntry.skills && Array.isArray(pluginEntry.skills)) {
          for (const rel of pluginEntry.skills) {
            if (typeof rel !== 'string') continue;
            candidateRoots.push(join(marketplaceData.marketplaceRoot, normalizeRelativePath(rel)));
          }
        } else if (typeof pluginEntry.source === 'string') {
          const pluginRoot = join(marketplaceData.marketplaceRoot, normalizeRelativePath(pluginEntry.source));
          const skillsDir = join(pluginRoot, 'skills');
          if (existsSync(skillsDir)) candidateRoots.push(skillsDir);
          if (existsSync(join(pluginRoot, 'SKILL.md'))) candidateRoots.push(pluginRoot);
        }
      }
    }

    // Legacy fallback: if we couldn't resolve via installPath or manifest, do nothing.

    for (const root of candidateRoots) {
      if (!root || !existsSync(root)) continue;

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

  // De-dupe identical paths (can happen when we add both pluginRoot and pluginRoot/skills).
  const seenPaths = new Set<string>();
  return sources.filter((s) => {
    if (seenPaths.has(s.path)) return false;
    seenPaths.add(s.path);
    return true;
  });
}
