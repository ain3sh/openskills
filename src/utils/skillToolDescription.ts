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
  displayName: string; // May be plugin-qualified (plugin:skill)
  description: string;
  whenToUse?: string;
  isMode: boolean;
  version?: string;
  license?: string;
}

export interface SkillToolDescriptionPayload {
  instructions: string;
  availableSkillsXml: string;
  detailed: string;
  truncated: boolean;
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
): SkillToolDescriptionPayload {
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
    
    // Compute display name: prefix with plugin name when sourced from plugin
    const pluginName = skill.source === 'plugin' ? (skill.sourceLabel?.replace(/^plugin:/, '') || '') : '';
    const displayName = pluginName ? `${pluginName}:${skill.name}` : skill.name;
    const whenToUse = (frontmatter as any)?.when_to_use ?? (frontmatter as any)?.['when-to-use'];

    entries.push({
      name: skill.name,
      displayName,
      description: frontmatter?.description || skill.description,
      whenToUse: typeof whenToUse === 'string' ? whenToUse : undefined,
      isMode: Boolean(frontmatter?.mode),
      version: frontmatter?.version,
      license: frontmatter?.license,
    });
  }
  
  // Separate mode commands from regular commands
  const modeCommands = entries.filter(e => e.isMode);
  const regularCommands = entries.filter(e => !e.isMode);
  
  // Build description with XML structure and progressive truncation
  let instructions = buildInstructions();
  const closingTag = '</available_skills>';
  const truncationNote = '<!-- truncated: more skills available -->\n';

  // Calculate baseline length and fallback when instructions exceed budget
  const initialLength = instructions.length + '<available_skills>\n'.length + closingTag.length;
  if (initialLength > maxChars) {
    instructions = '<skills_instructions>Skills available. Invoke with command name.</skills_instructions>\n\n';
  }

  let skillsXml = '<available_skills>\n';
  let currentLength = instructions.length + skillsXml.length;
  let truncated = false;

  const hasSpace = (additional: number) => currentLength + additional + closingTag.length <= maxChars;

  const append = (text: string) => {
    skillsXml += text;
    currentLength += text.length;
  };

  // Mode commands first
  if (modeCommands.length > 0) {
    const modeHeader = '<mode_commands>\n';
    const modeFooter = '</mode_commands>\n\n';
    const headerSpace = modeHeader.length + modeFooter.length;
    if (hasSpace(headerSpace)) {
      append(modeHeader);
      for (const entry of modeCommands) {
        const formatted = formatSkillEntry(entry);
        const neededSpace = formatted.length + modeFooter.length + truncationNote.length;
        if (!hasSpace(neededSpace)) {
          append(truncationNote);
          truncated = true;
          break;
        }
        append(formatted);
      }
      append(modeFooter);
    }
  }

  for (const entry of regularCommands) {
    const formatted = formatSkillEntry(entry);
    const neededSpace = formatted.length + truncationNote.length;
    if (!hasSpace(neededSpace)) {
      append(truncationNote);
      truncated = true;
      break;
    }
    append(formatted);
  }

  // Ensure closing tag fits (should be guaranteed by hasSpace checks)
  if (!hasSpace(0)) {
    truncated = true;
  }
  skillsXml += closingTag;

  return {
    instructions,
    availableSkillsXml: skillsXml,
    detailed: instructions + skillsXml,
    truncated,
  };
}

/**
 * Build the skill instructions section
 * This appears before the skill list and explains how to use skills
 * 
 * BLOG REFERENCE: Keep this minimal per progressive disclosure.
 * The blog just shows skills as "name": description with minimal instructions.
 */
function buildInstructions(): string {
  return `<skills_instructions>
Invoke skills by name when they match the user's task.
</skills_instructions>

`;
}

/**
 * Format a single skill entry for the description
 * Format: "{name}": {description}
 */
function formatSkillEntry(entry: SkillEntry): string {
  // Append when_to_use guidance when present per blog behavior
  const desc = entry.whenToUse ? `${entry.description} - ${entry.whenToUse}` : entry.description;
  return `"${entry.displayName}": ${desc}\n`;
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
      const pluginName = skill.source === 'plugin' ? (skill.sourceLabel?.replace(/^plugin:/, '') || '') : '';
      const display = pluginName ? `${pluginName}:${skill.name}` : skill.name;
      names.push(display);
    }
  }
  
  return `Skill tool: call by name to load instructions. Skills: ${names.join(', ')}`;
}
