import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { findAllSkills, findSkill } from '../utils/skills.js';
import { parseFrontmatter } from '../utils/yaml.js';

/**
 * Describe installed skills in machine-readable format
 * Usage:
 *   openskills describe                # all skills (JSON)
 *   openskills describe <name>         # specific skill (JSON)
 */
export function describeSkills(skillName?: string): void {
  if (skillName) {
    const loc = findSkill(skillName);
    if (!loc) {
      console.error(JSON.stringify({ error: `Skill '${skillName}' not found` }));
      process.exit(1);
    }
    const content = readFileSync(loc.path, 'utf-8');
    const { frontmatter } = parseFrontmatter<Record<string, any>>(content);
    const fm = normalizeFrontmatter(frontmatter);
    console.log(JSON.stringify({
      name: fm.name || skillName,
      description: fm.description || '',
      baseDir: loc.baseDir,
      frontmatter: fm,
      path: loc.path,
      location: loc.source,
    }, null, 2));
    return;
  }

  const skills = findAllSkills();
  const out = skills.map((s) => {
    const loc = findSkill(s.name);
    let fm: any = {};
    if (loc && existsSync(loc.path)) {
      const content = readFileSync(loc.path, 'utf-8');
      const parsed = parseFrontmatter<Record<string, any>>(content).frontmatter;
      fm = normalizeFrontmatter(parsed);
    }
    return {
      name: s.name,
      description: fm.description || s.description,
      baseDir: loc?.baseDir,
      frontmatter: fm,
      location: s.location,
      path: loc?.path,
    };
  });

  console.log(JSON.stringify(out, null, 2));
}

function normalizeFrontmatter(fm: Record<string, any>): Record<string, any> {
  if (!fm) return {};
  const allowed = fm['allowed-tools'] ?? fm.allowed_tools;
  const disableInv = fm['disable-model-invocation'] ?? fm.disable_model_invocation;
  const normalized: Record<string, any> = { ...fm };
  if (allowed != null) normalized.allowed_tools = Array.isArray(allowed) ? allowed : [String(allowed)];
  if (disableInv != null) normalized.disable_model_invocation = Boolean(disableInv);
  return normalized;
}
