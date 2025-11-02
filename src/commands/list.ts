import chalk from 'chalk';
import { findAllSkills, findSkill } from '../utils/skills.js';
import { readFileSync } from 'fs';
import { parseFrontmatter } from '../utils/yaml.js';
import type { SkillFrontmatter } from '../types.js';
import { isPresentable } from '../utils/presentability.js';

/**
 * List all installed skills
 */
export function listSkills(options?: { format?: string; all?: boolean; includeHidden?: boolean; includeDisabled?: boolean }): void {
  console.log(chalk.bold('Available Skills:\n'));

  const all = findAllSkills();
  const filtered = all.filter((s) => {
    const loc = findSkill(s.name);
    const content = loc ? readFileSync(loc.path, 'utf-8') : '';
    const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);
    return options?.all ? true : isPresentable(frontmatter, { includeHidden: options?.includeHidden, includeDisabled: options?.includeDisabled, requireDescription: true });
  });

  if ((options?.format ?? '').toLowerCase() === 'json') {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  if (filtered.length === 0) {
    console.log('No skills installed.\n');
    console.log('Install skills:');
    console.log(`  ${chalk.cyan('openskills install anthropics/skills')}         ${chalk.dim('# Project (default)')}`);
    console.log(`  ${chalk.cyan('openskills install owner/skill --global')}     ${chalk.dim('# Global (advanced)')}`);
    return;
  }

  // Sort: project skills first, then global, alphabetically within each
  const sorted = filtered.sort((a, b) => {
    if (a.location !== b.location) {
      return a.location === 'project' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  // Display with inline location labels
  for (const skill of sorted) {
    const locationLabel = skill.location === 'project'
      ? chalk.blue('(project)')
      : chalk.dim('(global)');

    console.log(`  ${chalk.bold(skill.name.padEnd(25))} ${locationLabel}`);
    console.log(`    ${chalk.dim(skill.description)}\n`);
  }

  // Summary
  const projectCount = filtered.filter(s => s.location === 'project').length;
  const globalCount = filtered.filter(s => s.location === 'global').length;

  console.log(chalk.dim(`Summary: ${projectCount} project, ${globalCount} global (${filtered.length} shown${options?.all ? '' : ` of ${all.length}`} )`));
}
