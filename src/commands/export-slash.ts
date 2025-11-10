import { readFileSync } from 'fs';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { findSkill, findAllSkills } from '../utils/skills.js';
import { parseFrontmatter } from '../utils/yaml.js';
import type { SkillFrontmatter } from '../types.js';

export interface ExportSlashOptions {
  dir?: string;
}

/**
 * Export a skill as a markdown slash command
 * 
 * Generates markdown file compatible with:
 * - Factory Droid (.factory/commands/)
 * - Cursor (.cursor/commands/)
 * - Windsurf (.windsurf/commands/)
 * - Any CLI supporting markdown slash commands
 */
export async function exportSlash(skillName: string, options: ExportSlashOptions = {}): Promise<void> {
  const skill = findSkill(skillName);
  if (!skill) {
    console.error(`❌ Skill "${skillName}" not found`);
    console.error(`Run "openskills list" to see available skills`);
    process.exit(2);
  }

  const content = readFileSync(skill.path, 'utf-8');
  const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);
  
  const markdown = generateSlashCommandMarkdown(skillName, frontmatter);

  if (options.dir) {
    // Write to directory
    const filename = `${skillName}.md`;
    const filepath = join(options.dir, filename);
    
    // Ensure directory exists
    mkdirSync(options.dir, { recursive: true });
    
    writeFileSync(filepath, markdown, 'utf-8');
    console.log(`✓ ${filename}`);
  } else {
    // Output to stdout
    console.log(markdown);
  }
}

/**
 * Export all skills as slash commands
 */
export async function exportAllSlash(dir: string = '.factory/commands'): Promise<void> {
  const skills = findAllSkills();
  
  if (skills.length === 0) {
    console.error('❌ No skills found');
    console.error('Run "openskills install anthropics/skills" to install skills');
    process.exit(1);
  }

  console.log(`Exporting ${skills.length} skills to ${dir}/...`);
  console.log();

  // Ensure directory exists
  mkdirSync(dir, { recursive: true });

  const exported: string[] = [];
  
  for (const skill of skills) {
    try {
      const skillPath = join(skill.path, 'SKILL.md');
      const content = readFileSync(skillPath, 'utf-8');
      const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);
      
      const markdown = generateSlashCommandMarkdown(skill.name, frontmatter);
      const filename = `${skill.name}.md`;
      const filepath = join(dir, filename);
      
      writeFileSync(filepath, markdown, 'utf-8');
      console.log(`✓ ${filename}`);
      exported.push(skill.name);
    } catch (err) {
      console.error(`✗ ${skill.name}.md - ${err instanceof Error ? err.message : 'Failed'}`);
    }
  }

  // Generate discover.md for progressive disclosure
  try {
    const discoverMd = `---
description: Show available skills (progressive disclosure)
---

$(openskills discover --format=text)
`;
    const discoverPath = join(dir, 'discover.md');
    writeFileSync(discoverPath, discoverMd, 'utf-8');
    console.log(`✓ discover.md`);
    exported.push('discover');
  } catch (err) {
    console.error(`✗ discover.md - ${err instanceof Error ? err.message : 'Failed'}`);
  }

  console.log();
  console.log(`Skills exported: ${exported.length}/${skills.length + 1}`);
  console.log();
  console.log('Skills now available as slash commands:');
  console.log(`  /${exported.join(', /')}`);
  console.log();
  console.log('Reload commands in Droid with: /commands → R');
}

/**
 * Generate markdown slash command content
 */
function generateSlashCommandMarkdown(skillName: string, frontmatter?: SkillFrontmatter): string {
  const description = frontmatter?.description || `Load ${skillName} skill`;
  const argumentHint = frontmatter?.['argument-hint'] || (frontmatter as any)?.argument_hint;
  
  const lines = [
    '---',
    `description: ${description}`,
  ];
  
  if (argumentHint) {
    lines.push(`argument-hint: ${argumentHint}`);
  }
  
  lines.push(
    '---',
    '',
    `$(openskills invoke ${skillName} --yes --format=prompt --attachments=none)`
  );
  
  return lines.join('\n');
}
