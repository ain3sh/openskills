import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DEFAULT_FORMATTING, hasJsoncPath, parseJsonc, setJsoncPath } from '../config/settings.js';

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

type CommandHook = {
  type: 'command';
  command: string;
  timeout?: number;
};

type SessionStartEntry = {
  matcher?: string;
  hooks: CommandHook[];
};

const CLAUDE_SESSION_MATCHER = 'startup|resume|clear|compact';
const DEFAULT_TIMEOUT_SECONDS = 10;

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createAliasScripts(binDir: string): void {
  for (const [alias, cmd] of Object.entries(ALIASES)) {
    const scriptPath = path.join(binDir, alias);
    const content = `#!/usr/bin/env bash\nopenskills ${cmd} "$@"\n`;
    fs.writeFileSync(scriptPath, content, { mode: 0o755 });
  }
}

function createSessionHookScript(scriptPath: string): void {

  const content = `#!/usr/bin/env bash

# Ensure ~/.openskills/bin is on PATH for the current session
# Works for both Claude Code (CLAUDE_ENV_FILE) and Droid/Factory (DROID_ENV_FILE)

set -e

ENV_FILE="\${CLAUDE_ENV_FILE:-\${DROID_ENV_FILE:-}}"

if [ -z "$ENV_FILE" ]; then
  exit 0
fi

BIN_DIR="$HOME/.openskills/bin"

# Best-effort idempotency: if grep exists and the line is already present, skip.
if command -v grep >/dev/null 2>&1; then
  if [ -f "$ENV_FILE" ] && grep -q "\.openskills/bin" "$ENV_FILE" 2>/dev/null; then
    exit 0
  fi
fi

printf '\\nexport PATH="%s:\${PATH:-/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin}"\\n' "$BIN_DIR" >> "$ENV_FILE"

exit 0
`;

  fs.writeFileSync(scriptPath, content, { mode: 0o755 });
}

function parseAgent(agentRaw: string | undefined): AgentType {
  const agent = (agentRaw || 'claude').toLowerCase();
  if (agent === 'claude' || agent === 'droid') return agent;
  console.error(`Unsupported agent: ${agent}. Supported agents: claude, droid`);
  process.exit(1);
}

function resolveSettingsPath(agent: AgentType, isGlobal: boolean): { settingsPath: string; configDirName: '.claude' | '.factory' } {
  const homeDir = os.homedir();
  const configDirName = agent === 'claude' ? '.claude' : '.factory';
  const baseDir = isGlobal ? homeDir : process.cwd();
  return {
    settingsPath: path.join(baseDir, configDirName, 'settings.json'),
    configDirName,
  };
}

function buildSessionStartEntry(agent: AgentType, hookScriptPath: string): SessionStartEntry {
  const hook: CommandHook = {
    type: 'command',
    command: hookScriptPath,
    timeout: DEFAULT_TIMEOUT_SECONDS,
  };

  if (agent === 'claude') {
    return { matcher: CLAUDE_SESSION_MATCHER, hooks: [hook] };
  }

  return { hooks: [hook] };
}

function entryHasCommand(entry: unknown, command: string): boolean {
  const e = entry as any;
  if (!e || !Array.isArray(e.hooks)) return false;
  return e.hooks.some((h: any) => h && h.type === 'command' && h.command === command);
}

function normalizeExistingEntryForAgent(entry: any, agent: AgentType, hookScriptPath: string): any {
  if (!entry || typeof entry !== 'object') return entry;

  if (agent === 'claude') {
    entry.matcher = CLAUDE_SESSION_MATCHER;
  } else {
    delete entry.matcher;
  }

  if (Array.isArray(entry.hooks)) {
    for (const h of entry.hooks) {
      if (!h || h.type !== 'command') continue;
      if (h.command === hookScriptPath) {
        if (typeof h.timeout !== 'number') h.timeout = DEFAULT_TIMEOUT_SECONDS;
        break;
      }
    }
  }

  return entry;
}

