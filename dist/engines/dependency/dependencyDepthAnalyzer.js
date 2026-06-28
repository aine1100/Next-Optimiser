import path from 'path';
import { AnalysisEngine } from '../../core/analyzer.js';
import { readJsonSafe } from '../../utils/fileUtils.js';
const ESTIMATED_SIZES_KB = {
    moment: 290,
    lodash: 70,
    'lodash-es': 25,
    axios: 15,
    jquery: 85,
    '@mui/material': 350,
    '@mui/icons-material': 500,
    'antd': 400,
    'chart.js': 200,
    three: 600,
    firebase: 250,
    '@aws-sdk/client-s3': 180,
};
/**
 * Deep dependency analysis with size estimates and duplicate detection.
 */
export class DependencyDepthAnalyzer extends AnalysisEngine {
    name = 'Dependency Depth';
    isApplicable(project) {
        return project.packageManager !== 'unknown';
    }
    async analyze(project) {
        const issues = [];
        const packageJson = await readJsonSafe(path.join(project.rootPath, 'package.json'));
        if (!packageJson)
            return issues;
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        let totalEstimatedSize = 0;
        for (const [pkg, _version] of Object.entries(deps)) {
            const estimatedKb = ESTIMATED_SIZES_KB[pkg];
            if (estimatedKb) {
                totalEstimatedSize += estimatedKb;
                if (estimatedKb > 100) {
                    issues.push(this.createIssue(`large-dep-${pkg}`, `Large Dependency: ${pkg} (~${estimatedKb}KB)`, `"${pkg}" is estimated at ~${estimatedKb}KB minified. This significantly impacts bundle size.`, estimatedKb > 200 ? 'high' : 'medium', 'dependency', 'package.json', undefined, `Consider a lighter alternative or dynamic import for "${pkg}".`));
                }
            }
        }
        const depCount = Object.keys(deps).length;
        if (depCount > 100) {
            issues.push(this.createIssue('excessive-deps', 'Excessive Dependency Count', `Project has ${depCount} dependencies. Large dependency trees increase install time and bundle risk.`, 'medium', 'dependency', 'package.json', undefined, 'Audit dependencies with npm ls or depcheck and remove unused packages.'));
        }
        const duplicates = this.findSimilarPackages(deps);
        for (const group of duplicates) {
            issues.push(this.createIssue(`similar-deps-${group[0]}`, `Similar Packages: ${group.join(', ')}`, `Found potentially redundant packages: ${group.join(', ')}.`, 'medium', 'dependency', 'package.json', undefined, 'Consolidate to a single package to reduce bundle size.'));
        }
        if (totalEstimatedSize > 1000) {
            issues.push(this.createIssue('total-dep-size', 'High Total Dependency Weight', `Estimated heavy dependency weight: ~${(totalEstimatedSize / 1024).toFixed(1)}MB across known large packages.`, 'high', 'dependency', 'package.json', undefined, 'Run a bundle analyzer and replace or lazy-load the largest dependencies.'));
        }
        return issues;
    }
    findSimilarPackages(deps) {
        const groups = [];
        const similarSets = [
            ['moment', 'dayjs', 'date-fns', 'luxon'],
            ['lodash', 'lodash-es', 'underscore', 'ramda'],
            ['axios', 'got', 'node-fetch', 'ky'],
            ['styled-components', '@emotion/react', '@emotion/styled'],
            ['redux', 'zustand', 'jotai', 'recoil', 'mobx'],
        ];
        for (const set of similarSets) {
            const found = set.filter((pkg) => deps[pkg]);
            if (found.length > 1)
                groups.push(found);
        }
        return groups;
    }
}
