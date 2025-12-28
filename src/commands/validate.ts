import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { findAllSkills, findSkill } from '../skill/discovery.js';
import { parseFrontmatter } from '../skill/frontmatter.js';
import { extractRelativeRefs } from '../skill/refs.js';

interface ValidateOptions { all?: boolean; lintFrontmatter?: boolean }

type Issue = { path: string; exists: boolean };

export function validateSkills(nameOrOptions?: string | ValidateOptions, maybeOptions?: ValidateOptions): void {
  const opts: ValidateOptions = (typeof nameOrOptions === 'object' ? nameOrOptions : maybeOptions) || {};
  const skillName = typeof nameOrOptions === 'string' ? nameOrOptions : undefined;

  const skills = opts.all
    ? findAllSkills().map((s) => s.name)
    : (skillName ? [skillName] : []);

  if (skills.length === 0) {
    console.error('Specify a skill name or use --all');
    process.exit(1);
  }

  const reports = skills.map((name) => validateOne(name, { lintFrontmatter: opts.lintFrontmatter }));

  const ok = reports.every((r) =>
    r.missing.length === 0 &&
    r.scriptIssues.length === 0 &&
    (!r.frontmatterLint || (r.frontmatterLint.unknownKeys.length === 0 && r.frontmatterLint.typeErrors.length === 0))
  );

  console.log(JSON.stringify({ ok, reports }, null, 2));
  process.exit(ok ? 0 : 2);
}

function validateOne(name: string, options?: { lintFrontmatter?: boolean }) {
  const loc = findSkill(name);
  if (!loc) {
    return { name, baseDir: '', missing: [{ path: '(skill not found)', exists: false }], scriptIssues: [] as Issue[], references: [] as string[] };
  }
  const content = readFileSync(loc.path, 'utf-8');
  const { body, frontmatter } = parseFrontmatter(content);

  const refs = extractRelativeRefs(body);
  const missing: Issue[] = [];
  for (const ref of refs) {
    const full = join(loc.baseDir, ref);
    if (!existsSync(full)) missing.push({ path: ref, exists: false });
  }
  // Script checks
  const scriptIssues: Issue[] = [];
  for (const ref of refs.filter((r) => r.startsWith('scripts/'))) {
    const full = join(loc.baseDir, ref);
    if (!existsSync(full)) continue;
    const text = readFileSync(full, 'utf-8');
    if (!text.startsWith('#!')) scriptIssues.push({ path: ref + ' (missing shebang)', exists: true });
    try {
      const st = statSync(full);
      const isExec = (st.mode & 0o111) !== 0;
      if (!isExec) scriptIssues.push({ path: ref + ' (not executable)', exists: true });
    } catch {}
  }
  const report: any = { name, baseDir: loc.baseDir, missing, scriptIssues, references: refs };
  if (options?.lintFrontmatter) {
    const { lintFrontmatter } = requireFrontmatterLint();
    report.frontmatterLint = lintFrontmatter(frontmatter as any);
  }
  return report;
}

/**
 * Dynamically require frontmatterLint module
 * 
 * Security: Proper error code checking prevents misleading error messages
 * - MODULE_NOT_FOUND: Module missing (expected in some builds)
 * - Other errors: Genuine load failures (syntax errors, etc.)
 */
function requireFrontmatterLint() {
  try {
    // dynamic import to avoid cost unless requested
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../utils/frontmatterLint.js');
    return mod;
  } catch (err: any) {
    const code = err?.code;
    const msg = String(err?.message || err);
    // Security: Distinguish MODULE_NOT_FOUND from other errors
    if (code === 'MODULE_NOT_FOUND') {
      throw new Error('frontmatter linting is not available - module not found');
    }
    console.error('Failed to load frontmatterLint:', msg);
    throw new Error(`Failed to load frontmatterLint: ${msg}`);
  }
}

