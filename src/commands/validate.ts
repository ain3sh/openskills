import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { findAllSkills, findSkill } from '../utils/skills.js';
import { parseFrontmatter } from '../utils/yaml.js';
import { extractRelativeRefs } from '../utils/refs.js';

interface ValidateOptions { all?: boolean; format?: string }

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

  const reports = skills.map((name) => validateOne(name));

  if ((opts.format || '').toLowerCase() === 'json') {
    console.log(JSON.stringify(reports, null, 2));
    const ok = reports.every((r) => r.missing.length === 0);
    process.exit(ok ? 0 : 2);
  }

  // Text output
  let failures = 0;
  for (const r of reports) {
    console.log(chalk.bold(`\n${r.name}`));
    console.log(chalk.dim(`Base: ${r.baseDir}`));
    if (r.missing.length === 0) {
      console.log(chalk.green('  ✅ All referenced resources exist'));
    } else {
      failures += r.missing.length;
      console.log(chalk.red(`  ❌ Missing ${r.missing.length} resource(s):`));
      for (const m of r.missing) console.log(`    - ${m.path}`);
    }
  }
  process.exit(failures === 0 ? 0 : 2);
}

function validateOne(name: string) {
  const loc = findSkill(name);
  if (!loc) {
    return { name, baseDir: '', missing: [{ path: '(skill not found)', exists: false }], references: [] as string[] };
  }
  const content = readFileSync(loc.path, 'utf-8');
  const { body } = parseFrontmatter(content);

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
  return { name, baseDir: loc.baseDir, missing: [...missing, ...scriptIssues], references: refs };
}

