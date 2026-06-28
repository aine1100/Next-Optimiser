import { AnalysisEngine } from '../../core/analyzer.js';
import { Issue, ProjectInfo } from '../../types/index.js';
import {
  Project,
  SyntaxKind,
  ArrowFunction,
  FunctionDeclaration,
  JsxElement,
  JsxSelfClosingElement,
  SourceFile,
} from 'ts-morph';
import path from 'path';
import { findSourceFiles } from '../../utils/scanUtils.js';

export class RenderAnalyzer extends AnalysisEngine {
  public name = 'Render';

  public isApplicable(project: ProjectInfo): boolean {
    return project.framework !== 'unknown';
  }

  public async analyze(project: ProjectInfo): Promise<Issue[]> {
    const issues: Issue[] = [];
    const tsFiles = await findSourceFiles(project.rootPath, this.config);

    const morphProject = new Project();
    morphProject.addSourceFilesAtPaths(tsFiles);

    const memoizedComponents = this.collectMemoizedComponents(morphProject);

    for (const sourceFile of morphProject.getSourceFiles()) {
      const relativePath = path.relative(project.rootPath, sourceFile.getFilePath());

      this.checkInlineProps(sourceFile, relativePath, issues);
      this.checkMapKeys(sourceFile, relativePath, issues);
      this.checkMissingMemoInLists(sourceFile, relativePath, issues, memoizedComponents);
      this.checkPropDrilling(sourceFile, relativePath, issues);
    }

    return issues;
  }

  private collectMemoizedComponents(morphProject: Project): Set<string> {
    const memoized = new Set<string>();

    for (const sourceFile of morphProject.getSourceFiles()) {
      sourceFile.getVariableDeclarations().forEach((decl) => {
        const name = decl.getName();
        const init = decl.getInitializer();
        if (!init || init.getKind() !== SyntaxKind.CallExpression) return;
        const call = init.asKindOrThrow(SyntaxKind.CallExpression);
        const callee = call.getExpression().getText();
        if (callee === 'memo' || callee === 'React.memo') {
          memoized.add(name);
        }
      });

      sourceFile.getExportAssignments().forEach((exp) => {
        const expr = exp.getExpression();
        if (expr.getKind() === SyntaxKind.CallExpression) {
          const call = expr.asKindOrThrow(SyntaxKind.CallExpression);
          const callee = call.getExpression().getText();
          if (callee === 'memo' || callee === 'React.memo') {
            const arg = call.getArguments()[0];
            if (arg) memoized.add(arg.getText());
          }
        }
      });
    }

    return memoized;
  }

