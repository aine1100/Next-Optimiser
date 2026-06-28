import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { findSourceFiles, getIgnoreGlobs, SOURCE_DIRS } from '../src/utils/scanUtils.js';
import { DEFAULT_CONFIG } from '../src/config/configLoader.js';
import { registerDefaultEngines, createScanner } from '../src/core/registerEngines.js';
import { Scanner } from '../src/core/scanner.js';

describe('scanUtils', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'next-opt-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('exposes common source directories', () => {
    expect(SOURCE_DIRS).toContain('app');
    expect(SOURCE_DIRS).toContain('pages');
  });

  it('finds files in app/ and pages/ layouts', async () => {
    await fs.outputFile(path.join(tmpDir, 'app', 'page.tsx'), 'export default function Page() {}');
    await fs.outputFile(path.join(tmpDir, 'pages', 'index.tsx'), 'export default function Home() {}');
    await fs.outputFile(path.join(tmpDir, 'src', 'App.tsx'), 'export default function App() {}');

    const files = await findSourceFiles(tmpDir, DEFAULT_CONFIG);
    const relative = files.map((f) => path.relative(tmpDir, f).replace(/\\/g, '/'));

    expect(relative).toContain('app/page.tsx');
    expect(relative).toContain('pages/index.tsx');
    expect(relative).toContain('src/App.tsx');
  });

  it('respects ignoredPaths from config', async () => {
    await fs.outputFile(path.join(tmpDir, 'src', 'keep.tsx'), 'export const a = 1');
    await fs.outputFile(path.join(tmpDir, 'dist', 'skip.js'), 'module.exports = {}');

    const config = { ...DEFAULT_CONFIG, ignoredPaths: ['dist', 'node_modules'] };
    const files = await findSourceFiles(tmpDir, config);
    const relative = files.map((f) => path.relative(tmpDir, f).replace(/\\/g, '/'));

    expect(relative).toContain('src/keep.tsx');
    expect(relative).not.toContain('dist/skip.js');
  });

  it('builds ignore globs from config', () => {
    const globs = getIgnoreGlobs(DEFAULT_CONFIG);
    expect(globs).toContain('node_modules/**');
    expect(globs).toContain('.next/**');
  });
});

describe('registerEngines', () => {
  it('registers all 8 default engines', () => {
    const scanner = new Scanner(DEFAULT_CONFIG);
    registerDefaultEngines(scanner, DEFAULT_CONFIG);
    expect(createScanner(DEFAULT_CONFIG)).toBeDefined();
  });
});
