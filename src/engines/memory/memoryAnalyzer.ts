import { AnalysisEngine } from '../../core/analyzer.js';
import { Issue, ProjectInfo } from '../../types/index.js';
import { Project, SyntaxKind, ParameterDeclaration, VariableDeclaration, FunctionDeclaration, ArrowFunction, Expression } from 'ts-morph';
import path from 'path';
import { findSourceFiles } from '../../utils/scanUtils.js';

/**
 * Static analyzer for identifying potential memory leaks and missing cleanups.
 */
export class MemoryAnalyzer extends AnalysisEngine {
  public name = 'Memory';

  /**
   * Applicable to React and Next.js projects.
   */
  public isApplicable(project: ProjectInfo): boolean {
    return project.framework !== 'unknown';
  }

  public async analyze(project: ProjectInfo): Promise<Issue[]> {
    const issues: Issue[] = [];
    const tsFiles = await findSourceFiles(project.rootPath, this.config);
    
    const morphProject = new Project();
    morphProject.addSourceFilesAtPaths(tsFiles);

    for (const sourceFile of morphProject.getSourceFiles()) {
      const relativePath = path.relative(project.rootPath, sourceFile.getFilePath());

      // Search for useEffect / useLayoutEffect hook calls
      sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
        const expression = call.getExpression().getText();
        if (expression === 'useEffect' || expression === 'useLayoutEffect') {
          const callback = call.getArguments()[0];
          if (callback && (callback.getKind() === SyntaxKind.ArrowFunction || callback.getKind() === SyntaxKind.FunctionExpression)) {
            const body = (callback as ArrowFunction).getBody();
            
            // Check for setInterval/setTimeout/addEventListener in the hook body
            const timers = body.getDescendantsOfKind(SyntaxKind.CallExpression).filter(c => {
               const text = c.getExpression().getText();
               return text === 'setInterval' || text === 'addEventListener';
            });

            if (timers.length > 0) {
              const returnStatement = body.getDescendantsOfKind(SyntaxKind.ReturnStatement)[0];
              if (!returnStatement) {
                issues.push(this.createIssue(
                  'missing-cleanup',
                  'Missing Cleanup in Hook',
                  `Hook "${expression}" initializes timers or event listeners but lacks a cleanup function. This will cause memory leaks.`,
                  'high',
                  'memory',
                  relativePath,
                  call.getStartLineNumber(),
                  'Add a cleanup function by returning a callback from the hook.'
                ));
              }
            }
          }
        }
      });
    }

    return issues;
  }
}
