import * as esbuild from 'esbuild';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'dist', 'agent');

await fs.ensureDir(outDir);

await esbuild.build({
  entryPoints: [path.join(__dirname, '..', 'src', 'agent', 'index.ts')],
  bundle: true,
  outfile: path.join(outDir, 'agent.js'),
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  minify: true,
});

console.log('Agent bundle written to dist/agent/agent.js');
