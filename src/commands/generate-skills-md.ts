import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import chalk from 'chalk';
import { findAllSkills } from '../skill/discovery.js';
import { generateSkillsXml } from '../agent/agents-md.js';
import type { Skill } from '../types.js';

export interface GenerateSkillsMdOptions {
  format?: 'xml' | 'markdown' | 'compact';
  output?: string;
  force?: boolean;
}

/**
 * Generate standalone SKILLS.md file with skills disclosure
 * 
 * This enables the @SKILLS.md transclusion pattern where AGENTS.md
 * references a separate SKILLS.md file instead of embedding the content
 */
export async function generateSkillsMd(options: GenerateSkillsMdOptions = {}): Promise<void> {
  const format = options.format || 'xml';
  const outputPath = options.output || '.agents/SKILLS.md';

  // Ensure parent directory exists
  const parentDir = dirname(outputPath);
  if (parentDir && parentDir !== '.') {
    mkdirSync(parentDir, { recursive: true });
  }

  // Check if file exists and not forcing
  if (existsSync(outputPath) && !options.force) {
    console.log(chalk.yellow(`⚠️  ${outputPath} already exists`));
    console.log(chalk.dim(`Use --force to overwrite or --output to specify different file`));
    return;
  }
  
  // Find all installed skills
  const skills = findAllSkills();
  
  if (skills.length === 0) {
    console.log(chalk.yellow('No skills installed'));
    console.log(`Install skills first: ${chalk.cyan('openskills install anthropics/skills')}`);
    return;
  }
  
  // Generate content based on format
  let content: string;
  const timestamp = new Date().toISOString();
  
  switch (format) {
    case 'xml':
      content = generateXmlFormat(skills, timestamp);
      break;
    case 'markdown':
      content = generateMarkdownFormat(skills, timestamp);
      break;
    case 'compact':
      content = generateCompactFormat(skills, timestamp);
      break;
    default:
      console.error(chalk.red(`Unknown format: ${format}`));
      process.exit(1);
  }
  
  // Write file
  writeFileSync(outputPath, content, 'utf-8');
  
  console.log(chalk.green(`✅ Generated ${outputPath}`));
  console.log(chalk.dim(`Format: ${format}`));
  console.log(chalk.dim(`Skills: ${skills.length}`));
  console.log();
  console.log(chalk.cyan('Next steps:'));
  console.log(`1. Add to AGENTS.md: ${chalk.bold('@.agents/SKILLS.md')}`);
  console.log(`2. Or sync with transclusion: ${chalk.cyan('openskills sync --transclusion')}`);
}

/**
 * Generate XML format (default) - full skills system XML
 */
function generateXmlFormat(skills: Skill[], timestamp: string): string {
  const xmlContent = generateSkillsXml(skills);
  
  return `<!-- OpenSkills Generated - Do Not Edit Manually -->
<!-- Last Updated: ${timestamp} -->
<!-- Skills Count: ${skills.length} -->

${xmlContent}
`;
}

/**
 * Generate Markdown format - human-readable list
 */
function generateMarkdownFormat(skills: Skill[], timestamp: string): string {
  const lines: string[] = [
    '<!-- OpenSkills Generated - Do Not Edit Manually -->',
    `<!-- Last Updated: ${timestamp} -->`,
    `<!-- Skills Count: ${skills.length} -->`,
    '',
    '# Available Skills',
    '',
    '## How to use skills',
    '',
    '```bash',
    'load-skill <skill-name>',
    '```',
    '',
    'The skill content will load with detailed instructions.',
    '',
    '## Skills List',
    ''
  ];
  
  // Group by location
  const projectSkills = skills.filter(s => s.location === 'project');
  const globalSkills = skills.filter(s => s.location === 'global');
  
  if (projectSkills.length > 0) {
    lines.push('### Project Skills');
    lines.push('');
    for (const skill of projectSkills) {
      lines.push(`- **${skill.name}**: ${skill.description || 'No description'}`);
    }
    lines.push('');
  }
  
  if (globalSkills.length > 0) {
    lines.push('### Global Skills');
    lines.push('');
    for (const skill of globalSkills) {
      lines.push(`- **${skill.name}**: ${skill.description || 'No description'}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Generate compact format - minimal XML without usage instructions
 */
function generateCompactFormat(skills: Skill[], timestamp: string): string {
  const skillTags = skills
    .map(s => `<skill name="${s.name}" location="${s.location}">${s.description || ''}</skill>`)
    .join('\n');
  
  return `<!-- OpenSkills: ${skills.length} skills @ ${timestamp} -->
<available_skills>
${skillTags}
</available_skills>`;
}
