import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export async function sessionHook(): Promise<void> {
  // Try to find the environment file from various potential agent env vars
  // CLAUDE_ENV_FILE is for Claude Code
  // FACTORY_ENV_FILE or DROID_ENV_FILE might be used by Droid in the future.
  const envFile = process.env.CLAUDE_ENV_FILE || process.env.FACTORY_ENV_FILE || process.env.DROID_ENV_FILE;

  if (!envFile) {
    // Not running in a context with a known ENV_FILE
    return;
  }

  const homeDir = os.homedir();
  const openSkillsBin = path.join(homeDir, '.openskills', 'bin');

  // Append to the env file
  try {
    // We add a newline just in case the file doesn't end with one
    const content = `\nexport PATH="${openSkillsBin}:$PATH"\n`;
    fs.appendFileSync(envFile, content);
  } catch (error) {
    console.error(`Failed to update ENV_FILE (${envFile}):`, error);
    process.exit(1);
  }
}
