import type { Skill } from '../types.js';

/**
 * Detect if AGENTS.md uses transclusion pattern
 * Supports multiple patterns:
 * - @.agent/SKILLS.md (preferred)
 * - @SKILLS.md (legacy)
 * - @include: .agent/SKILLS.md
 * - <!-- @include: .agent/SKILLS.md -->
 */
export function detectTransclusionPattern(content: string): string | null {
  // Check for new .agent/SKILLS.md patterns first (preferred)
  const newHtmlCommentMatch = content.match(/<!--\s*@include:\s*\.agent\/SKILLS\.md\s*-->/);
  if (newHtmlCommentMatch) {
    return newHtmlCommentMatch[0];
  }

  // Check for VuePress style with .agent/
  if (content.includes('@include: .agent/SKILLS.md')) {
    return '@include: .agent/SKILLS.md';
  }

  // Check for simple @.agent/SKILLS.md pattern
  if (content.includes('@.agent/SKILLS.md')) {
    return '@.agent/SKILLS.md';
  }

  // Legacy support: Check for old root-level SKILLS.md patterns
  const htmlCommentMatch = content.match(/<!--\s*@include:\s*SKILLS\.md\s*-->/);
  if (htmlCommentMatch) {
    return htmlCommentMatch[0];
  }

  if (content.includes('@include: SKILLS.md')) {
    return '@include: SKILLS.md';
  }

  if (content.includes('@SKILLS.md')) {
    return '@SKILLS.md';
  }

  // Check for any variation with different casing
  const patterns = [
    /@\.agent\/skills\.md/i,
    /@include:\s*\.agent\/skills\.md/i,
    /<!--\s*@include:\s*\.agent\/skills\.md\s*-->/i,
    /@skills\.md/i,
    /@include:\s*skills\.md/i,
    /<!--\s*@include:\s*skills\.md\s*-->/i
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}

/**
 * Append transclusion reference to AGENTS.md
 */
export function appendTransclusionReference(content: string, pattern: string = '@.agent/SKILLS.md'): string {
  // Remove any existing skills section first
  let updated = content;
  
  // Remove direct injection if it exists
  if (content.includes('<skills_system') || content.includes('<!-- SKILLS_TABLE_START -->')) {
    updated = removeSkillsSection(content);
  }
  
  // Append transclusion pattern at the end
  const trimmed = updated.trimEnd();
  const separator = '\n\n---\n\n## Skills\n\n';
  
  return `${trimmed}${separator}${pattern}\n`;
}

/**
 * Parse skill names currently in AGENTS.md
 */
export function parseCurrentSkills(content: string): string[] {
  const skillNames: string[] = [];

  // Match <skill><name>skill-name</name>...</skill>
  const skillRegex = /<skill>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/skill>/g;

  let match;
  while ((match = skillRegex.exec(content)) !== null) {
    skillNames.push(match[1].trim());
  }

  return skillNames;
}

/**
 * Generate skills XML section for AGENTS.md with progressive disclosure
 * 
 * BLOG REFERENCE: "The system loads only the minimal metadata (skill names 
 * and descriptions from frontmatter) into Claude's initial context"
 * 
 * Level 1 Progressive Disclosure:
 * - Only name and description
 * - No paths, no execution instructions
 * - Execution details come AFTER skill selection via openskills invoke
 */
export function generateSkillsXml(skills: Skill[]): string {
  // Format skills as simple "name": description pairs (blog format)
  const skillEntries = skills
    .map((s) => {
      return `"${s.name}": ${s.description || 'No description'}`;
    })
    .join('\n');

  return `<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<available_skills>
${skillEntries}
</available_skills>

<usage>
When a skill is needed, get execution details:
openskills invoke <skill-name> --format=execution
</usage>
<!-- SKILLS_TABLE_END -->

</skills_system>`;
}

/**
 * Replace or add skills section in AGENTS.md
 */
export function replaceSkillsSection(content: string, newSection: string): string {
  const startMarker = '<skills_system';
  const endMarker = '</skills_system>';

  // Check for XML markers
  if (content.includes(startMarker)) {
    const regex = /<skills_system[^>]*>[\s\S]*?<\/skills_system>/;
    return content.replace(regex, newSection);
  }

  // Fallback to HTML comments
  const htmlStartMarker = '<!-- SKILLS_TABLE_START -->';
  const htmlEndMarker = '<!-- SKILLS_TABLE_END -->';

  if (content.includes(htmlStartMarker)) {
    // Extract content without outer XML wrapper
    const innerContent = newSection.replace(/<skills_system[^>]*>|<\/skills_system>/g, '');
    const regex = new RegExp(
      `${htmlStartMarker}[\\s\\S]*?${htmlEndMarker}`,
      'g'
    );
    return content.replace(regex, `${htmlStartMarker}\n${innerContent}\n${htmlEndMarker}`);
  }

  // No markers found - append to end of file
  return content.trimEnd() + '\n\n' + newSection + '\n';
}

/**
 * Remove skills section from AGENTS.md
 */
export function removeSkillsSection(content: string): string {
  const startMarker = '<skills_system';
  const endMarker = '</skills_system>';

  // Check for XML markers
  if (content.includes(startMarker)) {
    const regex = /<skills_system[^>]*>[\s\S]*?<\/skills_system>/;
    return content.replace(regex, '<!-- Skills section removed -->');
  }

  // Fallback to HTML comments - remove the entire section including markers
  const htmlStartMarker = '<!-- SKILLS_TABLE_START -->';
  const htmlEndMarker = '<!-- SKILLS_TABLE_END -->';

  if (content.includes(htmlStartMarker)) {
    const regex = new RegExp(
      `${htmlStartMarker}[\\s\\S]*?${htmlEndMarker}`,
      'g'
    );
    // Remove the entire section including markers
    return content.replace(regex, '<!-- Skills section removed -->');
  }

  // No markers found - nothing to remove
  return content;
}
