import { AnalysisEngine } from '../../core/analyzer.js';
import { Issue, ProjectInfo } from '../../types/index.js';
import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import { findSourceFiles } from '../../utils/scanUtils.js';

/**
 * Analyzes React Server Components patterns and "use client" boundaries.
 */
export class RscAnalyzer extends AnalysisEngine {
  public name = 'RSC';

  public isApplicable(project: ProjectInfo): boolean {
    return project.framework === 'next';
  }

  public async analyze(project: ProjectInfo): Promise<Issue[]> {
    const issues: Issue[] = [];
    const tsFiles = await findSourceFiles(project.rootPath, this.config);
    const morphProject = new Project();
    morphProject.addSourceFilesAtPaths(tsFiles);

    for (const sourceFile of morphProject.getSourceFiles()) {
      const relativePath = path.relative(project.rootPath, sourceFile.getFilePath());
      const isAppRouter = relativePath.startsWith('app' + path.sep) || relativePath.startsWith('app/');
      if (!isAppRouter) continue;

      const hasUseClient = sourceFile.getStatements().some((stmt) => {
        if (stmt.getKind() !== SyntaxKind.ExpressionStatement) return false;
        const expr = (stmt as any).getExpression?.();
        if (expr?.getKind() !== SyntaxKind.StringLiteral) return false;
        return expr.getText().replace(/['"]/g, '') === 'use client';
      });

      const hasHooks = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).some((call) => {
        const text = call.getExpression().getText();
        return text.startsWith('use') && text !== 'use';
      });

      const hasBrowserApis = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier).some((id) => {
        const text = id.getText();
        return ['window', 'document', 'localStorage', 'sessionStorage', 'navigator'].includes(text);
      });

      if (!hasUseClient && (hasHooks || hasBrowserApis)) {
        issues.push(
          this.createIssue(
            'missing-use-client',
            'Missing "use client" Directive',
            `File uses React hooks or browser APIs but lacks the "use client" directive required in the App Router.`,
            'high',
            'render',
            relativePath,
            1,
            'Add "use client" at the top of this file, or move client logic to a separate client component.'
          )
        );
      }

      if (hasUseClient) {
        const hasAsyncComponent = sourceFile.getFunctions().some((fn) => fn.isAsync());
        sourceFile.getVariableDeclarations().forEach((v) => {
          const init = v.getInitializer();
          if (init?.getKind() === SyntaxKind.ArrowFunction && (init as any).isAsync?.()) {
            if (/^[A-Z]/.test(v.getName())) {
              issues.push(
                this.createIssue(
                  'async-client-component',
                  'Async Client Component',
                  `Client component "${v.getName()}" is declared async. Client components cannot be async in React.`,
                  'critical',
                  'render',
                  relativePath,
                  v.getStartLineNumber(),
                  'Remove async from client components. Fetch data in Server Components or use useEffect.'
                )
              );
            }
          }
        });

        if (hasAsyncComponent) {
          issues.push(
            this.createIssue(
              'async-client-fn',
              'Async Client Function Component',
              'An async function component was found in a "use client" file.',
              'critical',
              'render',
              relativePath,
              undefined,
              'Client components must be synchronous. Use Server Components for async data fetching.'
            )
          );
        }
      }

      sourceFile.getImportDeclarations().forEach((imp) => {
        const mod = imp.getModuleSpecifierValue();
        if (mod === 'next/headers' || mod === 'next/cookies' || mod === 'next/cache') {
          if (!hasUseClient) return;
          issues.push(
            this.createIssue(
              'server-api-in-client',
              'Server-Only API in Client Component',
              `Import "${mod}" is server-only but used in a "use client" file.`,
              'critical',
              'render',
              relativePath,
              imp.getStartLineNumber(),
              'Move server-only logic to a Server Component or Route Handler.'
            )
          );
        }
      });
    }

    return issues;
  }
}
