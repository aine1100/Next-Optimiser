import path from 'path';
import { AnalysisEngine } from '../../core/analyzer.js';
import { Project, SyntaxKind } from 'ts-morph';
import { findSourceFiles } from '../../utils/scanUtils.js';
export class ApiAnalyzer extends AnalysisEngine {
    name = 'API';
    isApplicable(project) {
        return true;
    }
    async analyze(project) {
        const issues = [];
        const tsFiles = await findSourceFiles(project.rootPath, this.config);
        const morphProject = new Project();
        morphProject.addSourceFilesAtPaths(tsFiles);
        for (const sourceFile of morphProject.getSourceFiles()) {
            const relativePath = path.relative(project.rootPath, sourceFile.getFilePath());
            // Search for fetch / axios calls
            sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
                const expression = call.getExpression().getText();
                if (expression === 'fetch' || (expression.includes('axios') && !expression.includes('.'))) {
                    // Check for error handling (e.g. usage inside try-catch)
                    const tryStatement = call.getFirstAncestorByKind(SyntaxKind.TryStatement);
                    if (!tryStatement) {
                        issues.push(this.createIssue('missing-error-handling', 'Missing API Error Handling', `API call via ${expression} is not wrapped in a try-catch block. This can lead to unhandled runtime errors.`, 'medium', 'api', relativePath, call.getStartLineNumber(), 'Wrap this API call in a try-catch block to handle potential network or server errors.'));
                    }
                    // Check for repeated requests without caching (heuristic)
                    const hook = call.getFirstAncestorByKind(SyntaxKind.CallExpression);
                    if (hook && hook.getExpression().getText() === 'useEffect') {
                        // In useEffect without a library like SWR/React Query
                        issues.push(this.createIssue('raw-fetch-in-hook', 'Raw API Call in Hook', `Using raw ${expression} inside useEffect can lead to data races and lack of caching.`, 'medium', 'api', relativePath, call.getStartLineNumber(), 'Consider using a data-fetching library like TanStack Query (React Query) or SWR for automatic caching, deduplication, and error handling.'));
                    }
                }
            });
        }
        return issues;
    }
}
