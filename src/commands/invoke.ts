import { readFileSync } from 'fs';
import { findSkill } from '../utils/skills.js';
import { parseFrontmatter } from '../utils/yaml.js';
import type { ReadJsonOutput, ContextModifier, SkillFrontmatter, NewMessage, AttachmentVerbosity, ExecutionPayload } from '../types.js';
import { normalizePermissions, checkSkillPermissions } from '../utils/permissions.js';
import { validateSkillCommand } from '../utils/validation.js';
import { extractRelativeRefs } from '../utils/refs.js';
import { loadConfig, configToPermissionRules } from '../utils/config.js';
import { askUserPermission } from '../utils/interactive.js';
import { buildAttachments, collectDiagnostics } from '../utils/attachments.js';
import { discoverSkillScripts } from '../utils/script-discovery.js';

export interface InvokeOptions { args?: string; yes?: boolean; attachments?: AttachmentVerbosity; format?: 'json' | 'prompt' | 'execution'; }

/**
 * Invoke a skill and emit strict Skill Tool contract payload (JSON)
 * - Message 1: visible metadata (<command-message>, <command-name>, optional <command-args>)
 * - Message 2: hidden SKILL.md prompt body only (no frontmatter)
 * - Message 3: (conditional) hidden command_permissions object when allowed-tools/model override
 * - Message 4+: (conditional) hidden attachment messages when resources/diagnostics exist
 */
