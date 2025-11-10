import { findSkill } from './skills.js';
import { readFileSync } from 'fs';
import { parseFrontmatter } from './yaml.js';
import { SkillErrorCode, type SkillValidationResult, type SkillFrontmatter } from '../types.js';

/**
 * Validate a skill command before execution
 * 
 * Implements 5 error codes per blog spec:
 * 1. EMPTY_COMMAND - No skill name provided
 * 2. UNKNOWN_SKILL - Skill not found
 * 3. LOAD_FAILED - Cannot read/parse SKILL.md
 * 4. INVOCATION_DISABLED - disable-model-invocation: true
 * 5. NOT_PROMPT_BASED - Missing description field
 * 
 * @param skillName - Name of skill to validate
 * @returns Validation result with error code and helpful suggestion
 */
export function validateSkillCommand(skillName: string): SkillValidationResult {
  // Error 1: Empty command
  if (!skillName || skillName.trim() === '') {
    return {
      valid: false,
      errorCode: SkillErrorCode.EMPTY_COMMAND,
      message: 'Empty skill command',
      suggestion: 'Provide a skill name, e.g.: openskills read pdf-extractor'
    };
  }
  
  // Error 2: Unknown skill
  const skill = findSkill(skillName);
  if (!skill) {
    return {
      valid: false,
      errorCode: SkillErrorCode.UNKNOWN_SKILL,
      message: `Unknown skill: ${skillName}`,
      suggestion: 'Run "openskills list" to see available skills'
    };
  }
  
  // Error 3: Load failed
  try {
    const content = readFileSync(skill.path, 'utf-8');
    const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);
    
    // Error 4: Invocation disabled
    const disableInvocation = frontmatter?.['disable-model-invocation'] 
      || frontmatter?.disable_model_invocation;
      
    if (disableInvocation) {
      return {
        valid: false,
        errorCode: SkillErrorCode.INVOCATION_DISABLED,
        message: `Skill "${skillName}" cannot be automatically invoked`,
        suggestion: 'This skill must be invoked manually or used as reference'
      };
    }
    
    // Error 5: Not prompt-based
    if (!frontmatter?.description) {
      return {
        valid: false,
        errorCode: SkillErrorCode.NOT_PROMPT_BASED,
        message: `Skill "${skillName}" is not prompt-based (missing description)`,
        suggestion: 'Add a description field to the SKILL.md frontmatter'
      };
    }
    
    // All validations passed
    return { valid: true };
    
  } catch (err) {
    return {
      valid: false,
      errorCode: SkillErrorCode.LOAD_FAILED,
      message: `Failed to load skill "${skillName}": ${err instanceof Error ? err.message : String(err)}`,
      suggestion: 'Check that SKILL.md exists and has valid YAML frontmatter'
    };
  }
}
