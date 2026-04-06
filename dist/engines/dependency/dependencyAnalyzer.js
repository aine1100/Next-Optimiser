import path from 'path';
import { AnalysisEngine } from '../../core/analyzer.js';
import { readJsonSafe } from '../../utils/fileUtils.js';
export class DependencyAnalyzer extends AnalysisEngine {
    name = 'Dependency';
    HEAVY_PACKAGES = {
        'moment': 'dayjs or date-fns',
        'lodash': 'lodash-es or native array methods',
        'axios': 'fetch api',
        'jquery': 'native dom api',
    };
    isApplicable(project) {
        return project.packageManager !== 'unknown';
    }
    async analyze(project) {
        const issues = [];
        const packageJson = await readJsonSafe(path.join(project.rootPath, 'package.json'));
        if (!packageJson)
            return [];
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        // Check for heavy packages
        for (const [pkg, alternative] of Object.entries(this.HEAVY_PACKAGES)) {
            if (deps[pkg]) {
                issues.push(this.createIssue(`heavy-${pkg}`, `Heavy dependency detected: ${pkg}`, `${pkg} is a large package and can significantly increase bundle size.`, 'high', 'dependency', 'package.json', undefined, `Replace ${pkg} with ${alternative}.`));
            }
        }
        // Check for duplicate dependencies (e.g. both lodash and lodash-es)
        if (deps['lodash'] && deps['lodash-es']) {
            issues.push(this.createIssue('duplicate-lodash', 'Duplicate Lodash Versions', 'Found both lodash and lodash-es in dependencies.', 'medium', 'dependency', 'package.json', undefined, 'Remove lodash and use lodash-es for better tree-shaking.'));
        }
        return issues;
    }
}
