import { readFileSync } from 'fs';
import { findSkill } from '../utils/skills.js';
import { parseFrontmatter } from '../utils/yaml.js';
import type { ReadJsonOutput, ContextModifier, SkillFrontmatter, AttachmentMessage } from '../types.js';
import { normalizePermissions, checkSkillPermissions } from '../utils/permissions.js';
import { validateSkillCommand } from '../utils/validation.js';
import { extractRelativeRefs } from '../utils/refs.js';
import { loadConfig, configToPermissionRules } from '../utils/config.js';

/**
 * Read skill to stdout (for AI agents)
 */
export function readSkill(skillName: string, options?: { format?: string }): void {
  const fmt = options?.format ?? 'text';

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

  // Validation passed - skill exists and is valid
  const skill = findSkill(skillName)!; // Non-null assertion safe after validation

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
  
  // TODO: Handle 'ask' behavior with interactive prompt in future version
  // For now, 'ask' defaults to allow

  const content = readFileSync(skill.path, 'utf-8');
  const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);

  if (fmt === 'json') {
    const allowed = frontmatter?.['allowed-tools'] ?? frontmatter?.allowed_tools;
    const deny: unknown = (frontmatter as any)?.['deny-tools'] ?? (frontmatter as any)?.deny_tools;
    const disableInv = frontmatter?.['disable-model-invocation'] ?? frontmatter?.disable_model_invocation;
    const reasoning = normalizeReasoningEffort(frontmatter);
    const normalizedPermissions = normalizePermissions({ allowed, deny });

    // Security: Proper type guards prevent undefined access in array operations
    const contextModifier: ContextModifier = {
      allowedTools: Array.isArray(allowed)
        ? (allowed as string[])
        : (typeof allowed === 'string' ? [allowed] : undefined),
      model: typeof frontmatter?.model === 'string' ? frontmatter.model : undefined,
      disableModelInvocation: disableInv != null ? Boolean(disableInv) : undefined,
      reasoningEffort: reasoning ?? undefined,
      mode: frontmatter?.mode,
      tokens: frontmatter?.tokens,
      normalizedPermissions,
    };

    // Collect attachments (diagnostics, file references)
    const attachments: AttachmentMessage[] = [];
    
    // Add bundled resources as file references (if any exist)
    const refs = extractRelativeRefs(content);
    if (refs.length > 0) {
      attachments.push({
        type: 'file_reference',
        content: `Bundled resources available in ${skill.baseDir}:\n${refs.map(r => `- ${r}`).join('\n')}`,
        metadata: { files: refs, count: refs.length, baseDir: skill.baseDir }
      });
    }
    
    // Check for common issues and add diagnostics
    const warnings: string[] = [];
    if (!frontmatter?.version) {
      warnings.push('Skill has no version field (recommended for tracking)');
    }
    if (!frontmatter?.license) {
      warnings.push('Skill has no license field (recommended for distribution)');
    }
    
    if (warnings.length > 0) {
      attachments.push({
        type: 'diagnostics',
        content: warnings.join('\n'),
        metadata: { level: 'warning', count: warnings.length }
      });
    }
    
    // Add context attachment if additional context is provided
    const contextField = frontmatter?.context || (frontmatter as any)?.['additional-context'];
    if (contextField && typeof contextField === 'string') {
      attachments.push({
        type: 'context',
        content: contextField,
        metadata: { source: 'frontmatter' }
      });
    }

    const json: ReadJsonOutput = {
      skill: { name: frontmatter?.name || skillName, baseDir: skill.baseDir, version: frontmatter?.version },
      newMessages: [
        { role: 'user', content: `<command-message>The "${skillName}" skill is loading</command-message>`, isMeta: false },
        { role: 'user', content: `<!-- baseDir: ${skill.baseDir} -->\n${content}`, isMeta: true },
        { role: 'user', content: `<metadata name=\"${frontmatter?.name || skillName}\" baseDir=\"${skill.baseDir}\" model=\"${contextModifier.model ?? ''}\" allowedTools=\"${(contextModifier.allowedTools||[]).join(',')}\"></metadata>`, isMeta: true },
      ],
      contextModifier,
      attachments: attachments.length > 0 ? attachments : undefined,  // Only include if non-empty
    };
    console.log(JSON.stringify(json, null, 2));
    return;
  }

  // Default: text output compatible with existing agents
  console.log(`Reading: ${skillName}`);
  console.log(`Base directory: ${skill.baseDir}`);
  console.log('');
  console.log(content);
  console.log('');
  console.log(`Skill read: ${skillName}`);
}

function normalizeReasoningEffort(fm?: SkillFrontmatter): ContextModifier['reasoningEffort'] | null {
  if (!fm) return null;
  const raw = (fm['reasoning-effort'] ?? (fm as any).reasoningEffort ?? fm.reasoning_effort);
  if (!raw) return null;
  const v = String(raw).toLowerCase();
  if (['off','none','low','medium','high'].includes(v)) return v as any;
  return null;
}
