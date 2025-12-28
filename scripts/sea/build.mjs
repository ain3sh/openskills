#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdirSync, readFileSync } from 'node:fs';

// Read version from package.json at build time
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

async function main() {
  mkdirSync('dist/sea', { recursive: true });
  await build({
    entryPoints: ['src/cli.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    outfile: 'dist/sea/cli.cjs',
    sourcemap: false,
    legalComments: 'none',
    // Prefer ESM entrypoints when packages provide them.
    // This avoids UMD wrappers that hide `require()` behind function params,
    // which Node SEA can't resolve for bundled relative modules.
    mainFields: ['module', 'main'],
    external: [],
    logLevel: 'info',
    define: {
      '__VERSION__': JSON.stringify(pkg.version)
    },
  });

  // SEA runtime guardrails:
  // - SEA's injected require() can only load built-in modules
  // - UMD wrappers can hide require() from esbuild and leak runtime relative requires
  const outPath = 'dist/sea/cli.cjs';
  const bundled = readFileSync(outPath, 'utf-8');

  const forbiddenSubstrings = [
    // Common UMD wrapper signature (e.g. jsonc-parser's UMD build)
    'factory(require, exports)',
  ];

  for (const s of forbiddenSubstrings) {
    if (bundled.includes(s)) {
      console.error(`SEA build guard failed: found forbidden substring in ${outPath}: ${s}`);
      process.exit(1);
    }
  }

  const forbiddenPatterns = [
    // Relative requires from within the bundle will hit SEA's embedder require and crash.
    /\brequire\((['"])\.\//,
    // Dynamic import() is documented as incompatible with useCodeCache=true in SEA.
    /\bimport\(\s*['"]/,
  ];

  for (const re of forbiddenPatterns) {
    if (re.test(bundled)) {
      console.error(`SEA build guard failed: found forbidden pattern in ${outPath}: ${re}`);
      process.exit(1);
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
