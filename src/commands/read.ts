import { readFileSync } from 'fs';
import { findSkill } from '../utils/skills.js';
import { parseFrontmatter } from '../utils/yaml.js';
import type { ReadJsonOutput, ContextModifier, SkillFrontmatter } from '../types.js';
import { normalizePermissions } from '../utils/permissions.js';

/**
 * Read skill to stdout (for AI agents)
 */
export function readSkill(skillName: string, options?: { format?: string }): void {
  const skill = findSkill(skillName);

  if (!skill) {
    console.error(`Error: Skill '${skillName}' not found`);
    console.error('\nSearched:');
    console.error('  .agent/skills/ (project universal)');
    console.error('  ~/.agent/skills/ (global universal)');
    console.error('  .claude/skills/ (project)');
    console.error('  ~/.claude/skills/ (global)');
    console.error('\nInstall skills: openskills install owner/repo');
    process.exit(1);
  }

  const content = readFileSync(skill.path, 'utf-8');

  const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);
  const fmt = options?.format ?? 'text';

  if (fmt === 'json') {
    const allowed = frontmatter?.['allowed-tools'] ?? frontmatter?.allowed_tools;
    const deny: unknown = (frontmatter as any)?.['deny-tools'] ?? (frontmatter as any)?.deny_tools;
    const disableInv = frontmatter?.['disable-model-invocation'] ?? frontmatter?.disable_model_invocation;
    const reasoning = normalizeReasoningEffort(frontmatter);
    const normalizedPermissions = normalizePermissions({ allowed, deny });

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

    const json: ReadJsonOutput = {
      skill: { name: frontmatter?.name || skillName, baseDir: skill.baseDir, version: frontmatter?.version },
      newMessages: [
        { role: 'user', content: `<command-message>The "${skillName}" skill is loading</command-message>`, isMeta: false },
        { role: 'user', content: `<!-- baseDir: ${skill.baseDir} -->\n${content}`, isMeta: true },
        { role: 'user', content: `<metadata name=\"${frontmatter?.name || skillName}\" baseDir=\"${skill.baseDir}\" model=\"${contextModifier.model ?? ''}\" allowedTools=\"${(contextModifier.allowedTools||[]).join(',')}\"></metadata>`, isMeta: true },
      ],
      contextModifier,
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
