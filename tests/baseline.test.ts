import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { BaselineManager } from '../src/baseline/baselineManager.js';
import { AnalysisResult } from '../src/types/index.js';

const mockResult = (score: number, issueIds: string[]): AnalysisResult => ({
  timestamp: new Date().toISOString(),
  project: {
    framework: 'next',
    buildTool: 'webpack',
    packageManager: 'npm',
    nodeVersion: 'v20.0.0',
    rootPath: '/tmp',
  },
  issues: issueIds.map((id) => ({
    id,
    title: `Issue ${id}`,
    description: 'test',
    severity: 'medium' as const,
    category: 'build' as const,
  })),
  score: {
    overall: score,
    categories: { bundle: score, dependency: score, component: score, render: score, memory: score, image: score, api: score, build: score },
  },
  recommendations: [],
});

describe('BaselineManager', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'next-opt-base-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('saves and loads a baseline', async () => {
    const manager = new BaselineManager(tmpDir);
    const result = mockResult(85, ['issue-1']);
    await manager.save(result);

    const loaded = await manager.load();
    expect(loaded?.score.overall).toBe(85);
    expect(loaded?.issues).toHaveLength(1);
  });

  it('detects score regression', async () => {
    const manager = new BaselineManager(tmpDir);
    await manager.save(mockResult(90, ['issue-1']));

    const current = mockResult(75, ['issue-1', 'issue-2']);
    const baseline = (await manager.load())!;
    const diff = manager.diff(current, baseline);

    expect(diff.scoreDelta).toBe(-15);
    expect(diff.newIssues).toHaveLength(1);
    expect(diff.passed).toBe(false);
  });

  it('detects resolved issues', async () => {
    const manager = new BaselineManager(tmpDir);
    await manager.save(mockResult(80, ['issue-1', 'issue-2']));

    const current = mockResult(85, ['issue-1']);
    const baseline = (await manager.load())!;
    const diff = manager.diff(current, baseline);

    expect(diff.resolvedIssues).toHaveLength(1);
    expect(diff.scoreDelta).toBe(5);
  });
});

describe('FixSuggester', () => {
  it('generates suggestions for known issue types', async () => {
    const { FixSuggester } = await import('../src/ai/fixSuggester.js');

    const issues = [
      { id: 'render-inline-function-1', title: 'Inline', description: 'd', severity: 'medium' as const, category: 'render' as const, suggestion: 'use useCallback' },
      { id: 'image-legacy-img-tag-1', title: 'Img', description: 'd', severity: 'medium' as const, category: 'image' as const },
    ];

    const suggestions = FixSuggester.suggest(issues);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].before).toBeTruthy();
    expect(suggestions[0].after).toBeTruthy();
  });

  it('formats as markdown', async () => {
    const { FixSuggester } = await import('../src/ai/fixSuggester.js');
    const md = FixSuggester.formatAsMarkdown([]);
    expect(md).toContain('No fix suggestions');
  });
});
