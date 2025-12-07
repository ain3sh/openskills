import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ALIASES: Record<string, string> = {
  'install-skill': 'install',
  'list-skills': 'list',
  'sync-skills': 'sync',
  'load-skill': 'load',
  'use-skill': 'use',
  'describe-skill': 'describe',
  'execute-skill-script': 'exec',
  'suggest-skill': 'suggest',
};

type AgentType = 'claude' | 'droid';

interface InstallHooksOptions {
  global?: boolean;
  project?: boolean;
  force?: boolean;
  agent?: string;
  manual?: boolean;
}

export async function installHooks(opts: InstallHooksOptions): Promise<void> {
  // 1. Setup ~/.openskills/bin and aliases
  const homeDir = os.homedir();
  const binDir = path.join(homeDir, '.openskills', 'bin');

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
    console.log(`Created directory: ${binDir}`);
  }

  console.log('Creating alias scripts...');
  for (const [alias, cmd] of Object.entries(ALIASES)) {
    const scriptPath = path.join(binDir, alias);
    const content = `#!/bin/sh\nopenskills ${cmd} "$@"\n`;
    
    if (fs.existsSync(scriptPath) && !opts.force) {
      // Skip if exists and no force
    } else {
      fs.writeFileSync(scriptPath, content, { mode: 0o755 });
    }
  }
  console.log(`✅ Created ${Object.keys(ALIASES).length} alias scripts in ${binDir}`);

  const agent = (opts.agent || 'claude').toLowerCase() as AgentType;

  if (!['claude', 'droid'].includes(agent)) {
    console.error(`Unsupported agent: ${agent}. Supported agents: claude, droid`);
    process.exit(1);
  }

  // Build agent-specific hook entry
  const hookCommand = 'openskills session-hook';
  const buildHookEntry = () => {
    if (agent === 'droid') {
      // Droid format: no matcher, includes timeout per Factory cookbook
      return {
        hooks: [
          {
            type: 'command',
            command: hookCommand,
            timeout: 10
          }
        ]
      };
    } else {
      // Claude format: uses matcher for session types
      return {
        matcher: 'startup|resume|compact',
        hooks: [
          {
            type: 'command',
            command: hookCommand
          }
        ]
      };
    }
  };

  if (opts.manual) {
    const hookJson = {
      hooks: {
        SessionStart: [buildHookEntry()]
      }
    };
    
    console.log('\n📋 Manual Configuration');
    console.log(`Add the following to your ${agent === 'droid' ? '.factory' : '.claude'}/settings.json file:`);
    console.log('---------------------------------------------------');
    console.log(JSON.stringify(hookJson, null, 2));
    console.log('---------------------------------------------------');
    return;
  }

  const isGlobal = opts.global !== false && !opts.project; // Default to global if project not specified

  // 2. Configure Agent settings
  let settingsPath: string;
  let agentConfigDir: string;

  if (agent === 'claude') {
    agentConfigDir = '.claude';
  } else { // droid
    agentConfigDir = '.factory'; // Factory Droid uses .factory directory
  }

  if (isGlobal) {
    settingsPath = path.join(homeDir, agentConfigDir, 'settings.json');
  } else {
    settingsPath = path.join(process.cwd(), agentConfigDir, 'settings.json');
  }

  const settingsDir = path.dirname(settingsPath);
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }

  let settings: any = {};
  if (fs.existsSync(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, 'utf-8');
      settings = JSON.parse(content);
    } catch (e) {
      console.error(`Error parsing settings file at ${settingsPath}:`, e);
      if (!opts.force) {
        console.error('Use --force to overwrite with a clean settings object.');
        process.exit(1);
      }
    }
  }

  // Initialize structure
  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];

  const sessionHooks = settings.hooks.SessionStart as any[];
  
  // Check if our hook already exists
  const exists = sessionHooks.some((h: any) => 
    h.hooks && h.hooks.some((cmd: any) => cmd.command === hookCommand)
  );

  if (!exists) {
    sessionHooks.push(buildHookEntry());
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log(`✅ Added SessionStart hook to ${settingsPath} for agent ${agent}`);
  } else {
    console.log(`ℹ️  SessionStart hook already exists in ${settingsPath}`);
  }

  // 3. Verify
  console.log('\nSetup complete! Restart your agent session to use the aliases:');
  Object.keys(ALIASES).forEach(alias => console.log(`  - ${alias}`));
}
