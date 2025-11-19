import { readFileSync } from 'fs';
import { findSkill } from '../utils/skills.js';
import { parseFrontmatter } from '../utils/yaml.js';
import type { SkillFrontmatter, ExecutionPayload } from '../types.js';
import { checkSkillPermissions } from '../utils/permissions.js';
import { validateSkillCommand } from '../utils/validation.js';
import { loadConfig, configToPermissionRules } from '../utils/config.js';
import { askUserPermission } from '../utils/interactive.js';
import { discoverSkillScripts } from '../utils/script-discovery.js';

export interface UseOptions { args?: string; yes?: boolean; }

/**
 * Use a skill and emit strict execution payload (JSON)
 * Formerly 'invoke'
 */
export async function useSkill(skillName: string, options: UseOptions = {}): Promise<void> {
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

  // Return execution context for script-based usage
  const scripts = await discoverSkillScripts(loc.baseDir);
  
  const allowedField = frontmatter?.['allowed-tools'] ?? (frontmatter as any)?.allowed_tools;
  const allowedTools = normalizeAllowedTools(allowedField);
  const model = typeof frontmatter?.model === 'string' ? frontmatter.model : undefined;

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

Execute scripts from the baseDir path provided above.`,
    permissions: (allowedTools || model) ? {
      allowedTools,
      model
    } : undefined
  };
  
  console.log(JSON.stringify(executionPayload, null, 2));
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

