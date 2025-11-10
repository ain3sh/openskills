import { findAllSkills, findSkill } from '../utils/skills.js';
import { readFileSync } from 'fs';
import { parseFrontmatter } from '../utils/yaml.js';
import type { SkillFrontmatter } from '../types.js';
import { isPresentable } from '../utils/presentability.js';
import { telemetry } from '../utils/telemetry.js';
import { buildSkillToolDescription } from '../utils/skillToolDescription.js';

interface ListOptions {
  all?: boolean;
  includeHidden?: boolean;
  includeDisabled?: boolean;
}

interface SkillSummary {
  name: string;
  description: string;
  location: 'project' | 'global';
  baseDir?: string;
  source?: string;
  sourceLabel?: string;
  allowedTools?: string[];
  model?: string;
  version?: string;
  license?: string;
  whenToUse?: string;
  mode?: string | boolean;
}

/**
 * List all installed skills
 */
export function listSkills(options?: ListOptions): void {
  const startTime = Date.now();
  
  try {
    listSkillsInternal(options);
    
    // Track success
    telemetry.log({
      command: 'list',
      success: true,
      duration: Date.now() - startTime
    });
  } catch (error) {
    // Track failure
    telemetry.log({
      command: 'list',
      success: false,
      duration: Date.now() - startTime
    });
    throw error;
  }
}

function listSkillsInternal(options?: ListOptions): void {
  const all = findAllSkills();
  const summaries: SkillSummary[] = [];

  for (const skill of all) {
    const loc = findSkill(skill.name);
    if (!loc) continue;
    const content = readFileSync(loc.path, 'utf-8');
    const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);
    if (!options?.all && !isPresentable(frontmatter, { includeHidden: options?.includeHidden, includeDisabled: options?.includeDisabled, requireDescription: true })) {
      continue;
    }
    const allowedField = frontmatter?.['allowed-tools'] ?? (frontmatter as any)?.allowed_tools;
    const allowedTools = allowedField ? normalizeToolsField(allowedField) : undefined;
    summaries.push({
      name: skill.name,
      description: frontmatter?.description || skill.description,
      location: skill.location,
      baseDir: loc.baseDir,
      source: skill.source,
      sourceLabel: skill.sourceLabel,
      allowedTools,
      model: typeof frontmatter?.model === 'string' ? frontmatter.model : undefined,
      version: frontmatter?.version,
      license: frontmatter?.license,
      whenToUse: (frontmatter as any)?.when_to_use ?? (frontmatter as any)?.['when-to-use'],
      mode: frontmatter?.mode,
    });
  }

  // Build tool description snapshot (instructions + XML)
  const description = buildSkillToolDescription({
    maxChars: undefined,
    includeHidden: options?.includeHidden,
    includeDisabled: options?.includeDisabled,
    all: options?.all,
  });

  const projectCount = summaries.filter((s) => s.location === 'project').length;
  const globalCount = summaries.filter((s) => s.location === 'global').length;

  const payload = {
    instructions: description.instructions,
    available_skills_xml: description.availableSkillsXml,
    truncated: description.truncated,
    skills: summaries,
    summary: {
      totalDiscovered: all.length,
      totalReturned: summaries.length,
      project: projectCount,
      global: globalCount,
    },
  };

  console.log(JSON.stringify(payload, null, 2));
}

function normalizeToolsField(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.map((v) => String(v));
  const str = String(value).trim();
  if (!str) return undefined;
  return str.split(',').map((s) => s.trim()).filter(Boolean);
}
