import fs from 'fs-extra';
import path from 'path';
import { AnalysisResult, Issue } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface RegressionDiff {
  scoreDelta: number;
  newIssues: Issue[];
  resolvedIssues: Issue[];
  regressedCategories: string[];
  passed: boolean;
}

const BASELINE_FILENAME = '.next-optimize-baseline.json';

/**
 * Manages performance baselines for regression detection in CI.
 */
export class BaselineManager {
  private baselinePath: string;

  constructor(projectRoot: string) {
    this.baselinePath = path.join(projectRoot, BASELINE_FILENAME);
  }

  public async save(result: AnalysisResult): Promise<void> {
    await fs.writeJson(this.baselinePath, result, { spaces: 2 });
    logger.success(`Baseline saved to ${this.baselinePath}`);
  }

  public async load(): Promise<AnalysisResult | null> {
    if (!(await fs.pathExists(this.baselinePath))) return null;
    return fs.readJson(this.baselinePath);
  }

  public async exists(): Promise<boolean> {
    return fs.pathExists(this.baselinePath);
  }

  public diff(current: AnalysisResult, baseline: AnalysisResult): RegressionDiff {
    const scoreDelta = current.score.overall - baseline.score.overall;

    const baselineIds = new Set(baseline.issues.map((i) => i.id));
    const currentIds = new Set(current.issues.map((i) => i.id));

    const newIssues = current.issues.filter((i) => !baselineIds.has(i.id));
    const resolvedIssues = baseline.issues.filter((i) => !currentIds.has(i.id));

    const regressedCategories: string[] = [];
    const categories = Object.keys(current.score.categories) as Array<keyof typeof current.score.categories>;
    for (const cat of categories) {
      if (current.score.categories[cat] < baseline.score.categories[cat] - 5) {
        regressedCategories.push(cat);
      }
    }

    const passed = scoreDelta >= 0 && newIssues.filter((i) => i.severity === 'critical' || i.severity === 'high').length === 0;

    return { scoreDelta, newIssues, resolvedIssues, regressedCategories, passed };
  }
}
