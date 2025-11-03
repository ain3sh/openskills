import { readFileSync } from 'fs';
import { findAllSkills, findSkill } from '../utils/skills.js';
import { parseFrontmatter } from '../utils/yaml.js';
import type { SkillFrontmatter } from '../types.js';
import { isPresentable } from '../utils/presentability.js';

interface SuggestOptions { format?: string; limit?: number; all?: boolean }

export function suggestSkills(query: string, options: SuggestOptions = {}): void {
  const skills = findAllSkills();
  const limit = options.limit ?? 5;
  const scored = skills.map((s) => {
    const loc = findSkill(s.name);
    const content = loc ? readFileSync(loc.path, 'utf-8') : '';
    const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);
    if (!options.all && !isPresentable(frontmatter, { requireDescription: true })) {
      return null;
    }
    const aliases = toArray((frontmatter as any)?.aliases);
    const keywords = toArray((frontmatter as any)?.keywords);
    const text = [s.name, s.description, frontmatter?.when_to_use, ...aliases, ...keywords].filter(Boolean).join('\n');
    const score = simpleScore(query, text);
    const reasons = topMatches(query, text, ['name', 'description', 'when_to_use','aliases','keywords']);
    return { name: s.name, description: s.description, score, reasons, aliases, keywords };
  })
  .filter((r): r is { name: string; description: string; score: number; reasons: string[]; aliases: string[]; keywords: string[] } => !!r && r.score > 0)
  .sort((a, b) => (b.score - a.score))
  .slice(0, limit);

  if ((options.format || '').toLowerCase() === 'json') {
    console.log(JSON.stringify(scored, null, 2));
    return;
  }

  if (scored.length === 0) {
    console.log('No relevant skills found.');
    return;
  }
  for (const r of scored) {
    console.log(`${r.name}  (score: ${r.score.toFixed(2)})`);
    console.log(`  ${r.reasons.join('; ')}`);
  }
}

function simpleScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let score = 0;
  // boost for phrase match
  if (t.includes(q)) score += 3;
  // token overlap
  const qTokens = q.split(/\W+/).filter(Boolean);
  for (const tok of qTokens) {
    const escaped = escapeReg(tok);
    const count = (t.match(new RegExp(`(?:^|\\\W)${escaped}(?:$|\\\W)`, 'g')) || []).length;
    score += Math.min(count, 3) * 1.0;
  }
  return score;
}

function topMatches(query: string, text: string, fields: string[]): string[] {
  const phrases: string[] = [];
  const qTokens = query.toLowerCase().split(/\W+/).filter(Boolean);
  const t = text.toLowerCase();
  for (const tok of qTokens) {
    if (t.includes(tok)) phrases.push(`match:${tok}`);
  }
  return phrases.slice(0, 3);
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}
