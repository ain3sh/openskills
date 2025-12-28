import { readFileSync } from 'fs';
import { findAllSkills, findSkill } from '../skill/discovery.js';
import { parseFrontmatter } from '../skill/frontmatter.js';
import type { SkillFrontmatter } from '../types.js';
import { isPresentable } from '../skill/presentability.js';

// Security constants to prevent ReDoS (Regular Expression Denial of Service)
const MAX_TOKEN_LENGTH = 64; // Max characters per search token
const MAX_MATCHES = 100; // Max occurrences to count per token

interface SuggestOptions { format?: string; limit?: number; all?: boolean }

export function suggestSkills(query: string, options: SuggestOptions = {}): void {
  const skills = findAllSkills();
  const limit = options.limit ?? 5;
  const format = (options.format ?? 'json').toLowerCase();
  const scored = skills.map((s) => {
    const loc = findSkill(s.name);
    const content = loc ? readFileSync(loc.path, 'utf-8') : '';
    const { frontmatter } = parseFrontmatter<SkillFrontmatter>(content);
    if (!options.all && !isPresentable(frontmatter, { requireDescription: true })) {
      return null;
    }
    const aliases = toArray((frontmatter as any)?.aliases);
    const keywords = toArray((frontmatter as any)?.keywords);
    const text = [s.name, s.description, ...aliases, ...keywords].filter(Boolean).join('\n');
    const score = simpleScore(query, text);
    const reasons = topMatches(query, text, ['name', 'description', 'aliases', 'keywords']);
    return { name: s.name, description: s.description, score, reasons, aliases, keywords };
  })
  .filter((r): r is { name: string; description: string; score: number; reasons: string[]; aliases: string[]; keywords: string[] } => !!r && r.score > 0)
  .sort((a, b) => (b.score - a.score))
  .slice(0, limit);

  if (format === 'text') {
    if (scored.length === 0) {
      console.log('No relevant skills found.');
      return;
    }
    for (const r of scored) {
      console.log(`${r.name}  (score: ${r.score.toFixed(2)})`);
      console.log(`  ${r.reasons.join('; ')}`);
    }
    return;
  }

  console.log(JSON.stringify(scored, null, 2));
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
    const count = countBoundedOccurrences(t, tok);
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

function isWordCharCode(cp: number): boolean {
  // [a-z0-9_]
  return (cp >= 48 && cp <= 57) || (cp >= 97 && cp <= 122) || cp === 95;
}

/**
 * Count word-boundary-aware occurrences of a token in text
 * 
 * Security: Bounded to prevent ReDoS attacks
 * - Token length capped at MAX_TOKEN_LENGTH (64 chars)
 * - Match count capped at MAX_MATCHES (100)
 * - Uses string.indexOf() instead of regex for O(n) performance
 * 
 * Attack vector prevented: Long tokens (>1000 chars) with repeated patterns
 */
function countBoundedOccurrences(text: string, token: string): number {
  if (!token) return 0;
  if (token.length > MAX_TOKEN_LENGTH) return 0; // Prevent long token attacks
  const m = token.length;
  if (m === 0) return 0; // Defensive: ensures forward progress
  let count = 0;
  let idx = 0;
  const n = text.length;
  while (count < MAX_MATCHES) { // Prevent infinite loop attacks
    idx = text.indexOf(token, idx);
    if (idx === -1) break;
    const leftOk = idx === 0 || !isWordCharCode(text.charCodeAt(idx - 1));
    const rightIdx = idx + m;
    const rightOk = rightIdx >= n || !isWordCharCode(text.charCodeAt(rightIdx));
    if (leftOk && rightOk) count++;
    // Use Math.max for clarity (ensures forward progress even if m becomes 0 somehow)
    idx = idx + Math.max(m, 1);
  }
  return count;
}

function toArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}
