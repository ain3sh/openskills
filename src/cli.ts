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
  .option('-g, --global', 'Install globally (default: project install to .agent/skills)')
  .option('--tui', 'Use interactive selection (default: false, installs all by default)', false)
  .action(async (source, opts) => {
    const { installSkill } = await import('./commands/install.js');
    await installSkill(source, opts);
  });

program
  .command('load <skill-name>')
  .description('Load skill to stdout (for AI agents)')
  .option('--tui', 'Use interactive permission prompts (default: false, auto-approves)', false)
  .action(async (name, opts) => {
    const { loadSkill } = await import('./commands/load.js');
    await loadSkill(name, { tui: opts.tui });
  });

program
  .command('use <skill-name>')
  .description('Use a skill and emit strict execution payload (JSON)')
  .option('-a, --args <args>', 'Optional arguments string for metadata display')
  .option('--tui', 'Use interactive permission prompts (default: false, auto-approves)', false)
  .action(async (name, opts) => {
    const { useSkill } = await import('./commands/use.js');
    await useSkill(name, { args: opts.args, tui: opts.tui });
  });

program
  .command('exec <skill-name> <script-path> [args...]')
  .description('Execute a skill script directly')
  .action(async (skillName, scriptPath, args) => {
    const { execSkillScript } = await import('./commands/exec.js');
    await execSkillScript(skillName, scriptPath, { args });
  });

program
  .command('sync')
  .description('Sync skills to AGENTS.md via transclusion (creates .agent/SKILLS.md)')
  .option('--tui', 'Interactive skill selection')
  .option('--direct', 'Embed skills directly in AGENTS.md instead of transclusion')
  .option('--transclusion-pattern <pattern>', 'Custom transclusion pattern (default: @.agent/SKILLS.md)')
  .action(async (opts) => {
    const { syncAgentsMd } = await import('./commands/sync.js');
    await syncAgentsMd(opts);
  });

program
  .command('generate-skills-md')
  .description('Generate standalone SKILLS.md file with skills disclosure')
  .option('--format <type>', 'Output format: xml|markdown|compact (default: xml)')
  .option('--output <file>', 'Output file path (default: .agent/SKILLS.md)')
  .option('--force', 'Overwrite existing file without confirmation')
  .action(async (opts) => {
    const { generateSkillsMd } = await import('./commands/generate-skills-md.js');
    await generateSkillsMd(opts);
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

program
  .command('export-slash <skill-name>')
  .description('Export skill as markdown slash command')
  .option('--dir <directory>', 'Output directory (default: stdout)')
  .action(async (name, opts) => {
    const { exportSlash } = await import('./commands/export-slash.js');
    await exportSlash(name, opts);
  });

program
  .command('export-all-slash')
  .description('Export all skills as markdown slash commands')
  .option('--dir <directory>', 'Output directory (default: .factory/commands)')
  .action(async (opts) => {
    const { exportAllSlash } = await import('./commands/export-slash.js');
    await exportAllSlash(opts.dir);
  });

program
  .command('discover')
  .description('Generate progressive disclosure block for skills')
  .option('--format <type>', 'Output format: text|xml|json (default: text)')
  .option('--max-chars <number>', 'Character limit (default: 15000)', parseInt)
  .option('--include-hidden', 'Include hidden skills')
  .option('--include-disabled', 'Include disabled skills')
  .option('--all', 'Include all skills')
  .action(async (opts) => {
    const { discover } = await import('./commands/discover.js');
    discover(opts);
  });

program
  .command('install-hooks')
  .description('Install Claude Code hooks and aliases (user or project level)')
  .option('-g, --global', 'Install globally (default)', true)
  .option('-p, --project', 'Install to project settings', false)
  .option('--force', 'Overwrite existing files', false)
  .option('--agent <agent>', 'Target agent (claude|droid)', 'claude')
  .option('--manual', 'Print hook configuration for manual installation', false)
  .action(async (opts) => {
    const { installHooks } = await import('./commands/install-hooks.js');
    await installHooks(opts);
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
