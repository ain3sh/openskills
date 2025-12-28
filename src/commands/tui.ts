import { select, input, confirm } from '@inquirer/prompts';
import { findAllSkills, findSkill } from '../skill/discovery.js';
import { readFileSync } from 'fs';
import { parseFrontmatter } from '../skill/frontmatter.js';
import type { SkillFrontmatter } from '../types.js';
import { installSkill } from './install.js';
import { removeSkill } from './remove.js';
import { syncAgentsMd } from './sync.js';
import { telemetryCommand } from './telemetry.js';

export async function runInteractiveShell(): Promise<void> {
  if (!process.stdout.isTTY) {
    console.error('OpenSkills interactive mode requires a TTY. For agent usage, run `openskills list` or other subcommands directly.');
    return;
  }

  let exit = false;
  while (!exit) {
    const action = await select<string>({
      message: 'OpenSkills',
      choices: [
        { name: 'Browse installed skills', value: 'browse' },
        { name: 'Install skills from GitHub/Git URL', value: 'install' },
        { name: 'Remove a skill', value: 'remove' },
        { name: 'Sync AGENTS.md', value: 'sync' },
        { name: 'View telemetry stats', value: 'telemetry' },
        { name: 'Exit', value: 'exit' },
      ],
    });

    try {
      switch (action) {
        case 'browse':
          await browseSkills();
          break;
        case 'install':
          await installSkillsFlow();
          break;
        case 'remove':
          await removeSkillFlow();
          break;
        case 'sync':
          await syncAgentsMd({ tui: true });
          await pause('Synced AGENTS.md. Press enter to continue.');
          break;
        case 'telemetry':
          await telemetryCommand({ stats: true });
          await pause('Press enter to continue.');
          break;
        case 'exit':
          exit = true;
          break;
      }
    } catch (err: any) {
      console.error('\n⚠️  Error:', err?.message || err);
      await pause('Press enter to continue.');
    }
  }
}

async function browseSkills(): Promise<void> {
  const all = findAllSkills().sort((a, b) => a.name.localeCompare(b.name));
  if (all.length === 0) {
    await pause('No skills installed. Press enter to return.');
    return;
  }

  let back = false;
  while (!back) {
    const choice = await select<string>({
      message: 'Select a skill to inspect',
      choices: [
        ...all.map((skill) => ({ name: `${skill.name} (${skill.location})`, value: skill.name })),
        { name: '⬅ Back', value: '__back' },
      ],
    });
    if (choice === '__back') {
      back = true;
      continue;
    }
    await showSkillDetails(choice);
  }
}

async function showSkillDetails(skillName: string): Promise<void> {
  const loc = findSkill(skillName);
  if (!loc) {
    await pause(`Skill "${skillName}" not found. Press enter to continue.`);
    return;
  }
  const content = readFileSync(loc.path, 'utf-8');
  const { frontmatter, body } = parseFrontmatter<SkillFrontmatter>(content);
  console.clear();
  console.log('═'.repeat(70));
  console.log(`📖 ${skillName}`);
  console.log('═'.repeat(70));
  console.log(`Base: ${loc.baseDir}`);
  if (frontmatter?.description) console.log(`Description: ${frontmatter.description}`);
  if (frontmatter?.version) console.log(`Version: ${frontmatter.version}`);
  if (frontmatter?.license) console.log(`License: ${frontmatter.license}`);
  if (frontmatter?.model) console.log(`Model: ${frontmatter.model}`);
  const allowedField = frontmatter?.['allowed-tools'];
  if (allowedField) console.log(`Allowed tools: ${Array.isArray(allowedField) ? allowedField.join(', ') : String(allowedField)}`);
  console.log('\n--- Prompt Content ---\n');
  console.log(body.trim());
  console.log('\n'.repeat(2));
  await pause('Press enter to go back.');
  console.clear();
}

async function installSkillsFlow(): Promise<void> {
  const source = await input({ message: 'GitHub repo owner/name or git URL', validate: (value) => value?.trim() ? true : 'Source is required.' });
  const target = await select<'project' | 'global'>({
    message: 'Install location',
    choices: [
      { name: 'Project (.agent/skills)', value: 'project' },
      { name: 'Global (~/.agent/skills)', value: 'global' },
    ],
  });
  await installSkill(source.trim(), {
    global: target === 'global',
  });
  await pause('Installation complete. Press enter to continue.');
}

async function removeSkillFlow(): Promise<void> {
  const all = findAllSkills().sort((a, b) => a.name.localeCompare(b.name));
  if (all.length === 0) {
    await pause('No skills to remove. Press enter to return.');
    return;
  }
  const choice = await select<string>({
    message: 'Select a skill to remove',
    choices: [
      ...all.map((skill) => ({ name: `${skill.name} (${skill.location})`, value: skill.name })),
      { name: '⬅ Cancel', value: '__cancel' },
    ],
  });
  if (choice === '__cancel') return;
  const confirmed = await confirm({ message: `Remove "${choice}"?`, default: false });
  if (!confirmed) return;
  await removeSkill(choice);
  await pause('Removed. Press enter to continue.');
}

async function pause(message: string): Promise<void> {
  await input({ message });
}
