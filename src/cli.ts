#!/usr/bin/env node

import { Command } from 'commander';
import { listSkills } from './commands/list.js';
import { installSkill } from './commands/install.js';
import { readSkill } from './commands/read.js';
import { removeSkill } from './commands/remove.js';
import { manageSkills } from './commands/manage.js';
import { syncAgentsMd } from './commands/sync.js';
import { describeSkills } from './commands/describe.js';
import { validateSkills } from './commands/validate.js';
import { suggestSkills } from './commands/suggest.js';
import { toolDescription } from './commands/tool-description.js';

const program = new Command();

program
  .name('openskills')
  .description('Universal skills loader for AI coding agents')
  .version('1.2.1')
  .showHelpAfterError(false)
  .exitOverride((err) => {
    // Handle all commander errors gracefully (no stack traces)
    if (err.code === 'commander.helpDisplayed' || err.code === 'commander.help' || err.code === 'commander.version') {
      process.exit(0);
    }
    if (err.code === 'commander.missingArgument' || err.code === 'commander.missingMandatoryOptionValue') {
      // Error already displayed by commander
      process.exit(1);
    }
    if (err.code === 'commander.unknownOption' || err.code === 'commander.invalidArgument') {
      // Error already displayed by commander
      process.exit(1);
    }
    // Other errors
    process.exit(err.exitCode || 1);
  });

program
  .command('list')
  .description('List all installed skills')
  .option('-f, --format <format>', 'Output format (text|json)', 'text')
  .option('--all', 'Include hidden/unlisted/disabled and those lacking descriptions', false)
  .option('--include-hidden', 'Include hidden skills', false)
  .option('--include-disabled', 'Include disabled skills', false)
  .action((opts) => listSkills(opts));

program
  .command('install <source>')
  .description('Install skill from GitHub or Git URL')
  .option('-g, --global', 'Install globally (default: project install)')
  .option('-u, --universal', 'Install to .agent/skills/ (for universal AGENTS.md usage)')
  .option('-y, --yes', 'Skip interactive selection, install all skills found')
  .action(installSkill);

program
  .command('read <skill-name>')
  .description('Read skill to stdout (for AI agents)')
  .option('-f, --format <format>', 'Output format (text|json)', 'text')
  .option('-y, --yes', 'Skip permission prompts (approve all skills)')
  .action((name, opts) => readSkill(name, opts));

program
  .command('sync')
  .description('Update AGENTS.md with installed skills (interactive, pre-selects current state)')
  .option('-y, --yes', 'Skip interactive selection, sync all skills')
  .action(syncAgentsMd);

program
  .command('manage')
  .description('Interactively manage (remove) installed skills')
  .action(manageSkills);

program
  .command('remove <skill-name>')
  .alias('rm')
  .description('Remove specific skill (for scripts, use manage for interactive)')
  .action(removeSkill);

program
  .command('describe [skill-name]')
  .description('Describe installed skills in JSON (optionally a single skill)')
  .action((name) => describeSkills(name));

program
  .command('validate [skill-name]')
  .description('Validate referenced resources for a skill or all skills')
  .option('-a, --all', 'Validate all installed skills')
  .option('-f, --format <format>', 'Output format (text|json)', 'text')
  .option('--lint-frontmatter', 'Also lint frontmatter fields for unknown keys and type issues', false)
  .action((name, opts) => validateSkills(name, opts));

program
  .command('suggest <query>')
  .description('Suggest relevant skills for a user query')
  .option('-l, --limit <n>', 'Max results', (v) => parseInt(v, 10), 5)
  .option('-f, --format <format>', 'Output format (text|json)', 'text')
  .option('--all', 'Do not filter by presentability (include hidden/disabled/undocumented)')
  .action((q, opts) => suggestSkills(q, opts));

program
  .command('tool-description')
  .description('Emit a dynamic Skill tool description listing available skills')
  .option('-f, --format <format>', 'Output format (text|json)', 'text')
  .option('-c, --compact', 'Emit one-line compact description', false)
  .option('--max-chars <n>', 'Maximum characters (default: 15000)', (v) => parseInt(v, 10))
  .option('--all', 'Include hidden/unlisted/disabled and those lacking descriptions', false)
  .option('--include-hidden', 'Include hidden skills', false)
  .option('--include-disabled', 'Include disabled skills', false)
  .action((opts) => toolDescription(opts));

program
  .command('skill-prompt')
  .description('Emit a meta-tool prompt snippet for presenting and using Skills')
  .option('-f, --format <format>', 'Output format (text|json)', 'text')
  .option('--all', 'Include hidden/unlisted/disabled and those lacking descriptions', false)
  .option('--include-hidden', 'Include hidden skills', false)
  .option('--include-disabled', 'Include disabled skills', false)
  .action(async (opts) => {
    const { skillPrompt } = await import('./commands/skill-prompt.js');
    skillPrompt(opts);
  });

program.parse();
