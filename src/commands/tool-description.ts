import { findAllSkills, findSkill } from '../utils/skills.js';
import type { ToolDescriptionJson, SkillFrontmatter } from '../types.js';
import { readFileSync } from 'fs';
import { parseFrontmatter } from '../utils/yaml.js';
import { isPresentable } from '../utils/presentability.js';
import { buildSkillToolDescription, buildCompactDescription } from '../utils/skillToolDescription.js';

/**
 * Emit a dynamic Skill tool description text that lists available skills,
 * similar to Claude's Skill tool description (for progressive disclosure).
 * 
 * Implements token budget limiting per blog spec:
 * "subject to a token budget limit of 15,000 characters by default"
 */
export function toolDescription(options?: { 
  format?: string; 
  compact?: boolean; 
  all?: boolean; 
  includeHidden?: boolean; 
  includeDisabled?: boolean;
  maxChars?: number;
}): void {
  const format = (options?.format || 'text').toLowerCase();
  
  // Build descriptions using progressive disclosure with token budget
  const oneLine = buildCompactDescription({
    includeHidden: options?.includeHidden,
    includeDisabled: options?.includeDisabled,
  });
  
  const detailed = buildSkillToolDescription({
    maxChars: options?.maxChars,
    includeHidden: options?.includeHidden,
    includeDisabled: options?.includeDisabled,
    all: options?.all,
  });

  // For JSON output, also include skill metadata
  if (format === 'json') {
    const raw = findAllSkills().sort((a, b) => a.name.localeCompare(b.name));
    const skills = raw
      .map((s) => {
        const loc = findSkill(s.name);
        const content = loc ? readFileSync(loc.path, 'utf-8') : '';
        const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);
        return { base: s, fm: frontmatter };
      })
      .filter(({ fm }) => options?.all ? true : isPresentable(fm, { 
        includeHidden: options?.includeHidden, 
        includeDisabled: options?.includeDisabled, 
        requireDescription: true 
      }))
      .map(({ base, fm }) => ({
        name: base.name,
        description: fm?.description || base.description,
        version: fm?.version,
        license: fm?.license,
      }));
    
    const json: ToolDescriptionJson = {
      oneLine,
      detailed,
      skills,
    };
    console.log(JSON.stringify(json, null, 2));
    return;
  }

  console.log(options?.compact ? oneLine : detailed);
}
