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
  // Default to .openskills for new installations (avoid conflict with Claude Code)
  const folder = universal ? '.agent/skills' : '.openskills/skills';
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
    // Priority 1-3: Project (highest)
    { type: 'project', path: join(process.cwd(), '.openskills/skills'), priority: 1 },
    { type: 'project', path: join(process.cwd(), '.agent/skills'), priority: 2 },
    { type: 'project', path: join(process.cwd(), '.claude/skills'), priority: 3 },
    
    // Priority 4-6: User  
    { type: 'user', path: join(homedir(), '.openskills/skills'), priority: 4 },
    { type: 'user', path: join(homedir(), '.agent/skills'), priority: 5 },
    { type: 'user', path: join(homedir(), '.claude/skills'), priority: 6 },
    
    // Priority 5+: Plugins (discovered dynamically)
    ...discoverPluginSkills(),
    
    // Priority 99: Built-in (lowest)
    { type: 'builtin', path: builtinPath, priority: 99 },
  ];
}

/**
 * Discover plugin-provided skills
 * Scans ~/.claude/plugins/* and ~/.agent/plugins/* for skills/ subdirectories
 */
function discoverPluginSkills(): SkillSource[] {
  const pluginDirs = [
    join(homedir(), '.openskills/plugins'),
    join(homedir(), '.claude/plugins'),
    join(homedir(), '.agent/plugins'),
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
 * @deprecated Use getAllSkillSources() for multi-source support
 */
export function getSearchDirs(): string[] {
  return [
    join(process.cwd(), '.openskills/skills'),  // 1. Project openskills (default)
    join(process.cwd(), '.agent/skills'),        // 2. Project universal (.agent)
    join(homedir(), '.openskills/skills'),       // 3. Global openskills (default)
    join(homedir(), '.agent/skills'),            // 4. Global universal (.agent)
    join(process.cwd(), '.claude/skills'),       // 5. Project claude (compatibility)
    join(homedir(), '.claude/skills'),           // 6. Global claude (compatibility)
  ];
}
