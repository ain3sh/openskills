export function extractRelativeRefs(mdBody: string): string[] {
  const candidates = new Set<string>();
  // Bounded: segment length 1-100, up to 11 segments total (root + 10 nested)
  const re = /(?:\b|\(|\s)((?:references|scripts|assets)\/[\w.-]{1,100}(?:\/[\w.-]{1,100}){0,10})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mdBody)) !== null) candidates.add(m[1]);
  return Array.from(candidates);
}
