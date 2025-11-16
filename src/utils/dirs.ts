import { join, basename, dirname } from 'path';
import { homedir } from 'os';
import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import type { SkillSource } from '../types.js';

// Universal __dirname that works in both ESM and CommonJS/SEA
let __dirname: string;
try {
  __dirname = dirname(fileURLToPath(import.meta.url));
} catch {
  // Fallback for CommonJS/SEA: use process.argv[1] (path to current script/binary)
  __dirname = dirname(process.argv[1] || process.cwd());
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
 * Recursively find all skills/ directories within a base directory
 * Also finds directories that contain SKILL.md files directly (marketplace pattern)
 * 
 * @param dir - Base directory to search
 * @param maxDepth - Maximum recursion depth (default: 5)
 * @param currentDepth - Current recursion depth (internal use)
 * @returns Array of objects with path and whether it's a skills directory or direct skill container
 */
function findSkillsDirectoriesRecursive(
  dir: string,
  maxDepth: number = 5,
  currentDepth: number = 0
): string[] {
  if (currentDepth >= maxDepth || !existsSync(dir)) return [];
  
  const results: string[] = [];
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const fullPath = join(dir, entry.name);
      
      // Found a skills/ directory - add it
      if (entry.name === 'skills') {
        results.push(fullPath);
        continue; // Don't recurse into skills/ itself
      }
      
      // Skip common non-skill directories for performance
      if (['node_modules', '.git', 'dist', 'build', '__pycache__', '.venv', 'venv'].includes(entry.name)) {
        continue;
      }
      
      // Check if this directory is a marketplace that contains skills directly
      // (directories with SKILL.md files in immediate subdirectories)
      if (currentDepth <= 2) { // Only check shallow levels for marketplace pattern
        const hasSkillSubdirs = checkForMarketplacePattern(fullPath);
        if (hasSkillSubdirs) {
          results.push(fullPath);
          continue; // Don't recurse further, we found a marketplace
        }
      }
      
      // Recurse into subdirectories
      results.push(...findSkillsDirectoriesRecursive(fullPath, maxDepth, currentDepth + 1));
    }
  } catch {
    // Ignore read errors for individual directories
  }
  
  return results;
}

/**
 * Check if a directory follows the marketplace pattern (skills directly in subdirectories)
 * 
 * @param dir - Directory to check
 * @returns true if directory contains subdirectories with SKILL.md files
 */
function checkForMarketplacePattern(dir: string): boolean {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    let skillCount = 0;
    let totalDirs = 0;
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      // Skip metadata directories
      if (['.git', '.claude-plugin', 'node_modules'].includes(entry.name)) continue;
      
      totalDirs++;
      const skillPath = join(dir, entry.name, 'SKILL.md');
      if (existsSync(skillPath)) {
        skillCount++;
      }
      
      // If we found at least 2 skills, this is likely a marketplace
      if (skillCount >= 2) return true;
    }
    
    // Consider it a marketplace if at least 50% of dirs have SKILL.md and we have at least 1 skill
    return skillCount >= 1 && totalDirs >= 2 && (skillCount / totalDirs) >= 0.5;
  } catch {
    return false;
  }
}

/**
 * Extract plugin identifier from a skills directory path
 * 
 * @param baseDir - Base plugin directory (e.g., ~/.claude/plugins)
 * @param skillsPath - Full path to a skills/ directory
 * @returns Plugin identifier (e.g., "marketplaces/anthropic-agent-skills")
 * 
 * Examples:
 * - ~/.claude/plugins/my-plugin/skills -> "my-plugin"
 * - ~/.claude/plugins/marketplaces/anthropic-agent-skills/skills -> "marketplaces/anthropic-agent-skills"
 */
function extractPluginId(baseDir: string, skillsPath: string): string {
  // Get relative path from base plugin dir to skills/
  const relative = skillsPath.replace(baseDir, '').replace(/^[/\\]+/, '');
  const parts = relative.split(/[/\\]/);
  
  // Remove 'skills' from end if present
  if (parts[parts.length - 1] === 'skills') {
    parts.pop();
  }
  
  return parts.join('/') || 'root';
}

/**
 * Discover plugin-provided skills with recursive traversal
 * Scans ~/.agent/plugins/* and ~/.claude/plugins/* for skills/ subdirectories
 * at any nesting level (up to maxDepth)
 * 
 * Supports both flat and nested structures:
 * - Flat: ~/.claude/plugins/my-plugin/skills/
 * - Nested: ~/.claude/plugins/marketplaces/anthropic-agent-skills/skills/
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
      // Recursively find all skills/ directories (max depth: 5)
      const skillsDirs = findSkillsDirectoriesRecursive(pluginDir, 5);
      
      for (const skillsPath of skillsDirs) {
        sources.push({
          type: 'plugin',
          path: skillsPath,
          priority: priority++,
          pluginId: extractPluginId(pluginDir, skillsPath)
        });
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
