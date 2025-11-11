import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';

// Read version from package.json
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
  },
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: false,
  dts: false,
  splitting: false,
  treeshake: false,
  platform: 'node',
  skipNodeModulesBundle: true, // Don't bundle node_modules
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
});
