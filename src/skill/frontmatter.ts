import YAML from 'yaml';

/**
 * Validate SKILL.md has YAML frontmatter starting with ---
 */
export function hasValidFrontmatter(content: string): boolean {
  return content.trimStart().startsWith('---');
}

/**
 * Parse YAML frontmatter and return { frontmatter, body }
 */
export function parseFrontmatter<T = Record<string, unknown>>(
  content: string
): { frontmatter: T; body: string } {
  const trimmed = content ?? '';
  if (!hasValidFrontmatter(trimmed)) {
    return { frontmatter: {} as T, body: trimmed };
  }

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
 * Extract a single field from frontmatter
 */
export function extractYamlField(content: string, field: string): string {
  const { frontmatter } = parseFrontmatter<Record<string, unknown>>(content);
  const value = (frontmatter as any)?.[field];
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Allowed frontmatter keys per official Claude Code Skills spec
 * @see https://code.claude.com/docs/en/skills.md
 */
const ALLOWED_KEYS = new Set([
  'name', 'description',
  'allowed-tools', 'model',
  'version', 'license', 'author', 'created-at', 'updated-at',
  'aliases', 'keywords', 'tags',
  'enabled', 'hidden', 'unlisted',
  'context', 'additional-context', 'notes'
]);

export type LintResult = { unknownKeys: string[]; typeErrors: string[] };

/**
 * Lint frontmatter for unknown keys and type errors
 */
export function lintFrontmatter(fm: Record<string, any> | undefined): LintResult {
  const res: LintResult = { unknownKeys: [], typeErrors: [] };
  if (!fm || typeof fm !== 'object') return res;

  for (const key of Object.keys(fm)) {
    if (!ALLOWED_KEYS.has(key)) res.unknownKeys.push(key);
  }

  if (fm.description != null && typeof fm.description !== 'string') res.typeErrors.push('description must be string');
  if (fm['allowed-tools'] != null && !isStrOrStrArr(fm['allowed-tools'])) res.typeErrors.push('allowed-tools must be string or string[]');
  if (fm['enabled'] != null && typeof fm['enabled'] !== 'boolean') res.typeErrors.push('enabled must be boolean');
  if (fm['hidden'] != null && typeof fm['hidden'] !== 'boolean') res.typeErrors.push('hidden must be boolean');
  if (fm['unlisted'] != null && typeof fm['unlisted'] !== 'boolean') res.typeErrors.push('unlisted must be boolean');
  if (fm['aliases'] != null && !isStrOrStrArr(fm['aliases'])) res.typeErrors.push('aliases must be string or string[]');
  if (fm['keywords'] != null && !isStrOrStrArr(fm['keywords'])) res.typeErrors.push('keywords must be string or string[]');

  return res;
}

function isStrOrStrArr(v: any): boolean {
  if (typeof v === 'string') return true;
  if (Array.isArray(v)) return v.every((x) => typeof x === 'string');
  return false;
}
