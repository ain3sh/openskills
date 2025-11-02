import { findAllSkills } from '../utils/skills.js';

/**
 * Emit a dynamic Skill tool description text that lists available skills,
 * similar to Claude's Skill tool description (for progressive disclosure).
 */
export function toolDescription(): void {
  const skills = findAllSkills();
  const lines: string[] = [];
  lines.push('Use the Skill tool to invoke a specific skill by name. Available skills:');
  for (const s of skills.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`- ${s.name}: ${s.description}`);
  }
  console.log(lines.join('\n'));
}
