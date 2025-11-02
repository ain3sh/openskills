import { findAllSkills, findSkill } from '../utils/skills.js';
import type { ToolDescriptionJson, SkillFrontmatter } from '../types.js';
import { readFileSync } from 'fs';
import { parseFrontmatter } from '../utils/yaml.js';
import { isPresentable } from '../utils/presentability.js';

/**
 * Emit a dynamic Skill tool description text that lists available skills,
 * similar to Claude's Skill tool description (for progressive disclosure).
 */
export function toolDescription(options?: { format?: string; compact?: boolean; all?: boolean; includeHidden?: boolean; includeDisabled?: boolean }): void {
  const raw = findAllSkills().sort((a, b) => a.name.localeCompare(b.name));
  const considered = raw.map((s) => {
    const loc = findSkill(s.name);
    const content = loc ? readFileSync(loc.path, 'utf-8') : '';
    const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);
    return { base: s, fm: frontmatter };
  });
  const filtered = considered.filter(({ fm }) => options?.all ? true : isPresentable(fm, { includeHidden: options?.includeHidden, includeDisabled: options?.includeDisabled, requireDescription: true }));
  const skills = filtered.map(({ base, fm }) => ({
    name: base.name,
    description: fm?.description || base.description,
    version: fm?.version,
    license: fm?.license,
  }));
  const format = (options?.format || 'text').toLowerCase();
  const oneLine = `Skill tool: call by name to load instructions. Skills: ${skills.map(s => `${s.name}`).join(', ')}`;
  const detailed = ['Use the Skill tool to invoke a specific skill by name. Available skills:', ...skills.map(s => `- ${s.name}: ${s.description}`)].join('\n');

  if (format === 'json') {
    const json: ToolDescriptionJson = {
      oneLine,
      detailed,
      skills: skills.map(s => ({ name: s.name, description: s.description, version: s.version, license: s.license })),
    };
    console.log(JSON.stringify(json, null, 2));
    return;
  }

  console.log(options?.compact ? oneLine : detailed);
}
