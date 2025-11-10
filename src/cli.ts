#!/usr/bin/env node

import { Command } from 'commander';

// Version injected at build time by esbuild define
declare const __VERSION__: string;
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.0-dev';

const program = new Command();

program
  .name('openskills')
  .description('Universal skills loader for AI coding agents')
  .version(VERSION)
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
  .option('--all', 'Include hidden/unlisted/disabled and those lacking descriptions', false)
  .option('--include-hidden', 'Include hidden skills', false)
  .option('--include-disabled', 'Include disabled skills', false)
  .action(async (opts) => {
    const { listSkills } = await import('./commands/list.js');
    listSkills(opts);
  });

program
  .command('install <source>')
  .description('Install skill from GitHub or Git URL')
  .option('-g, --global', 'Install globally (default: project install)')
  .option('-u, --universal', 'Install to .agent/skills/ (for universal AGENTS.md usage)')
  .option('-y, --yes', 'Skip interactive selection, install all skills found')
  .action(async (source, opts) => {
    const { installSkill } = await import('./commands/install.js');
    await installSkill(source, opts);
  });

program
  .command('read <skill-name>')
  .description('Read skill to stdout (for AI agents)')
  .option('-y, --yes', 'Skip permission prompts (approve all skills)')
  .option('--attachments <level>', 'Attachment verbosity: none|errors|warnings|full (default: warnings)')
  .action(async (name, opts) => {
    const { readSkill } = await import('./commands/read.js');
    await readSkill(name, opts);
  });

program
  .command('invoke <skill-name>')
  .description('Invoke a skill and emit strict Skill Tool payload (JSON)')
  .option('-a, --args <args>', 'Optional arguments string for metadata display')
  .option('-y, --yes', 'Skip permission prompts (approve all skills)')
  .option('--attachments <level>', 'Attachment verbosity: none|errors|warnings|full (default: warnings)')
  .action(async (name, opts) => {
    const { invokeSkill } = await import('./commands/invoke.js');
    await invokeSkill(name, { args: opts.args, yes: opts.yes, attachments: opts.attachments });
  });

program
  .command('sync')
  .description('Update AGENTS.md with installed skills (interactive, pre-selects current state)')
  .option('-y, --yes', 'Skip interactive selection, sync all skills')
  .action(async (opts) => {
    const { syncAgentsMd } = await import('./commands/sync.js');
    await syncAgentsMd(opts);
  });

program
  .command('manage')
  .description('Interactively manage (remove) installed skills')
  .action(async () => {
    const { manageSkills } = await import('./commands/manage.js');
    await manageSkills();
  });

program
  .command('remove <skill-name>')
  .alias('rm')
  .description('Remove specific skill (for scripts, use manage for interactive)')
  .action(async (name) => {
    const { removeSkill } = await import('./commands/remove.js');
    removeSkill(name);
  });

program
  .command('describe [skill-name]')
  .description('Describe installed skills in JSON (optionally a single skill)')
  .action(async (name) => {
    const { describeSkills } = await import('./commands/describe.js');
    describeSkills(name);
  });

program
  .command('validate [skill-name]')
  .description('Validate referenced resources for a skill or all skills')
  .option('-a, --all', 'Validate all installed skills')
  .option('--lint-frontmatter', 'Also lint frontmatter fields for unknown keys and type issues', false)
  .action(async (name, opts) => {
    const { validateSkills } = await import('./commands/validate.js');
    validateSkills(name, opts);
  });

program
  .command('suggest <query>')
  .description('Suggest relevant skills for a user query')
  .option('-l, --limit <n>', 'Max results', (v) => parseInt(v, 10), 5)
  .option('--all', 'Do not filter by presentability (include hidden/disabled/undocumented)')
  .action(async (q, opts) => {
    const { suggestSkills } = await import('./commands/suggest.js');
    suggestSkills(q, opts);
  });

program
  .command('tool-description')
  .alias('discover')
  .alias('skill-discover')
  .description('Emit a dynamic Skill tool description listing available skills')
  .option('-c, --compact', 'Emit one-line compact description', false)
  .option('--max-chars <n>', 'Maximum characters (default: 15000)', (v) => parseInt(v, 10))
  .option('--all', 'Include hidden/unlisted/disabled and those lacking descriptions', false)
  .option('--include-hidden', 'Include hidden skills', false)
  .option('--include-disabled', 'Include disabled skills', false)
  .action(async (opts) => {
    const { toolDescription } = await import('./commands/tool-description.js');
    toolDescription(opts);
  });

program
  .command('skill-prompt')
  .description('Emit a meta-tool prompt snippet for presenting and using Skills')
  .option('--all', 'Include hidden/unlisted/disabled and those lacking descriptions', false)
  .option('--include-hidden', 'Include hidden skills', false)
  .option('--include-disabled', 'Include disabled skills', false)
  .action(async (opts) => {
    const { skillPrompt } = await import('./commands/skill-prompt.js');
    skillPrompt(opts);
  });

program
  .command('telemetry')
  .description('View and manage usage telemetry')
  .option('--stats', 'Show usage statistics (default)', false)
  .option('--clear', 'Clear all telemetry data')
  .option('--disable', 'Disable telemetry collection')
  .option('--enable', 'Enable telemetry collection')
  .action(async (opts) => {
    const { telemetryCommand } = await import('./commands/telemetry.js');
    telemetryCommand(opts);
  });

// Wrap in async IIFE for CJS compatibility (SEA binary requires CJS format)
(async () => {
  if (process.argv.length <= 2) {
    const { runInteractiveShell } = await import('./commands/tui.js');
    await runInteractiveShell();
    process.exit(0);
  }

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`Error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
})();
