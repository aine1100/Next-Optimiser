import path from 'path';
import { Project, SyntaxKind, FunctionDeclaration, ArrowFunction, ClassDeclaration } from 'ts-morph';
import { AnalysisEngine } from '../../core/analyzer.js';
import { Issue, ProjectInfo } from '../../types/index.js';
import { findSourceFiles } from '../../utils/scanUtils.js';

/**
 * Static analyzer for identifying complex or over-sized React components.
 */
export class ComponentAnalyzer extends AnalysisEngine {
  public name = 'Component';

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

      // Find all function-based components
      sourceFile.getFunctions().forEach(f => this.analyzeFunctionalComponent(f, relativePath, issues));
      sourceFile.getVariableDeclarations().forEach(v => {
        const initializer = v.getInitializer();
        if (initializer && (initializer.getKind() === SyntaxKind.ArrowFunction || initializer.getKind() === SyntaxKind.FunctionExpression)) {
          this.analyzeFunctionalComponent(initializer as any, relativePath, issues, v.getName());
        }
      });

      // Find all class-based components
      sourceFile.getClasses().forEach(c => this.analyzeClassComponent(c, relativePath, issues));
    }

    return issues;
  }

  private analyzeFunctionalComponent(node: FunctionDeclaration | ArrowFunction, file: string, issues: Issue[], name?: string) {
    const compName = name || (node as any).getName?.() || 'Anonymous';
    if (!/^[A-Z]/.test(compName)) return; // Simple React component heuristic

    const loc = node.getEndLineNumber() - node.getStartLineNumber();
    if (loc > this.config.componentLocLimit) {
      issues.push(this.createIssue(
        'large-component',
        'Large Component Detected',
        `Component "${compName}" is ${loc} lines long, exceeding limit of ${this.config.componentLocLimit}.`,
        'medium',
        'component',
        file,
        node.getStartLineNumber(),
        'Split this component into smaller, reusable sub-components.'
      ));
    }

    // Check for hook count
    const hookCount = node.getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter(c => c.getExpression().getText().startsWith('use')).length;

    if (hookCount > this.config.hookCountLimit) {
      issues.push(this.createIssue(
        'excessive-hooks',
        'Excessive Hooks',
        `Component "${compName}" uses ${hookCount} hooks, exceeding limit of ${this.config.hookCountLimit}.`,
        'high',
        'component',
        file,
        node.getStartLineNumber(),
        'Refactor complex logic into custom hooks or use a state management library.'
      ));
    }
  }

  private analyzeClassComponent(node: ClassDeclaration, file: string, issues: Issue[]) {
    const loc = node.getEndLineNumber() - node.getStartLineNumber();
    if (loc > this.config.componentLocLimit) {
      issues.push(this.createIssue(
        'large-class-component',
        'Large Class Component Detected',
        `Class component "${node.getName() || 'Unknown'}" is ${loc} lines long.`,
        'medium',
        'component',
        file,
        node.getStartLineNumber(),
        'Consider migrating to functional components or splitting.'
      ));
    }
  }
}
