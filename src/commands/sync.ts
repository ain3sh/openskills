import { existsSync, readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import { checkbox, confirm } from '@inquirer/prompts';
import { ExitPromptError } from '@inquirer/core';
import { findAllSkills } from '../utils/skills.js';
import { 
  generateSkillsXml, 
  replaceSkillsSection, 
  parseCurrentSkills, 
  removeSkillsSection,
  detectTransclusionPattern,
  appendTransclusionReference
} from '../utils/agents-md.js';
import { generateSkillsMd } from './generate-skills-md.js';
import type { Skill } from '../types.js';
import { loadConfig } from '../utils/config.js';

export interface SyncOptions {
  yes?: boolean;
  transclusion?: boolean;
  transclusionPattern?: string;
}

/**
 * Sync installed skills to AGENTS.md
 * 
 * Supports two modes:
 * 1. Direct injection (default) - embeds skills XML directly in AGENTS.md
 * 2. Transclusion mode - creates SKILLS.md and adds @SKILLS.md reference
 */
export async function syncAgentsMd(options: SyncOptions = {}): Promise<void> {
  if (!existsSync('AGENTS.md')) {
    console.log(chalk.yellow('No AGENTS.md to update'));
    return;
  }

  let skills = findAllSkills();

  if (skills.length === 0) {
    console.log('No skills installed. Install skills first:');
    console.log(`  ${chalk.cyan('openskills install anthropics/skills --project')}`);
    return;
  }

  // Load config for default behavior
  const config = loadConfig();
  let useTransclusion = options.transclusion ?? config.sync?.mode === 'transclusion';
  const transclusionPattern = options.transclusionPattern ?? config.sync?.transclusionPattern ?? '@.agent/SKILLS.md';
  
  // Check if AGENTS.md already uses transclusion
  const content = readFileSync('AGENTS.md', 'utf-8');
  const existingTransclusion = detectTransclusionPattern(content);
  
  // If transclusion mode not specified and no existing pattern, ask user
  if (options.transclusion === undefined && !existingTransclusion && !options.yes) {
    try {
      useTransclusion = await confirm({
        message: 'Use transclusion mode? (Creates separate SKILLS.md file)',
        default: false
      });
    } catch (error) {
      if (error instanceof ExitPromptError) {
        console.log(chalk.yellow('\nCancelled by user'));
        process.exit(0);
      }
      throw error;
    }
  } else if (existingTransclusion) {
    // If transclusion already exists, maintain that mode
    useTransclusion = true;
  }

  // Interactive mode by default (unless -y flag)
  if (!options.yes) {
    try {
      // Parse what's currently in AGENTS.md
      const content = readFileSync('AGENTS.md', 'utf-8');
      const currentSkills = parseCurrentSkills(content);

      // Sort: project first
      const sorted = skills.sort((a, b) => {
        if (a.location !== b.location) {
          return a.location === 'project' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      const choices = sorted.map((skill) => ({
        name: `${chalk.bold(skill.name.padEnd(25))} ${skill.location === 'project' ? chalk.blue('(project)') : chalk.dim('(global)')}`,
        value: skill.name,
        description: skill.description.slice(0, 70),
        // Pre-select if currently in AGENTS.md, otherwise default to project skills
        checked: currentSkills.includes(skill.name) || (currentSkills.length === 0 && skill.location === 'project'),
      }));

      const selected = await checkbox({
        message: 'Select skills to sync to AGENTS.md',
        choices,
        pageSize: 15,
      });

      if (selected.length === 0) {
        // User unchecked everything - remove skills section
        const content = readFileSync('AGENTS.md', 'utf-8');
        const updated = removeSkillsSection(content);
        writeFileSync('AGENTS.md', updated);
        console.log(chalk.green('✅ Removed all skills from AGENTS.md'));
        return;
      }

      // Filter skills to selected ones
      skills = skills.filter((s) => selected.includes(s.name));
    } catch (error) {
      if (error instanceof ExitPromptError) {
        console.log(chalk.yellow('\n\nCancelled by user'));
        process.exit(0);
      }
      throw error;
    }
  }

  // Handle transclusion mode
  if (useTransclusion) {
    // Generate SKILLS.md file
    await generateSkillsMd({
      format: 'xml',
      output: '.agent/SKILLS.md',
      force: true
    });
    
    // Check if AGENTS.md already has transclusion reference
    const agentsMdContent = readFileSync('AGENTS.md', 'utf-8');
    if (!detectTransclusionPattern(agentsMdContent)) {
      // Add transclusion reference to AGENTS.md
      const updatedContent = appendTransclusionReference(agentsMdContent, transclusionPattern);
      writeFileSync('AGENTS.md', updatedContent);
      console.log(chalk.green(`✅ Added ${transclusionPattern} reference to AGENTS.md`));
    } else {
      console.log(chalk.green(`✅ Updated SKILLS.md (${skills.length} skills)`));
      console.log(chalk.dim(`AGENTS.md already contains transclusion reference`));
    }
  } else {
    // Direct injection mode (original behavior)
    const xml = generateSkillsXml(skills);
    const content = readFileSync('AGENTS.md', 'utf-8');
    const updated = replaceSkillsSection(content, xml);

    writeFileSync('AGENTS.md', updated);

    const hadMarkers =
      content.includes('<skills_system') || content.includes('<!-- SKILLS_TABLE_START -->');

    if (hadMarkers) {
      console.log(chalk.green(`✅ Synced ${skills.length} skill(s) to AGENTS.md`));
    } else {
      console.log(chalk.green(`✅ Added skills section to AGENTS.md (${skills.length} skill(s))`));
    }
  }
}