export async function invokeSkill(skillName: string, options: InvokeOptions = {}): Promise<void> {
  // Validate command
  const validation = validateSkillCommand(skillName);
  if (!validation.valid) {
    const error = {
      error: validation.message,
      errorCode: validation.errorCode,
      suggestion: validation.suggestion,
    };
    console.log(JSON.stringify(error, null, 2));
    process.exit(validation.errorCode || 1);
  }

  // Resolve location (double-checked at runtime for safety)
  const loc = findSkill(skillName);
  if (!loc) {
    console.log(JSON.stringify({
      error: `Unknown skill: ${skillName}`,
      errorCode: 2,
      suggestion: 'Run "openskills list" to see available skills'
    }, null, 2));
    process.exit(2);
  }

  // Load config and permissions
  const config = loadConfig();
  const permissionRules = configToPermissionRules(config);
  let permissionCheck = checkSkillPermissions(skillName, permissionRules);
  // Respect default behavior when no rule matched
  if (permissionCheck.behavior === 'ask') {
    const def = config.permissions?.skills?.default || 'ask';
    if (def === 'deny') permissionCheck = { behavior: 'deny', message: `Default deny for skill: ${skillName}` };
    if (def === 'allow') permissionCheck = { behavior: 'allow' };
  }

  if (permissionCheck.behavior === 'deny') {
    console.log(JSON.stringify({
      error: permissionCheck.message || `Skill "${skillName}" is denied by permission rules`,
      errorCode: 'PERMISSION_DENIED'
    }, null, 2));
    process.exit(1);
  }

  if (permissionCheck.behavior === 'ask') {
    const approved = await askUserPermission(skillName, {
      force: options.yes,
      nonInteractive: !process.stdin.isTTY
    });
    if (!approved) {
      console.log(JSON.stringify({
        error: `User denied permission for skill "${skillName}"`,
        errorCode: 'PERMISSION_DENIED',
        suggestion: 'Add to allow rules in .openskills.json or use --yes flag'
      }, null, 2));
      process.exit(1);
    }
  }

  const content = readFileSync(loc.path, 'utf-8');
  const { frontmatter, body } = parseFrontmatter<SkillFrontmatter>(content);

  // Build context modifier and permissions
  const allowedField = frontmatter?.['allowed-tools'] ?? (frontmatter as any)?.allowed_tools;
  const denyField: unknown = (frontmatter as any)?.['deny-tools'] ?? (frontmatter as any)?.deny_tools;
  const normalizedPermissions = normalizePermissions({ allowed: allowedField, deny: denyField });

  const allowedTools = normalizeAllowedTools(allowedField);
  const model = typeof frontmatter?.model === 'string' ? frontmatter.model : undefined;

  const contextModifier: ContextModifier = {
    allowedTools,
    model,
    disableModelInvocation: (frontmatter?.['disable-model-invocation'] ?? frontmatter?.disable_model_invocation) ? true : undefined,
    reasoningEffort: normalizeReasoningEffort(frontmatter) ?? undefined,
    mode: frontmatter?.mode,
    tokens: frontmatter?.tokens,
    normalizedPermissions,
  };

  // Build attachments using elegant pure functions
  const refs = extractRelativeRefs(body);
  const diagnostics = collectDiagnostics(frontmatter);
  const attachmentVerbosity = options.attachments ?? 'warnings';
  
  const attachments = buildAttachments({
    frontmatter,
    baseDir: loc.baseDir,
    resources: refs,
    diagnostics,
    options: { verbosity: attachmentVerbosity }
  });

  // Build messages per contract
  const visibleMeta = [
    `<command-message>The "${frontmatter?.name || skillName}" skill is loading</command-message>`,
    `<command-name>${frontmatter?.name || skillName}</command-name>`,
    options.args ? `<command-args>${options.args}</command-args>` : null,
  ].filter(Boolean).join('\n');

  // START with TWO messages per blog line 692: "two separate user messages"
  const newMessages: NewMessage[] = [
    { role: 'user', content: visibleMeta, isMeta: false },  // Message 1: Visible metadata
    { role: 'user', content: `<!-- baseDir: ${loc.baseDir} -->\n${body}`, isMeta: true }, // Message 2: Hidden skill prompt
  ];

  // CONDITIONALLY add permissions message (blog lines 773-783)
  // Only if skill declares allowed-tools OR model override
  if ((allowedTools && allowedTools.length > 0) || model) {
    newMessages.push({
      role: 'user',
      content: {
        type: 'command_permissions',
        allowedTools: allowedTools || [],
        model: model || null
      },
      isMeta: true
    });
  }

  // CONDITIONALLY add attachment messages (blog lines 768-785)
  if (attachments.length > 0) {
    newMessages.push(...attachments);
  }

  const json: ReadJsonOutput = {
    skill: { name: frontmatter?.name || skillName, baseDir: loc.baseDir, version: frontmatter?.version },
    newMessages,
    contextModifier,
    attachments: attachments.length ? attachments : undefined,
  };

  // Output format handling
  if (options.format === 'prompt') {
    // Extract just the SKILL.md content (message 2) for slash commands
    console.log(newMessages[1].content);
    return;
  }
  
  if (options.format === 'execution') {
    // Return execution context for script-based usage
    const scripts = await discoverSkillScripts(loc.baseDir);
    
    const executionPayload: ExecutionPayload = {
      skill: {
        name: frontmatter?.name || skillName,
        baseDir: loc.baseDir
      },
      execution: {
        workDir: process.cwd(),
        scripts: scripts.map(s => ({
          path: s.path,
          usage: s.usage?.replace('{baseDir}', loc.baseDir) || `python ${loc.baseDir}/${s.path}`,
          description: s.description
        })),
        environment: {
          SKILL_BASE: loc.baseDir,
          WORK_DIR: process.cwd()
        }
      },
      prompt: body.replace(/\{baseDir\}/g, loc.baseDir).substring(0, 1000) + '...', // First 1000 chars
      instructions: `EXECUTION MODEL:
Skills are EXECUTABLE TOOLKITS containing scripts and resources.

HOW TO USE:
1. Scripts are STANDALONE - execute them directly via Bash
2. Use absolute paths: python ${loc.baseDir}/scripts/script.py [args]
3. DON'T import skill modules as Python packages

✅ CORRECT: python ${loc.baseDir}/scripts/create_gif.py --output test.gif
❌ WRONG: import sys; sys.path.append('${loc.baseDir}'); from templates import *

Environment variables available:
- SKILL_BASE: ${loc.baseDir}
- WORK_DIR: ${process.cwd()}

Execute scripts from the baseDir path provided above.`
    };
    
    console.log(JSON.stringify(executionPayload, null, 2));
    return;
  }

  // Default: JSON output
  console.log(JSON.stringify(json, null, 2));
}

function normalizeAllowedTools(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const result = value.map((v) => String(v).trim()).filter(Boolean);
    return result.length > 0 ? result : undefined;
  }
  const s = String(value).trim();
  if (!s) return undefined;  // Handle empty string
  const result = s.split(',').map((p) => p.trim()).filter(Boolean);
  return result.length > 0 ? result : undefined;  // Handle comma-only strings
}

function normalizeReasoningEffort(fm?: SkillFrontmatter): ContextModifier['reasoningEffort'] | null {
  if (!fm) return null;
  const raw = (fm['reasoning-effort'] ?? (fm as any).reasoningEffort ?? fm.reasoning_effort);
  if (!raw) return null;
  const v = String(raw).toLowerCase();
  return ['off','none','low','medium','high'].includes(v) ? (v as any) : null;
}
