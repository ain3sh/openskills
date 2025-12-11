import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, basename, dirname } from 'path';
import { getAllSkillSources, getProjectAndUserSkillSources } from './dirs.js';
import { parseFrontmatter, extractYamlField } from './yaml.js';
import type { Skill, SkillLocation } from '../types.js';
import { FastCache } from './fastCache.js';

// Cache for skill discovery (60 second TTL)
const skillCache = new FastCache<Skill[]>('skills');

/**
 * Find all installed skills across all sources (project, user, plugin, builtin)
 * 
 * Implements multi-source discovery with priority-based deduplication:
 * First found wins (project > user > plugin > builtin)
 * 
 * Performance: Cached for 60 seconds, invalidates when skill directories change
 */
export function findAllSkills(): Skill[] {
  // Try cache first
  const validator = () => {
    // Hash of all skill source directory mtimes
    const sources = getAllSkillSources();
    const mtimes: string[] = [];
    
    for (const source of sources) {
      try {
        if (existsSync(source.path)) {
          const stat = statSync(source.path);
          mtimes.push(`${source.path}:${stat.mtime.toISOString()}`);
        }
      } catch {
        // Ignore stat errors
      }
    }
    
    return mtimes.join('|');
  };
  
  const cached = skillCache.get('all-skills', validator);
  if (cached) return cached;
  
  // Cache miss - do expensive scan
  const skills = scanAllSkills();
  skillCache.set('all-skills', skills, validator());
  return skills;
}

/**
 * Internal function to scan filesystem for skills
 */
function scanAllSkills(): Skill[] {
  const skills: Skill[] = [];
  const seen = new Set<string>();
  const sources = getAllSkillSources();

  for (const source of sources) {
    if (!existsSync(source.path)) continue;

    try {
      // Single-skill sources (SKILL.md directly in the source directory)
      if (source.layout === 'single' || existsSync(join(source.path, 'SKILL.md'))) {
        const skillName = basename(source.path);
        if (seen.has(skillName)) continue;

        const skillPath = join(source.path, 'SKILL.md');
        if (!existsSync(skillPath)) continue;

        const content = readFileSync(skillPath, 'utf-8');
        const { frontmatter } = parseFrontmatter<Record<string, any>>(content);
        const description =
          typeof frontmatter?.description === 'string'
            ? frontmatter.description
            : extractYamlField(content, 'description');

        let sourceLabel = '';
        let pluginKey: string | undefined;
        let pluginEnabled: boolean | undefined;
        if (source.type === 'plugin') {
          pluginKey = source.pluginId;
          pluginEnabled = source.pluginEnabled;
          sourceLabel = `plugin:${pluginKey || skillName}`;
        } else if (source.type === 'builtin') {
          sourceLabel = 'builtin';
        }

        skills.push({
          name: skillName,
          description,
          location: source.type === 'project' ? 'project' : 'global',
          path: source.path,
          source: source.type,
          sourceLabel,
          pluginKey,
          pluginEnabled,
          scripts: undefined,
        });

        seen.add(skillName);
        continue;
      }

      const entries = readdirSync(source.path, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Priority-based deduplication: first found wins
          if (seen.has(entry.name)) continue;

          const skillPath = join(source.path, entry.name, 'SKILL.md');
          if (existsSync(skillPath)) {
            const content = readFileSync(skillPath, 'utf-8');
            const { frontmatter } = parseFrontmatter<Record<string, any>>(content);
            const description =
              typeof frontmatter?.description === 'string'
                ? frontmatter.description
                : extractYamlField(content, 'description');

            // Determine source label
            let sourceLabel = '';
            let pluginKey: string | undefined;
            let pluginEnabled: boolean | undefined;
            if (source.type === 'plugin') {
              pluginKey = source.pluginId;
              pluginEnabled = source.pluginEnabled;
              sourceLabel = `plugin:${pluginKey || basename(dirname(source.path))}`;
            } else if (source.type === 'builtin') {
              sourceLabel = 'builtin';
            }

            const skillDir = join(source.path, entry.name);

            // Discover scripts in the skill directory (async but we'll do it sync for now)
            // TODO: Make this async in the future for better performance
            let scripts = undefined;
            try {
              // We'll skip script discovery here for performance and do it on-demand
              // scripts = await discoverSkillScripts(skillDir);
            } catch {
              // Ignore script discovery errors
            }

            skills.push({
              name: entry.name,
              description,
              location: source.type === 'project' ? 'project' : 'global',
              path: skillDir,
              source: source.type,
              sourceLabel,
              pluginKey,
              pluginEnabled,
              scripts, // Will be populated on-demand
            });

            seen.add(entry.name);
          }
        }
      }
    } catch {
      // Ignore read errors for individual sources
    }
  }

  return skills;
}

