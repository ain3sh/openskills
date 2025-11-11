import { join, basename, dirname } from 'path';
import { homedir } from 'os';
import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import type { SkillSource } from '../types.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * Get all skill sources in priority order (project > user > plugin > builtin)
 * 
 * Implements multi-source discovery per blog spec:
 * "Claude Code scans user settings, project settings, plugin-provided skills,
 * and built-in skills to build the available skills list"
 */
export function getAllSkillSources(): SkillSource[] {
  const builtinCandidates = [
    // Repo root during development
    join(process.cwd(), 'builtin-skills'),
    // When running from src (ts-node)
    join(__dirname, '../../builtin-skills'),
    // When running from dist bundle
    join(__dirname, '../builtin-skills'),
  ];
  const builtinPath = builtinCandidates.find((p) => existsSync(p)) || join(__dirname, '../builtin-skills');

  return [
    // Priority 1-2: Project (highest) - allows project overrides
    { type: 'project', path: join(process.cwd(), '.agent/skills'), priority: 1 },
    { type: 'project', path: join(process.cwd(), '.claude/skills'), priority: 2 },
    
    // Priority 3-4: User/Global
    { type: 'user', path: join(homedir(), '.agent/skills'), priority: 3 },
    { type: 'user', path: join(homedir(), '.claude/skills'), priority: 4 },
    
    // Priority 5+: Plugins (discovered dynamically)
    ...discoverPluginSkills(),
    
    // Priority 99: Built-in (lowest)
    { type: 'builtin', path: builtinPath, priority: 99 },
  ];
}

/**
 * Discover plugin-provided skills
 * Scans ~/.agent/plugins/* and ~/.claude/plugins/* for skills/ subdirectories
 */
function discoverPluginSkills(): SkillSource[] {
  const pluginDirs = [
    join(homedir(), '.agent/plugins'),
    join(homedir(), '.claude/plugins'),
  ];
  
  const sources: SkillSource[] = [];
  let priority = 7;
  
  for (const pluginDir of pluginDirs) {
    if (!existsSync(pluginDir)) continue;
    
    try {
      const plugins = readdirSync(pluginDir, { withFileTypes: true })
        .filter(d => d.isDirectory());
      
      for (const plugin of plugins) {
        const skillsPath = join(pluginDir, plugin.name, 'skills');
        if (existsSync(skillsPath)) {
          sources.push({
            type: 'plugin',
            path: skillsPath,
            priority: priority++
          });
        }
      }
    } catch {
      // Ignore read errors
    }
  }
  
  return sources;
}

/**
 * Get all searchable skill directories in priority order
 */
export function getSearchDirs(): string[] {
  return [
    join(process.cwd(), '.agent/skills'),        // 1. Project agent-agnostic (default)
    join(homedir(), '.agent/skills'),            // 2. Global agent-agnostic
    join(process.cwd(), '.claude/skills'),       // 3. Project Claude-specific
    join(homedir(), '.claude/skills'),           // 4. Global Claude-specific
  ];
}
