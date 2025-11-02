import { findAllSkills, findSkill } from '../utils/skills.js';
import { readFileSync } from 'fs';
import { parseFrontmatter } from '../utils/yaml.js';
import type { SkillFrontmatter } from '../types.js';
import { isPresentable } from '../utils/presentability.js';

export function skillPrompt(options?: { format?: string; all?: boolean; includeHidden?: boolean; includeDisabled?: boolean }): void {
  const raw = findAllSkills().sort((a, b) => a.name.localeCompare(b.name));
  const items = raw.map((s) => {
    const loc = findSkill(s.name);
    const content = loc ? readFileSync(loc.path, 'utf-8') : '';
    const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);
    return { s, fm: frontmatter };
  }).filter(({ fm }) => options?.all ? true : isPresentable(fm, { includeHidden: options?.includeHidden, includeDisabled: options?.includeDisabled, requireDescription: true }));

  const skillsLine = items.map(({ s }) => s.name).join(', ');
  const bulletLines = items.map(({ s, fm }) => `- ${s.name}: ${fm?.description || s.description}`).join('\n');

  const prompt = [
    'You have access to a meta-tool called "Skill" that can load specialized instructions (skills) by name.',
    'Select a skill only when it clearly matches the user request. If none match, do not use the Skill tool.',
    'To use a skill, call the Skill tool with the exact name. Once loaded, follow the injected instructions.',
    `Available skills: ${skillsLine}`,
    '',
    'Details:',
    bulletLines,
  ].join('\n');

  const format = (options?.format || 'text').toLowerCase();
  if (format === 'json') {
    console.log(JSON.stringify({ prompt, skills: items.map(({ s, fm }) => ({ name: s.name, description: fm?.description || s.description })) }, null, 2));
    return;
  }
  console.log(prompt);
}
