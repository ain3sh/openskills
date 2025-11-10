import { readFileSync } from 'fs';
import { findSkill } from '../utils/skills.js';
import { parseFrontmatter } from '../utils/yaml.js';
import type { ReadJsonOutput, ContextModifier, SkillFrontmatter, AttachmentVerbosity, NewMessage } from '../types.js';
import { normalizePermissions, checkSkillPermissions } from '../utils/permissions.js';
import { validateSkillCommand } from '../utils/validation.js';
import { extractRelativeRefs } from '../utils/refs.js';
import { loadConfig, configToPermissionRules } from '../utils/config.js';
import { askUserPermission } from '../utils/interactive.js';
import { telemetry } from '../utils/telemetry.js';
import { buildAttachments, collectDiagnostics } from '../utils/attachments.js';

/**
 * Read skill to stdout (for AI agents)
 */
export async function readSkill(
  skillName: string, 
  options?: { format?: string; yes?: boolean; attachments?: AttachmentVerbosity }
): Promise<void> {
  const startTime = Date.now();
  const fmt = options?.format ?? 'json';
  
  try {
    await readSkillInternal(skillName, options);
    
    // Track success
    telemetry.log({
      command: 'read',
      skillName,
      success: true,
      duration: Date.now() - startTime
    });
  } catch (error) {
    // Track failure
    telemetry.log({
      command: 'read',
      skillName,
      success: false,
      duration: Date.now() - startTime
    });
    throw error;
  }
}

/**
 * Internal implementation of readSkill
 */
