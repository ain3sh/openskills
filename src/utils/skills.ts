import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { getAllSkillSources } from './dirs.js';
import { parseFrontmatter, extractYamlField } from './yaml.js';
import type { Skill, SkillLocation } from '../types.js';

/**
 * Find all installed skills across all sources (project, user, plugin, builtin)
 * 
 * Implements multi-source discovery with priority-based deduplication:
 * First found wins (project > user > plugin > builtin)
 */
export function findAllSkills(): Skill[] {
  const skills: Skill[] = [];
  const seen = new Set<string>();
  const sources = getAllSkillSources();

  for (const source of sources) {
    if (!existsSync(source.path)) continue;

    try {
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
            if (source.type === 'plugin') {
              // Extract plugin name from path: ~/.claude/plugins/pdf-tools/skills -> pdf-tools
              const pluginName = basename(dirname(source.path));
              sourceLabel = `plugin:${pluginName}`;
            } else if (source.type === 'builtin') {
              sourceLabel = 'builtin';
            }

            skills.push({
              name: entry.name,
              description,
              location: source.type === 'project' ? 'project' : 'global',
              path: join(source.path, entry.name),
              source: source.type,
              sourceLabel,
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

/**
 * Find specific skill by name across all sources
 * Returns first match (priority: project > user > plugin > builtin)
 */
export function findSkill(skillName: string): SkillLocation | null {
  const sources = getAllSkillSources();

  for (const source of sources) {
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

  return null;
}