function upsertSessionStart(settings: any, agent: AgentType, hookScriptPath: string, force: boolean): { updated: any; changed: boolean } {
  const next = settings && typeof settings === 'object' ? { ...settings } : {};
  if (!next.hooks || typeof next.hooks !== 'object') next.hooks = {};

  const existing = Array.isArray(next.hooks.SessionStart) ? next.hooks.SessionStart : [];
  const sessionStart: any[] = [...existing];

  const idx = sessionStart.findIndex((e) => entryHasCommand(e, hookScriptPath));

  if (idx >= 0) {
    if (force) {
      sessionStart[idx] = normalizeExistingEntryForAgent(sessionStart[idx], agent, hookScriptPath);
      next.hooks.SessionStart = sessionStart;
      return { updated: next, changed: true };
    }
    return { updated: next, changed: false };
  }

  sessionStart.push(buildSessionStartEntry(agent, hookScriptPath));
  next.hooks.SessionStart = sessionStart;
  return { updated: next, changed: true };
}

function hasExplicitFlag(flagLong: string, flagShort: string): boolean {
  const argv = process.argv.slice(2);
  return argv.includes(flagLong) || argv.includes(flagShort);
}

export async function installHooks(opts: InstallHooksOptions): Promise<void> {
  const force = Boolean(opts.force);

  const hasGlobalFlag = hasExplicitFlag('--global', '-g');
  const hasProjectFlag = hasExplicitFlag('--project', '-p');
  if (hasGlobalFlag && hasProjectFlag) {
    console.error('Error: Please choose either --global or --project (not both).');
    process.exit(1);
  }

  const isGlobal = opts.global !== false && !opts.project;
  const agent = parseAgent(opts.agent);

  const homeDir = os.homedir();
  const binDir = path.join(homeDir, '.openskills', 'bin');
  ensureDir(binDir);

  // Create/update alias wrapper scripts (load-skill, install-skill, etc.)
  createAliasScripts(binDir);

  const sessionHookScriptPath = path.join(binDir, 'openskills-session-hook');
  createSessionHookScript(sessionHookScriptPath);

  const { settingsPath, configDirName } = resolveSettingsPath(agent, isGlobal);
  ensureDir(path.dirname(settingsPath));

  const hookJson = { hooks: { SessionStart: [buildSessionStartEntry(agent, sessionHookScriptPath)] } };

  if (opts.manual) {
    console.log('\n📋 Manual Configuration');
    console.log(`Add the following to your ${configDirName}/settings.json file:`);
    console.log('---------------------------------------------------');
    console.log(JSON.stringify(hookJson, null, 2));
    console.log('---------------------------------------------------');
    return;
  }

  const exists = fs.existsSync(settingsPath);
  const originalText = exists ? fs.readFileSync(settingsPath, 'utf-8') : '{}';

  const { data: parsedSettings, errors } = parseJsonc<any>(originalText);
  const hasParseErrors = errors.length > 0;

  if (hasParseErrors && !force) {
    console.error(`Error: Could not parse settings file at ${settingsPath}.`);
    console.error('Use --force to back up and overwrite it with a clean settings object.');
    process.exit(1);
  }

  if (hasParseErrors && force && exists) {
    try {
      fs.writeFileSync(`${settingsPath}.bak`, originalText, { flag: 'w' });
    } catch {
      // ignore backup failures
    }
  }

  const baseSettings = hasParseErrors && force ? {} : parsedSettings;
  const { updated, changed } = upsertSessionStart(baseSettings, agent, sessionHookScriptPath, force);

  if (!changed) {
    console.log(`ℹ️  SessionStart hook already exists in ${settingsPath}`);
  } else {
    let nextText = hasParseErrors && force ? '{}' : originalText;

    if (!hasJsoncPath(nextText, ['hooks'])) {
      nextText = setJsoncPath(nextText, ['hooks'], {}, DEFAULT_FORMATTING);
    }

    nextText = setJsoncPath(nextText, ['hooks', 'SessionStart'], updated.hooks.SessionStart, DEFAULT_FORMATTING);

    if (!nextText.endsWith('\n')) nextText = `${nextText}\n`;
    fs.writeFileSync(settingsPath, nextText);
    console.log(`✅ Added SessionStart hook to ${settingsPath} for agent ${agent}`);
  }

  console.log('\nSetup complete! Restart your agent session to use the aliases:');
  Object.keys(ALIASES).forEach((alias) => console.log(`  - ${alias}`));
}
