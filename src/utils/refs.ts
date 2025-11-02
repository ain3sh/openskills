export function extractRelativeRefs(mdBody: string): string[] {
  const candidates = new Set<string>();
  const re = /(?:\b|\(|\s)((?:references|scripts|assets)\/[\w./-]+)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mdBody)) !== null) candidates.add(m[1]);
  return Array.from(candidates);
}
