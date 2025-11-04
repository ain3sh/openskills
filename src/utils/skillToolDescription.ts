import type { Skill, SkillFrontmatter } from '../types.js';
import { findAllSkills, findSkill } from './skills.js';
import { readFileSync } from 'fs';
import { parseFrontmatter } from './yaml.js';
import { isPresentable } from './presentability.js';

/**
 * Maximum character limit for skill tool descriptions
 * Per blog spec: "subject to a token budget limit of 15,000 characters"
 */
const MAX_DESCRIPTION_CHARS = 15000;

interface SkillEntry {
  name: string;
  description: string;
  isMode: boolean;
  version?: string;
  license?: string;
}

/**
 * Build a skill tool description with progressive disclosure and token budget limiting
 * 
 * Implements Claude Code's pattern:
 * - Mode commands appear first (higher priority)
 * - Regular commands follow
 * - Truncates at MAX_DESCRIPTION_CHARS (15,000) to fit token budget
 * - Uses XML structure for clarity
 * 
 * Per blog: "The <available_skills> section lives within the Skill tool's description
 * and gets regenerated for each API request. The system dynamically builds this list
 * by aggregating currently loaded skills from user and project configurations,
 * plugin-provided skills, and any built-in skills, subject to a token budget limit
 * of 15,000 characters by default."
 */
export function buildSkillToolDescription(
  options?: {
    maxChars?: number;
    includeHidden?: boolean;
    includeDisabled?: boolean;
    all?: boolean;
  }
): string {
  const maxChars = options?.maxChars ?? MAX_DESCRIPTION_CHARS;
  
  // Load and filter skills
  const raw = findAllSkills().sort((a, b) => a.name.localeCompare(b.name));
  const entries: SkillEntry[] = [];
  
  for (const skill of raw) {
    const loc = findSkill(skill.name);
    if (!loc) continue;
    
    const content = readFileSync(loc.path, 'utf-8');
    const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);
    
    // Filter by presentability
    if (!options?.all && !isPresentable(frontmatter, {
      includeHidden: options?.includeHidden,
      includeDisabled: options?.includeDisabled,
      requireDescription: true
    })) {
      continue;
    }
    
    entries.push({
      name: skill.name,
      description: frontmatter?.description || skill.description,
      isMode: Boolean(frontmatter?.mode),
      version: frontmatter?.version,
      license: frontmatter?.license,
    });
  }
  
  // Separate mode commands from regular commands
  const modeCommands = entries.filter(e => e.isMode);
  const regularCommands = entries.filter(e => !e.isMode);
  
  // Build description with XML structure and progressive truncation
  const instructions = buildInstructions();
  const closingTag = '</available_skills>';
  const truncationNote = '<!-- truncated: more skills available -->\n';
  
  // Start with instructions
  let description = instructions;
  description += '<available_skills>\n';
  
  // Calculate remaining budget for skills
  const baseLength = description.length + closingTag.length;
  const remainingBudget = maxChars - baseLength;
  
  // If instructions alone exceed budget, truncate them
  if (baseLength > maxChars) {
    // Minimal version: just the tags
    description = '<skills_instructions>Skills available. Invoke with command name.</skills_instructions>\n\n';
    description += '<available_skills>\n';
  }
  
  let currentLength = description.length;
  
  // Add mode commands first (higher priority)
  if (modeCommands.length > 0) {
    const modeHeader = '<mode_commands>\n';
    const modeFooter = '</mode_commands>\n\n';
    
    if (currentLength + modeHeader.length + modeFooter.length + closingTag.length < maxChars) {
      description += modeHeader;
      currentLength += modeHeader.length;
      
      for (const entry of modeCommands) {
        const formatted = formatSkillEntry(entry);
        const neededSpace = formatted.length + modeFooter.length + closingTag.length + truncationNote.length;
        
        if (currentLength + neededSpace > maxChars) {
          description += truncationNote;
          break;
        }
        description += formatted;
        currentLength += formatted.length;
      }
      
      description += modeFooter;
      currentLength += modeFooter.length;
    }
  }
  
  // Add regular commands (with truncation)
  for (const entry of regularCommands) {
    const formatted = formatSkillEntry(entry);
    const neededSpace = formatted.length + closingTag.length + truncationNote.length;
    
    if (currentLength + neededSpace > maxChars) {
      description += truncationNote;
      break;
    }
    description += formatted;
    currentLength += formatted.length;
  }
  
  description += closingTag;
  return description;
}

/**
 * Build the skill instructions section
 * This appears before the skill list and explains how to use skills
 */
function buildInstructions(): string {
  return `<skills_instructions>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke skills using this tool with the skill name only (no arguments)
- When you invoke a skill, you will see <command-message>The "{name}" skill is loading</command-message>
- The skill's prompt will expand and provide detailed instructions on how to complete the task
- Examples:
  - \`command: "pdf"\` - invoke the pdf skill
  - \`command: "xlsx"\` - invoke the xlsx skill
  - \`command: "plugin-name:skill-name"\` - invoke using fully qualified name

Important:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already running
- Do not use this tool for built-in CLI commands (like /help, /clear, etc.)
</skills_instructions>

`;
}

/**
 * Format a single skill entry for the description
 * Format: "{name}": {description}
 */
function formatSkillEntry(entry: SkillEntry): string {
  let line = `"${entry.name}": ${entry.description}`;
  
  // Add metadata if present
  const metadata: string[] = [];
  if (entry.version) metadata.push(`v${entry.version}`);
  if (entry.license) metadata.push(entry.license);
  
  if (metadata.length > 0) {
    line += ` (${metadata.join(', ')})`;
  }
  
  return line + '\n';
}

/**
 * Get a one-line compact description of available skills
 * Used for compact output modes
 */
export function buildCompactDescription(options?: { includeHidden?: boolean; includeDisabled?: boolean }): string {
  const raw = findAllSkills().sort((a, b) => a.name.localeCompare(b.name));
  const names: string[] = [];
  
  for (const skill of raw) {
    const loc = findSkill(skill.name);
    if (!loc) continue;
    
    const content = readFileSync(loc.path, 'utf-8');
    const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);
    
    if (isPresentable(frontmatter, {
      includeHidden: options?.includeHidden,
      includeDisabled: options?.includeDisabled,
      requireDescription: true
    })) {
      names.push(skill.name);
    }
  }
  
  return `Skill tool: call by name to load instructions. Skills: ${names.join(', ')}`;
}
