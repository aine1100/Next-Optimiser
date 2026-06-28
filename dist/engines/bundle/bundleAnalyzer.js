import path from 'path';
import { AnalysisEngine } from '../../core/analyzer.js';
import { findFiles, getFileSize, formatSize } from '../../utils/fileUtils.js';
import { getIgnoreGlobs } from '../../utils/scanUtils.js';
/**
 * Analyzes build artifacts and source code to identify bundle size issues.
 */
export class BundleAnalyzer extends AnalysisEngine {
    name = 'Bundle';
    /**
     * Checks if bundle analysis is applicable.
     * Requires a package.json or build directory.
     */
    isApplicable(project) {
        return project.framework !== 'unknown';
    }
    async analyze(project) {
        const issues = [];
        const buildDirs = ['.next', 'dist', 'build', 'out'];
        let foundBundles = false;
        for (const dir of buildDirs) {
            const dirPath = path.join(project.rootPath, dir);
            const jsFiles = await findFiles('**/*.js', dirPath, getIgnoreGlobs(this.config));
            if (jsFiles.length > 0) {
                foundBundles = true;
                for (const file of jsFiles) {
                    const size = await getFileSize(file);
                    const relativePath = path.relative(project.rootPath, file);
                    if (size > this.config.bundleSizeCritical) {
                        issues.push(this.createIssue('critical-size', 'Critical Bundle Size', `Bundle ${relativePath} is ${formatSize(size)}, exceeding critical limit ${formatSize(this.config.bundleSizeCritical)}.`, 'critical', 'bundle', relativePath, undefined, 'Implement dynamic imports or split large components into separate chunks.'));
                    }
                    else if (size > this.config.bundleSizeWarning) {
                        issues.push(this.createIssue('large-size', 'Large Bundle Warning', `Bundle ${relativePath} is ${formatSize(size)}, exceeding warning limit ${formatSize(this.config.bundleSizeWarning)}.`, 'high', 'bundle', relativePath, undefined, 'Consider using React.lazy or next/dynamic to reduce initial load size.'));
                    }
                }
            }
        }
        if (!foundBundles) {
            issues.push(this.createIssue('no-build', 'No Build Output Found', 'Could not find build directories (.next, dist, build). Run a build first for accurate analysis.', 'medium', 'bundle', undefined, undefined, 'Run `npm run build` or equivalent before analyzing.'));
        }
        return issues;
    }
}
