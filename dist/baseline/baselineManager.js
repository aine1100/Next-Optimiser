import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
const BASELINE_FILENAME = '.next-optimize-baseline.json';
/**
 * Manages performance baselines for regression detection in CI.
 */
export class BaselineManager {
    baselinePath;
    constructor(projectRoot) {
        this.baselinePath = path.join(projectRoot, BASELINE_FILENAME);
    }
    async save(result) {
        await fs.writeJson(this.baselinePath, result, { spaces: 2 });
        logger.success(`Baseline saved to ${this.baselinePath}`);
    }
    async load() {
        if (!(await fs.pathExists(this.baselinePath)))
            return null;
        return fs.readJson(this.baselinePath);
    }
    async exists() {
        return fs.pathExists(this.baselinePath);
    }
    diff(current, baseline) {
        const scoreDelta = current.score.overall - baseline.score.overall;
        const baselineIds = new Set(baseline.issues.map((i) => i.id));
        const currentIds = new Set(current.issues.map((i) => i.id));
        const newIssues = current.issues.filter((i) => !baselineIds.has(i.id));
        const resolvedIssues = baseline.issues.filter((i) => !currentIds.has(i.id));
        const regressedCategories = [];
        const categories = Object.keys(current.score.categories);
        for (const cat of categories) {
            if (current.score.categories[cat] < baseline.score.categories[cat] - 5) {
                regressedCategories.push(cat);
            }
        }
        const passed = scoreDelta >= 0 && newIssues.filter((i) => i.severity === 'critical' || i.severity === 'high').length === 0;
        return { scoreDelta, newIssues, resolvedIssues, regressedCategories, passed };
    }
}
