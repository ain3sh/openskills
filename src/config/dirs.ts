import { join, dirname } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import type { SkillSource } from '../types.js';
import { discoverClaudePluginSkillSources } from '../agent/plugins.js';

// Universal __dirname that works in both ESM and CommonJS/SEA
let __dirname: string;
try {
  __dirname = dirname(fileURLToPath(import.meta.url));
} catch {
  // Fallback for CommonJS/SEA: use process.argv[1] (path to current script/binary)
  __dirname = dirname(process.argv[1] || process.cwd());
}

// Cache plugin discovery to avoid expensive recursive scans on every command.
let pluginSkillsCache: { at: number; sources: SkillSource[] } | null = null;
const PLUGIN_SKILLS_CACHE_TTL_MS = 60_000;

function getBuiltinSkillsPath(): string {
  const builtinCandidates = [
    join(process.cwd(), 'builtin-skills'),
    join(__dirname, '../../builtin-skills'),
    join(__dirname, '../builtin-skills'),
  ];
  return builtinCandidates.find((p) => existsSync(p)) || join(__dirname, '../builtin-skills');
}

/**
 * Get skills directory path
 */
export function getSkillsDir(projectLocal: boolean = false, universal: boolean = false): string {
  // Default to .agent/skills for new installations (agent-agnostic)
  const folder = '.agent/skills';
  return projectLocal
    ? join(process.cwd(), folder)
    : join(homedir(), folder);
}

/**
 * Fast sources that do not require scanning plugin directories.
 *
 * Priority order: project > user.
 */
export function getProjectAndUserSkillSources(): SkillSource[] {
  return [
    { type: 'project', path: join(process.cwd(), '.agent/skills'), priority: 1 },
    { type: 'project', path: join(process.cwd(), '.claude/skills'), priority: 2 },
    { type: 'user', path: join(homedir(), '.agent/skills'), priority: 3 },
    { type: 'user', path: join(homedir(), '.claude/skills'), priority: 4 },
  ];
}

function getPluginSkillSourcesCached(): SkillSource[] {
  const now = Date.now();
  if (pluginSkillsCache && now - pluginSkillsCache.at < PLUGIN_SKILLS_CACHE_TTL_MS) {
    return pluginSkillsCache.sources;
  }

  const sources = discoverClaudePluginSkillSources();
  pluginSkillsCache = { at: now, sources };
  return sources;
}

/**
 * Get all skill sources in priority order (project > user > plugin > builtin)
 */
export function getAllSkillSources(): SkillSource[] {
  return [
    ...getProjectAndUserSkillSources(),
    ...getPluginSkillSourcesCached(),
    { type: 'builtin', path: getBuiltinSkillsPath(), priority: 99 },
  ];
}