function pluginPrefixMatches(prefix: string, pluginKey: string): boolean {
  if (prefix === pluginKey) return true;
  const split = pluginKey.lastIndexOf('@');
  const short = split > 0 ? pluginKey.slice(0, split) : pluginKey;
  return prefix === short;
}

/**
 * Find specific skill by name across all sources
 * Returns first match (priority: project > user > plugin > builtin)
 * 
 * Performance: Uses cached skill list if available, falls back to direct lookup
 */
export function findSkill(skillName: string): SkillLocation | null {
  // Support fully qualified plugin skill names: "pluginName:skill"
  let pluginPrefix: string | undefined;
  let shortName = skillName;
  if (skillName.includes(':')) {
    const [p, s] = skillName.split(':', 2);
    if (p && s) {
      pluginPrefix = p;
      shortName = s;
    }
  }

  // Try using cached skills first (fast path)
  try {
    const cached = skillCache.get('all-skills');
    if (cached) {
      const skill = cached.find((s) => {
        if (pluginPrefix && s.source === 'plugin') {
          const pluginKey = s.pluginKey || s.sourceLabel?.replace(/^plugin:/, '') || '';
          return s.name === shortName && pluginKey && pluginPrefixMatches(pluginPrefix, pluginKey);
        }
        return s.name === skillName;
      });
      if (skill) {
        return {
          path: join(skill.path, 'SKILL.md'),
          baseDir: skill.path,
          source: skill.path,
        };
      }
    }
  } catch {
    // Fall through to direct lookup
  }

  // Fast direct lookup for project/user skills WITHOUT scanning plugins.
  // This matters in real environments where ~/.claude/plugins can be large.
  if (!pluginPrefix) {
    const fastSources = getProjectAndUserSkillSources();
    for (const source of fastSources) {
      if (!existsSync(source.path)) continue;
      const skillPath = join(source.path, skillName, 'SKILL.md');
      if (existsSync(skillPath)) {
        return {
          path: skillPath,
          baseDir: join(source.path, skillName),
          source: source.path,
        };
      }
    }
  }

  // Full lookup (includes plugins + builtin) for plugin-qualified skills or cache miss.
  const sources = getAllSkillSources();

  for (const source of sources) {
    if (pluginPrefix && source.type !== 'plugin') continue;

    const nameToFind = pluginPrefix ? shortName : skillName;
    if (pluginPrefix && source.type === 'plugin' && source.pluginId) {
      if (!pluginPrefixMatches(pluginPrefix, source.pluginId)) continue;
    }

    // Fast-path for manifest-declared single-skill sources: avoid filesystem calls unless the basename matches.
    if (source.layout === 'single') {
      if (basename(source.path) !== nameToFind) continue;
      const skillPath = join(source.path, 'SKILL.md');
      if (!existsSync(skillPath)) continue;
      return { path: skillPath, baseDir: source.path, source: source.path };
    }

    // Fallback single-skill detection for non-manifest sources.
    if (basename(source.path) === nameToFind) {
      const skillPath = join(source.path, 'SKILL.md');
      if (existsSync(skillPath)) {
        return { path: skillPath, baseDir: source.path, source: source.path };
      }
    }

    const skillPath = join(source.path, nameToFind, 'SKILL.md');
    if (existsSync(skillPath)) {
      return {
        path: skillPath,
        baseDir: join(source.path, nameToFind),
        source: source.path,
      };
    }
  }

  return null;
}
