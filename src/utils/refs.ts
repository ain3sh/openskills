// Security constants to prevent ReDoS (Regular Expression Denial of Service)
const MAX_PATH_SEGMENT_LENGTH = 100; // Max characters per path segment
const MAX_PATH_DEPTH = 10; // Max nested directory levels

/**
 * Extract relative references to bundled resources from skill markdown
 * 
 * Security: Regex is bounded to prevent catastrophic backtracking (ReDoS)
 * - Path segments limited to 100 chars each
 * - Path depth limited to 10 levels
 * - Total worst case: O(n) linear time, not exponential
 * 
 * Attack vector prevented: Long nested paths like "scripts/" + "a/".repeat(1000)
 */
export function extractRelativeRefs(mdBody: string): string[] {
  const candidates = new Set<string>();
  // Bounded quantifiers prevent exponential backtracking on malicious input
  const re = /(?:\b|\(|\s)((?:references|scripts|assets)\/[\w.-]{1,100}(?:\/[\w.-]{1,100}){0,10})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mdBody)) !== null) candidates.add(m[1]);
  return Array.from(candidates);
}
