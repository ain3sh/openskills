import YAML from 'yaml';

/**
 * Validate SKILL.md has YAML frontmatter starting with ---
 */
export function hasValidFrontmatter(content: string): boolean {
  return content.trimStart().startsWith('---');
}

/**
 * Parse YAML frontmatter and return { frontmatter, body }
 * - Tolerates files that start with --- and end the frontmatter at the next --- line
 * - Returns {} for frontmatter if missing or invalid
 */
export function parseFrontmatter<T = Record<string, unknown>>(
  content: string
): { frontmatter: T; body: string } {
  const trimmed = content ?? '';
  if (!hasValidFrontmatter(trimmed)) {
    return { frontmatter: {} as T, body: trimmed };
  }

  // Find the closing --- that terminates frontmatter
  const lines = trimmed.split(/\r?\n/);
  if (lines[0].trim() !== '---') {
    return { frontmatter: {} as T, body: trimmed };
  }

  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIdx = i;
      break;
    }
  }

  if (endIdx === -1) {
    // No closing marker; treat as no frontmatter
    return { frontmatter: {} as T, body: trimmed };
  }

  const yamlText = lines.slice(1, endIdx).join('\n');
  const body = lines.slice(endIdx + 1).join('\n');
  let parsed: any = {};
  try {
    parsed = YAML.parse(yamlText) ?? {};
  } catch {
    parsed = {};
  }
  return { frontmatter: parsed as T, body };
}

/**
 * Legacy helper retained for backward compatibility.
 * Extracts a single field from frontmatter (first line value only if scalar).
 */
export function extractYamlField(content: string, field: string): string {
  const { frontmatter } = parseFrontmatter<Record<string, unknown>>(content);
  const value = (frontmatter as any)?.[field];
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  // For non-string values, return JSON stringified preview
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
