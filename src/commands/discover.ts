import { buildSkillToolDescription } from '../agent/tool-description.js';
import type { SkillToolDescriptionPayload } from '../agent/tool-description.js';
import { findAllSkills, findSkill } from '../skill/discovery.js';
import { readFileSync } from 'fs';
import { parseFrontmatter } from '../skill/frontmatter.js';
import type { SkillFrontmatter } from '../types.js';
import { isPresentable } from '../skill/presentability.js';

export interface DiscoverOptions {
  format?: 'text' | 'xml' | 'json';
  maxChars?: number;
  includeHidden?: boolean;
  includeDisabled?: boolean;
  all?: boolean;
}

/**
 * Generate progressive disclosure block for skills
 * 
 * Outputs skill list in various formats optimized for different use cases:
 * - text: Human-readable bullet list (optimized for slash command injection)
 * - xml: Raw <available_skills> XML (for tools expecting structured format)
 * - json: Full structured payload (for programmatic usage)
 * 
 * This enables progressive disclosure: agents see skill list first via /discover,
 * then invoke specific skills via /skill-name when needed.
 */
export function discover(options: DiscoverOptions = {}): void {
  const format = options.format || 'text';
  
  // Reuse existing builder with token budget limiting
  const payload = buildSkillToolDescription({
    maxChars: options.maxChars,
    includeHidden: options.includeHidden,
    includeDisabled: options.includeDisabled,
    all: options.all,
  });
  
  switch (format) {
    case 'text':
      console.log(formatAsText(payload, options));
      break;
    case 'xml':
      console.log(payload.availableSkillsXml);
      break;
    case 'json':
      console.log(JSON.stringify(payload, null, 2));
      break;
    default:
      console.error(`Unknown format: ${format}`);
      process.exit(1);
  }
}

/**
 * Convert XML skill list to human-readable text format
 * 
 * Output format:
 * ```
 * Skills provide specialized capabilities for specific tasks.
 * 
 * Available skills:
 * - pdf: Extract text from PDF documents
 * - xlsx: Process spreadsheet data
 * 
 * Mode commands (change interaction mode):
 * - vision: Analyze images and visual content
 * 
 * To use a skill, type: /skill-name
 * ```
 */
function formatAsText(payload: SkillToolDescriptionPayload, options: DiscoverOptions): string {
  const lines: string[] = [];
  
  // Header
  lines.push('Skills provide specialized capabilities for specific tasks.\n');
  
  // Parse skills from XML
  const { modeSkills, regularSkills } = parseSkillsFromXml(payload.availableSkillsXml, options);
  
  // Regular skills section
  if (regularSkills.length > 0) {
    lines.push('Available skills:');
    for (const skill of regularSkills) {
      lines.push(`- ${skill.name}: ${skill.description}`);
    }
    lines.push('');
  }
  
  // Mode commands section
  if (modeSkills.length > 0) {
    lines.push('Mode commands (change interaction mode):');
    for (const skill of modeSkills) {
      lines.push(`- ${skill.name}: ${skill.description}`);
    }
    lines.push('');
  }
  
  // Usage hint
  lines.push('To use a skill, type: /skill-name');
  
  // Truncation warning
  if (payload.truncated) {
    lines.push('\n(More skills available - list truncated to fit token budget)');
  }
  
  return lines.join('\n');
}

interface ParsedSkill {
  name: string;
  description: string;
}

/**
 * Parse skills from XML and separate mode commands from regular skills
 */
function parseSkillsFromXml(xml: string, options: DiscoverOptions): {
  modeSkills: ParsedSkill[];
  regularSkills: ParsedSkill[];
} {
  const modeSkills: ParsedSkill[] = [];
  const regularSkills: ParsedSkill[] = [];
  
  // Check if we're inside mode_commands section
  const modeCommandsMatch = xml.match(/<mode_commands>([\s\S]*?)<\/mode_commands>/);
  const modeSection = modeCommandsMatch ? modeCommandsMatch[1] : '';
  
  // Get all skills (mode commands are repeated outside the mode_commands section too)
  const allSkills = findAllSkills();
  
  for (const skill of allSkills) {
    const loc = findSkill(skill.name);
    if (!loc) continue;
    
    const content = readFileSync(loc.path, 'utf-8');
    const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);
    
    // Filter by presentability
    if (!options.all && !isPresentable(frontmatter, {
      includeHidden: options.includeHidden,
      includeDisabled: options.includeDisabled,
      requireDescription: true
    })) {
      continue;
    }
    
    const description = frontmatter?.description || skill.description;
    const pluginName = skill.source === 'plugin' ? (skill.sourceLabel?.replace(/^plugin:/, '') || '') : '';
    const displayName = pluginName ? `${pluginName}:${skill.name}` : skill.name;
    
    // Check if skill line appears in XML (to respect token budget truncation)
    const skillPattern = new RegExp(`"${displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
    if (!skillPattern.test(xml)) {
      continue; // Skill was truncated
    }
    
    const isMode = Boolean(frontmatter?.mode);
    
    if (isMode) {
      modeSkills.push({ name: displayName, description });
    } else {
      regularSkills.push({ name: displayName, description });
    }
  }
  
  return { modeSkills, regularSkills };
}
