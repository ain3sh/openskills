#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
import { platform, arch } from 'node:os';

function sh(cmd) { execSync(cmd, { stdio: 'inherit' }); }

function run() {
  mkdirSync('dist/sea', { recursive: true });
  const plt = process.platform; // 'linux' | 'darwin' | 'win32'
  const nodePath = process.execPath;
  const outBase = `dist/sea/openskills`;
  const blob = 'dist/sea/openskills.blob';

  // Generate SEA blob
  sh('node --experimental-sea-config sea-config.json');

  if (plt === 'win32') {
    copyFileSync(nodePath, `${outBase}.exe`);
    sh(`npx --yes postject ${outBase}.exe NODE_SEA_BLOB ${blob} --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`);
  } else if (plt === 'darwin') {
    copyFileSync(nodePath, outBase);
    // remove signature and inject; re-sign ad-hoc if available
    try { sh(`codesign --remove-signature ${outBase}`); } catch {}
    sh(`npx --yes postject ${outBase} NODE_SEA_BLOB ${blob} --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA`);
    try { sh(`codesign --sign - ${outBase}`); } catch {}
    sh(`chmod +x ${outBase}`);
  } else {
    copyFileSync(nodePath, outBase);
    sh(`npx --yes postject ${outBase} NODE_SEA_BLOB ${blob} --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`);
    sh(`chmod +x ${outBase}`);
  }
}

run();
