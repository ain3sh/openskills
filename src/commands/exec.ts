import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import { findSkill } from '../utils/skills.js';

export interface ExecOptions {
  args?: string[];
}

/**
 * Execute a skill script directly
 * This bridges the gap between skill discovery and actual execution
 */
export async function execSkillScript(
  skillName: string,
  scriptPath: string,
  options: ExecOptions = {}
): Promise<void> {
  // Find the skill
  const skill = findSkill(skillName);
  if (!skill) {
    console.error(`Error: Unknown skill: ${skillName}`);
    console.error('Run "openskills list" to see available skills');
    process.exit(1);
  }

  // Build full script path
  const fullScriptPath = join(skill.baseDir, scriptPath);
  
  // Verify script exists
  if (!existsSync(fullScriptPath)) {
    console.error(`Error: Script not found: ${scriptPath}`);
    console.error(`Expected at: ${fullScriptPath}`);
    console.error('');
    console.error('Available scripts can be found with:');
    console.error(`  openskills invoke ${skillName} --format=execution`);
    process.exit(1);
  }

  // Detect script type and build command
  const ext = extname(scriptPath).toLowerCase();
  let command: string;
  let commandArgs: string[];
  
  switch (ext) {
    case '.py':
      command = 'python3';  // Use python3 by default (more common on Unix-like systems)
      commandArgs = [fullScriptPath, ...(options.args || [])];
      break;
    case '.sh':
    case '.bash':
      command = 'bash';
      commandArgs = [fullScriptPath, ...(options.args || [])];
      break;
    case '.js':
    case '.mjs':
    case '.cjs':
      command = 'node';
      commandArgs = [fullScriptPath, ...(options.args || [])];
      break;
    default:
      // Try to execute directly
      command = fullScriptPath;
      commandArgs = options.args || [];
  }

  // Set up environment
  const env = {
    ...process.env,
    SKILL_BASE: skill.baseDir,
    SKILL_NAME: skillName,
    WORK_DIR: process.cwd()
  };

  // Execute the script
  const proc = spawn(command, commandArgs, {
    env,
    stdio: 'inherit', // Inherit stdin, stdout, stderr
    cwd: process.cwd()
  });

  // Handle process events
  proc.on('error', (error) => {
    if ((error as any).code === 'ENOENT') {
      console.error(`Error: Command not found: ${command}`);
      if (ext === '.py') {
        console.error('Make sure Python is installed and in your PATH');
      } else if (ext === '.js' || ext === '.mjs') {
        console.error('Make sure Node.js is installed and in your PATH');
      }
    } else {
      console.error(`Error executing script: ${error.message}`);
    }
    process.exit(1);
  });

  proc.on('exit', (code, signal) => {
    if (signal) {
      console.error(`Script terminated by signal: ${signal}`);
      process.exit(128 + (signal === 'SIGINT' ? 2 : 15));
    } else if (code !== null && code !== 0) {
      process.exit(code);
    }
  });
}
