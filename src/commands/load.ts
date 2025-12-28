import { readFileSync } from 'fs';
import { findSkill } from '../skill/discovery.js';
import { parseFrontmatter } from '../skill/frontmatter.js';
import type { SkillFrontmatter } from '../types.js';
import { checkSkillPermissions } from '../skill/permissions.js';
import { validateSkillCommand } from '../skill/validation.js';
import { loadConfig, configToPermissionRules } from '../config/loader.js';
import { askUserPermission } from '../agent/interactive.js';
import { telemetry } from '../telemetry/tracker.js';

/**
 * Load skill to stdout (for AI agents)
 * Formerly 'read'
 */
export async function loadSkill(
  skillName: string, 
  options?: { tui?: boolean }
): Promise<void> {
  const startTime = Date.now();
  
  try {
    await loadSkillInternal(skillName, options);
    
    // Track success
    telemetry.log({
      command: 'load',
      skillName,
      success: true,
      duration: Date.now() - startTime
    });
  } catch (error) {
    // Track failure
    telemetry.log({
      command: 'load',
      skillName,
      success: false,
      duration: Date.now() - startTime
    });
    throw error;
  }
}

/**
 * Internal implementation of loadSkill
 */
async function loadSkillInternal(
  skillName: string,
  options?: { tui?: boolean }
): Promise<void> {
  // Validate skill command before reading
  const validation = validateSkillCommand(skillName);
  
  if (!validation.valid) {
    console.error(`Error: ${validation.message}`);
    if (validation.suggestion) {
      console.error(`Suggestion: ${validation.suggestion}`);
    }
    process.exit(validation.errorCode || 1);
  }

  // Validation passed - skill should exist, but re-check to guard against TOCTOU changes
  const skill = findSkill(skillName);
  if (!skill) {
    console.error(`Error: Unknown skill: ${skillName}`);
    console.error('Suggestion: Run "openskills list" to see available skills');
    process.exit(2);
  }

  // Check permissions from config file
  const config = loadConfig();
  const permissionRules = configToPermissionRules(config);
  const permissionCheck = checkSkillPermissions(skillName, permissionRules);
  
  if (permissionCheck.behavior === 'deny') {
    console.error(`Error: ${permissionCheck.message || 'Permission denied'}`);
    console.error('Suggestion: Check your .openskills.json configuration');
    process.exit(1);
  }
  
  // Handle 'ask' behavior with interactive prompt
  if (permissionCheck.behavior === 'ask') {
    const approved = await askUserPermission(skillName, {
      force: !options?.tui,
      nonInteractive: !process.stdin.isTTY
    });
    
    if (!approved) {
      console.error(`❌ Permission denied for skill: ${skillName}`);
      console.error('💡 Tip: Add to .openskills.json allow rules to skip prompts');
      process.exit(1);
    }
  }

  const content = readFileSync(skill.path, 'utf-8');
  const { body } = parseFrontmatter<SkillFrontmatter>(content);
  const skillBody = body ?? '';

  // Output just the prompt-ready content with baseDir
  console.log(`<!-- baseDir: ${skill.baseDir} -->\n${skillBody}`);
}