  private checkInlineProps(sourceFile: SourceFile, relativePath: string, issues: Issue[]) {
    sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute).forEach((attr) => {
      const jsxElement =
        attr.getFirstAncestorByKind(SyntaxKind.JsxOpeningElement) ||
        attr.getFirstAncestorByKind(SyntaxKind.JsxSelfClosingElement);

      if (!jsxElement) return;

      const tagName = jsxElement.getTagNameNode().getText();
      if (!/^[A-Z]/.test(tagName)) return;

      const attrNameNode = attr.getNameNode();
      if (!attrNameNode) return;
      const attrName = attrNameNode.getText();

      const initializer = attr.getInitializer();
      if (initializer?.getKind() !== SyntaxKind.JsxExpression) return;

      const expression = (initializer as any).getExpression?.();

      if (
        expression &&
        (expression.getKind() === SyntaxKind.ArrowFunction ||
          expression.getKind() === SyntaxKind.FunctionExpression)
      ) {
        issues.push(
          this.createIssue(
            'inline-function',
            'Inline Function Prop',
            `The prop "${attrName}" of component <${tagName}> is defined as an inline function.`,
            'medium',
            'render',
            relativePath,
            attr.getStartLineNumber(),
            'Use useCallback to memoize this function and prevent unnecessary re-renders of the child component.'
          )
        );
      }

      if (
        expression &&
        (expression.getKind() === SyntaxKind.ObjectLiteralExpression ||
          expression.getKind() === SyntaxKind.ArrayLiteralExpression)
      ) {
        issues.push(
          this.createIssue(
            'inline-object',
            'Inline Object/Array Prop',
            `The prop "${attrName}" of component <${tagName}> is defined as an inline object or array.`,
            'medium',
            'render',
            relativePath,
            attr.getStartLineNumber(),
            'Use useMemo to memoize this object/array to prevent unnecessary re-renders.'
          )
        );
      }
    });
  }

  private checkMapKeys(sourceFile: SourceFile, relativePath: string, issues: Issue[]) {
    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
      const propAccess = call.getExpression().asKind(SyntaxKind.PropertyAccessExpression);
      if (!propAccess || propAccess.getName() !== 'map') return;

      const isInsideJsx = call.getFirstAncestorByKind(SyntaxKind.JsxExpression);
      if (!isInsideJsx) return;

      const callback = call.getArguments()[0];
      if (
        !callback ||
        (callback.getKind() !== SyntaxKind.ArrowFunction &&
          callback.getKind() !== SyntaxKind.FunctionExpression)
      ) {
        return;
      }

      const cb = callback as ArrowFunction | FunctionDeclaration;
      const body = cb.getBody();
      if (!body) return;

      const jsxElements = [
        ...body.getDescendantsOfKind(SyntaxKind.JsxElement),
        ...body.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
      ];

      for (const jsxEl of jsxElements) {
        const opening =
          jsxEl.getKind() === SyntaxKind.JsxElement
            ? (jsxEl as JsxElement).getOpeningElement()
            : (jsxEl as JsxSelfClosingElement);

        const keyAttr = opening.getAttribute('key');

        if (!keyAttr) {
          const tagName = opening.getTagNameNode().getText();
          issues.push(
            this.createIssue(
              'missing-key',
              'Missing Key in List Render',
              `List item <${tagName}> rendered via .map() is missing a "key" prop.`,
              'high',
              'render',
              relativePath,
              opening.getStartLineNumber(),
              'Add a stable, unique "key" prop to each element in the list.'
            )
          );
          continue;
        }

        const indexParam = cb.getParameters()[1]?.getName();
        if (indexParam && keyAttr.getText().includes(indexParam)) {
          issues.push(
            this.createIssue(
              'index-key',
              'Array Index as Key',
              'Using the array index as a JSX "key" can lead to performance issues and UI bugs during re-renders.',
              'high',
              'render',
              relativePath,
              keyAttr.getStartLineNumber(),
              'Use a unique ID from the data instead of the array index.'
            )
          );
        }
      }
    });
  }

  private checkMissingMemoInLists(
    sourceFile: SourceFile,
    relativePath: string,
    issues: Issue[],
    memoizedComponents: Set<string>
  ) {
    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
      const propAccess = call.getExpression().asKind(SyntaxKind.PropertyAccessExpression);
      if (!propAccess || propAccess.getName() !== 'map') return;

      const callback = call.getArguments()[0];
      if (
        !callback ||
        (callback.getKind() !== SyntaxKind.ArrowFunction &&
          callback.getKind() !== SyntaxKind.FunctionExpression)
      ) {
        return;
      }

      const cb = callback as ArrowFunction;
      const body = cb.getBody();
      if (!body) return;

      const jsxElements = [
        ...body.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
        ...body.getDescendantsOfKind(SyntaxKind.JsxElement).map((el) => el.getOpeningElement()),
      ];

      for (const opening of jsxElements) {
        const tagName = opening.getTagNameNode().getText();
        if (!/^[A-Z]/.test(tagName)) continue;
        if (memoizedComponents.has(tagName)) continue;

        issues.push(
          this.createIssue(
            'missing-memo',
            'Unmemoized Component in List',
            `Component <${tagName}> is rendered inside a .map() but is not wrapped with React.memo().`,
            'medium',
            'render',
            relativePath,
            opening.getStartLineNumber(),
            'Wrap this component with React.memo() to avoid unnecessary re-renders when the parent updates.'
          )
        );
      }
    });
  }

  private checkPropDrilling(sourceFile: SourceFile, relativePath: string, issues: Issue[]) {
    const limit = this.config.propDrillLimit;

    sourceFile.getFunctions().forEach((fn) => this.checkComponentPropDrill(fn, relativePath, issues, limit));
    sourceFile.getVariableDeclarations().forEach((v) => {
      const init = v.getInitializer();
      if (
        init &&
        (init.getKind() === SyntaxKind.ArrowFunction || init.getKind() === SyntaxKind.FunctionExpression)
      ) {
        this.checkComponentPropDrill(init as ArrowFunction, relativePath, issues, limit, v.getName());
      }
    });
  }

  private checkComponentPropDrill(
    node: FunctionDeclaration | ArrowFunction,
    relativePath: string,
    issues: Issue[],
    limit: number,
    name?: string
  ) {
    const compName = name || (node as FunctionDeclaration).getName?.() || 'Anonymous';
    if (!/^[A-Z]/.test(compName)) return;

    const body = node.getBody();
    const params = node.getParameters().map((p) => p.getName());

    for (const param of params) {
      const depth = this.measurePropForwardDepth(body, param);
      if (depth >= limit) {
        issues.push(
          this.createIssue(
            'prop-drilling',
            'Prop Drilling Detected',
            `Prop "${param}" in component "${compName}" is forwarded ${depth} times without being used locally.`,
            'medium',
            'render',
            relativePath,
            node.getStartLineNumber(),
            'Consider React Context, a state management library, or composition to avoid deep prop drilling.'
          )
        );
      }
    }
  }

  private measurePropForwardDepth(body: any, propName: string): number {
    let forwardCount = 0;

    body.getDescendantsOfKind(SyntaxKind.JsxAttribute).forEach((attr: any) => {
      const init = attr.getInitializer();
      if (
        init?.getKind() === SyntaxKind.JsxExpression &&
        init.getExpression()?.getText() === propName
      ) {
        forwardCount++;
      }
    });

    return forwardCount;
  }
}
