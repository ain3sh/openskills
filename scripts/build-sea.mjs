#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

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
  });
}

main().catch((err) => { console.error(err); process.exit(1); });
