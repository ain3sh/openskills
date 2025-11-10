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
    external: [],
    logLevel: 'info',
    define: {
      '__VERSION__': JSON.stringify(pkg.version)
    },
  });
}

main().catch((err) => { console.error(err); process.exit(1); });
