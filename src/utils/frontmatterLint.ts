type LintResult = { unknownKeys: string[]; typeErrors: string[] };

const allowedKeys = new Set([
  'name', 'description', 'when_to_use',
  'allowed-tools', 'allowed_tools', 'deny-tools', 'deny_tools',
  'version', 'license', 'model', 'disable-model-invocation', 'disable_model_invocation',
  'mode', 'reasoning-effort', 'reasoning_effort', 'tokens', 'aliases', 'keywords',
  'enabled', 'hidden', 'unlisted'
]);

export function lintFrontmatter(fm: Record<string, any> | undefined): LintResult {
  const res: LintResult = { unknownKeys: [], typeErrors: [] };
  if (!fm || typeof fm !== 'object') return res;

  for (const key of Object.keys(fm)) {
    if (!allowedKeys.has(key)) res.unknownKeys.push(key);
  }

  // Basic type checks (best-effort)
  if (fm.description != null && typeof fm.description !== 'string') res.typeErrors.push('description must be string');
  if (fm['when_to_use'] != null && typeof fm['when_to_use'] !== 'string') res.typeErrors.push('when_to_use must be string');
  if (fm['allowed-tools'] != null && !isStrOrStrArr(fm['allowed-tools'])) res.typeErrors.push('allowed-tools must be string or string[]');
  if (fm['allowed_tools'] != null && !isStrOrStrArr(fm['allowed_tools'])) res.typeErrors.push('allowed_tools must be string or string[]');
  if (fm['disable-model-invocation'] != null && typeof fm['disable-model-invocation'] !== 'boolean') res.typeErrors.push('disable-model-invocation must be boolean');
  if (fm['disable_model_invocation'] != null && typeof fm['disable_model_invocation'] !== 'boolean') res.typeErrors.push('disable_model_invocation must be boolean');
  if (fm['enabled'] != null && typeof fm['enabled'] !== 'boolean') res.typeErrors.push('enabled must be boolean');
  if (fm['hidden'] != null && typeof fm['hidden'] !== 'boolean') res.typeErrors.push('hidden must be boolean');
  if (fm['unlisted'] != null && typeof fm['unlisted'] !== 'boolean') res.typeErrors.push('unlisted must be boolean');
  if (fm['aliases'] != null && !isStrOrStrArr(fm['aliases'])) res.typeErrors.push('aliases must be string or string[]');
  if (fm['keywords'] != null && !isStrOrStrArr(fm['keywords'])) res.typeErrors.push('keywords must be string or string[]');

  return res;
}

function isStrOrStrArr(v: any): boolean {
  if (typeof v === 'string') return true;
  if (Array.isArray(v)) return v.every((x) => typeof x === 'string');
  return false;
}
