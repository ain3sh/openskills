import type { SkillFrontmatter } from '../types.js';

export interface PresentabilityOptions {
  includeHidden?: boolean;
  includeUnlisted?: boolean;
  includeDisabled?: boolean;
  requireDescription?: boolean;
}

export function isPresentable(fm: Partial<SkillFrontmatter> | undefined, opts: PresentabilityOptions = {}): boolean {
  const enabled = fm?.enabled ?? true;
  const hidden = fm?.hidden ?? false;
  const unlisted = fm?.unlisted ?? false;
  if (!enabled && !opts.includeDisabled) return false;
  if (hidden && !opts.includeHidden) return false;
  if (unlisted && !opts.includeUnlisted) return false;

  if (opts.requireDescription) {
    const hasDesc = typeof fm?.description === 'string' && fm.description.trim().length > 0;
    if (!hasDesc) return false;
  }
  return true;
}
