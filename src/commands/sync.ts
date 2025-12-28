import { existsSync, readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import { checkbox } from '@inquirer/prompts';
import { ExitPromptError } from '@inquirer/core';
import { findAllSkills } from '../skill/discovery.js';
import { 
  generateSkillsXml, 
  replaceSkillsSection, 
  parseCurrentSkills, 
  removeSkillsSection,
  detectTransclusionPattern,
  appendTransclusionReference
} from '../agent/agents-md.js';
import { generateSkillsMd } from './generate-skills-md.js';
import type { Skill } from '../types.js';
import { loadConfig } from '../config/loader.js';

export interface SyncOptions {
  tui?: boolean;
  direct?: boolean;
  transclusionPattern?: string;
}

/**
 * Sync installed skills to AGENTS.md
 * 
 * Agent-first: non-interactive and transclusion mode by default.
 * - Default: Creates .agent/SKILLS.md and adds reference to AGENTS.md
 * - --direct: Embeds skills XML directly in AGENTS.md
 * - --tui: Interactive skill selection
 */
export async function syncAgentsMd(options: SyncOptions = {}): Promise<void> {
  // Create AGENTS.md if it doesn't exist
  if (!existsSync('AGENTS.md')) {
    writeFileSync('AGENTS.md', '# AGENTS.md\n\nProject instructions for AI agents.\n');
    console.log(chalk.green('Created AGENTS.md'));
  }

  let skills = findAllSkills();

  if (skills.length === 0) {
    console.log('No skills installed. Install skills first:');
    console.log(`  ${chalk.cyan('openskills install anthropics/skills')}`);
    return;
  }

  // Load config for default behavior
  const config = loadConfig();
  const transclusionPattern = options.transclusionPattern ?? config.sync?.transclusionPattern ?? '@.agent/SKILLS.md';
  
  // Transclusion is default, --direct overrides
  const content = readFileSync('AGENTS.md', 'utf-8');
  const existingTransclusion = detectTransclusionPattern(content);
  const useTransclusion = !options.direct || existingTransclusion;

  // Non-interactive by default, --tui enables interactive mode
  if (options.tui) {
    try {
      const currentSkills = parseCurrentSkills(content);

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
        checked: currentSkills.includes(skill.name) || (currentSkills.length === 0 && skill.location === 'project'),
      }));

      const selected = await checkbox({
        message: 'Select skills to sync to AGENTS.md',
        choices,
        pageSize: 15,
      });

      if (selected.length === 0) {
        const updated = removeSkillsSection(content);
        writeFileSync('AGENTS.md', updated);
        console.log(chalk.green('✅ Removed all skills from AGENTS.md'));
        return;
      }

      skills = skills.filter((s) => selected.includes(s.name));
    } catch (error) {
      if (error instanceof ExitPromptError) {
        console.log(chalk.yellow('\nCancelled by user'));
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