async function readSkillInternal(
  skillName: string,
  options?: { format?: string; yes?: boolean; attachments?: AttachmentVerbosity }
): Promise<void> {
  const fmt = options?.format ?? 'json';
  const attachmentVerbosity = options?.attachments ?? 'warnings';

  // Validate skill command before reading
  const validation = validateSkillCommand(skillName);
  
  if (!validation.valid) {
    if (fmt === 'json') {
      // Structured error output in JSON format
      const error = {
        error: validation.message,
        errorCode: validation.errorCode,
        suggestion: validation.suggestion
      };
      console.log(JSON.stringify(error, null, 2));
    } else {
      // Human-readable error output
      console.error(`Error: ${validation.message}`);
      if (validation.suggestion) {
        console.error(`Suggestion: ${validation.suggestion}`);
      }
    }
    process.exit(validation.errorCode || 1);
  }

  // Validation passed - skill should exist, but re-check to guard against TOCTOU changes
  const skill = findSkill(skillName);
  if (!skill) {
    if (fmt === 'json') {
      console.log(JSON.stringify({
        error: `Unknown skill: ${skillName}`,
        errorCode: 2,
        suggestion: 'Run "openskills list" to see available skills'
      }, null, 2));
    } else {
      console.error(`Error: Unknown skill: ${skillName}`);
      console.error('Suggestion: Run "openskills list" to see available skills');
    }
    process.exit(2);
  }

  // Check permissions from config file
  const config = loadConfig();
  const permissionRules = configToPermissionRules(config);
  const permissionCheck = checkSkillPermissions(skillName, permissionRules);
  
  if (permissionCheck.behavior === 'deny') {
    if (fmt === 'json') {
      console.log(JSON.stringify({
        error: permissionCheck.message || `Skill "${skillName}" is denied by permission rules`,
        errorCode: 'PERMISSION_DENIED',
        suggestion: 'Check your .openskills.json configuration'
      }, null, 2));
    } else {
      console.error(`Error: ${permissionCheck.message || 'Permission denied'}`);
      console.error('Suggestion: Check your .openskills.json configuration');
    }
    process.exit(1);
  }
  
  // Handle 'ask' behavior with interactive prompt
  if (permissionCheck.behavior === 'ask') {
    const approved = await askUserPermission(skillName, {
      force: options?.yes,
      nonInteractive: !process.stdin.isTTY
    });
    
    if (!approved) {
      if (fmt === 'json') {
        console.log(JSON.stringify({
          error: `User denied permission for skill "${skillName}"`,
          errorCode: 'PERMISSION_DENIED',
          suggestion: 'Add to allow rules in .openskills.json or use --yes flag'
        }, null, 2));
      } else {
        console.error(`❌ Permission denied for skill: ${skillName}`);
        console.error('💡 Tip: Add to .openskills.json allow rules to skip prompts');
      }
      process.exit(1);
    }
  }

  const content = readFileSync(skill.path, 'utf-8');
  const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);

  // Build context modifier (used by both JSON and text outputs)
  const allowed = frontmatter?.['allowed-tools'] ?? frontmatter?.allowed_tools;
  const deny: unknown = (frontmatter as any)?.['deny-tools'] ?? (frontmatter as any)?.deny_tools;
  const disableInv = frontmatter?.['disable-model-invocation'] ?? frontmatter?.disable_model_invocation;
  const reasoning = normalizeReasoningEffort(frontmatter);
  const normalizedPermissions = normalizePermissions({ allowed, deny });

  // Security: Proper type guards prevent undefined access in array operations
  const contextModifier: ContextModifier = {
    allowedTools: normalizeAllowedTools(allowed),
    model: typeof frontmatter?.model === 'string' ? frontmatter.model : undefined,
    disableModelInvocation: disableInv != null ? Boolean(disableInv) : undefined,
    reasoningEffort: reasoning ?? undefined,
    mode: frontmatter?.mode,
    tokens: frontmatter?.tokens,
    normalizedPermissions,
  };

  if (fmt === 'json') {

    // Build attachments using elegant pure functions
    const refs = extractRelativeRefs(content);
    const diagnostics = collectDiagnostics(frontmatter);
    
    const attachments = buildAttachments({
      frontmatter,
      baseDir: skill.baseDir,
      resources: refs,
      diagnostics,
      options: { verbosity: attachmentVerbosity }
    });

    // START with TWO messages per blog line 692: "two separate user messages"
    const newMessages: NewMessage[] = [
      { role: 'user', content: `<command-message>The "${skillName}" skill is loading</command-message>`, isMeta: false },
      { role: 'user', content: `<!-- baseDir: ${skill.baseDir} -->\n${content}`, isMeta: true },
    ];

    // CONDITIONALLY add attachment messages (blog lines 774)
    // Only if attachments exist (diagnostics, file references, additional context)
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        newMessages.push({
          role: 'user',
          content: typeof attachment === 'string' ? attachment : JSON.stringify(attachment),
          isMeta: true
        });
      }
    }

    // CONDITIONALLY add permissions message - same logic as invoke.ts for consistency
    if ((contextModifier.allowedTools && contextModifier.allowedTools.length > 0) || contextModifier.model) {
      newMessages.push({
        role: 'user',
        content: {
          type: 'command_permissions',
          allowedTools: contextModifier.allowedTools || [],
          model: contextModifier.model || null
        },
        isMeta: true
      });
    }

    const json: ReadJsonOutput = {
      skill: { name: frontmatter?.name || skillName, baseDir: skill.baseDir, version: frontmatter?.version },
      newMessages,
      contextModifier,
      attachments: attachments.length > 0 ? attachments : undefined,  // Only include if non-empty
    };
    console.log(JSON.stringify(json, null, 2));
    return;
  }

  // Default: text output with clear boundaries for agents
  const border = '═'.repeat(60);
  console.log(`\n${border}`);
  console.log(`📖 SKILL LOADED: ${skillName}`);
  console.log(border);
  console.log(`📁 Base directory: ${skill.baseDir}`);
  if (frontmatter?.version) {
    console.log(`📦 Version: ${frontmatter.version}`);
  }
  if (contextModifier.allowedTools && contextModifier.allowedTools.length > 0) {
    console.log(`🛠️  Allowed tools: ${contextModifier.allowedTools.join(', ')}`);
  }
  console.log(`${border}\n`);
  
  console.log(content);
  
  console.log(`\n${border}`);
  console.log(`✅ Skill "${skillName}" ready`);
  console.log(`💡 Follow the instructions above to complete your task`);
  console.log(`${border}\n`);
}

function normalizeReasoningEffort(fm?: SkillFrontmatter): ContextModifier['reasoningEffort'] | null {
  if (!fm) return null;
  const raw = (fm['reasoning-effort'] ?? (fm as any).reasoningEffort ?? fm.reasoning_effort);
  if (!raw) return null;
  const v = String(raw).toLowerCase();
  if (['off','none','low','medium','high'].includes(v)) return v as any;
  return null;
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
