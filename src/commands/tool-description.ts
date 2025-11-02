import { findAllSkills } from '../utils/skills.js';
import type { ToolDescriptionJson } from '../types.js';

/**
 * Emit a dynamic Skill tool description text that lists available skills,
 * similar to Claude's Skill tool description (for progressive disclosure).
 */
export function toolDescription(options?: { format?: string; compact?: boolean }): void {
  const skills = findAllSkills().sort((a, b) => a.name.localeCompare(b.name));
  const format = (options?.format || 'text').toLowerCase();
  const oneLine = `Skill tool: call by name to load instructions. Skills: ${skills.map(s => `${s.name}`).join(', ')}`;
  const detailed = ['Use the Skill tool to invoke a specific skill by name. Available skills:', ...skills.map(s => `- ${s.name}: ${s.description}`)].join('\n');

  if (format === 'json') {
    const json: ToolDescriptionJson = {
      oneLine,
      detailed,
      skills: skills.map(s => ({ name: s.name, description: s.description })),
    };
    console.log(JSON.stringify(json, null, 2));
    return;
  }

  console.log(options?.compact ? oneLine : detailed);
}
