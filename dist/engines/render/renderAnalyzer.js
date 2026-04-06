import { AnalysisEngine } from '../../core/analyzer.js';
import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import { findFiles } from '../../utils/fileUtils.js';
export class RenderAnalyzer extends AnalysisEngine {
    name = 'Render';
    isApplicable(project) {
        return project.framework !== 'unknown';
    }
    async analyze(project) {
        const issues = [];
        const tsFiles = await findFiles('src/**/*.{ts,tsx,js,jsx}', project.rootPath, ['node_modules/**', '.next/**']);
        const morphProject = new Project();
        morphProject.addSourceFilesAtPaths(tsFiles);
        for (const sourceFile of morphProject.getSourceFiles()) {
            const relativePath = path.relative(project.rootPath, sourceFile.getFilePath());
            // Search for JSX attributes
            sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute).forEach(attr => {
                const jsxElement = attr.getFirstAncestorByKind(SyntaxKind.JsxOpeningElement) ||
                    attr.getFirstAncestorByKind(SyntaxKind.JsxSelfClosingElement);
                if (!jsxElement)
                    return;
                // Only care about PascalCase components (likely React components)
                const tagName = jsxElement.getTagNameNode().getText();
                if (!/^[A-Z]/.test(tagName))
                    return;
                const attrNameNode = attr.getNameNode();
                if (!attrNameNode)
                    return;
                const attrName = attrNameNode.getText();
                const initializer = attr.getInitializer();
                if (initializer && initializer.getKind() === SyntaxKind.JsxExpression) {
                    const expression = initializer.getExpression?.();
                    if (expression && (expression.getKind() === SyntaxKind.ArrowFunction || expression.getKind() === SyntaxKind.FunctionExpression)) {
                        issues.push(this.createIssue('inline-function', 'Inline Function Prop', `The prop "${attrName}" of component <${tagName}> is defined as an inline function.`, 'medium', 'render', relativePath, attr.getStartLineNumber(), 'Use useCallback to memoize this function and prevent unnecessary re-renders of the child component.'));
                    }
                    if (expression && (expression.getKind() === SyntaxKind.ObjectLiteralExpression || expression.getKind() === SyntaxKind.ArrayLiteralExpression)) {
                        issues.push(this.createIssue('inline-object', 'Inline Object/Array Prop', `The prop "${attrName}" of component <${tagName}> is defined as an inline object or array.`, 'medium', 'render', relativePath, attr.getStartLineNumber(), 'Use useMemo to memoize this object/array to prevent unnecessary re-renders.'));
                    }
                }
            });
            // Search for .map() in JSX without a stable key
            sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
                const propAccess = call.getExpression().asKind(SyntaxKind.PropertyAccessExpression);
                if (propAccess && propAccess.getName() === 'map') {
                    const isInsideJsx = call.getFirstAncestorByKind(SyntaxKind.JsxExpression);
                    if (isInsideJsx) {
                        const callback = call.getArguments()[0];
                        if (callback && (callback.getKind() === SyntaxKind.ArrowFunction || callback.getKind() === SyntaxKind.FunctionExpression)) {
                            const cb = callback;
                            const params = cb.getParameters();
                            const indexParam = params[1]?.getName();
                            if (indexParam) {
                                const body = cb.getBody();
                                const keyAttr = body.getDescendantsOfKind(SyntaxKind.JsxAttribute).find((a) => {
                                    const nameNode = a.getNameNode();
                                    return nameNode && nameNode.getText() === 'key';
                                });
                                if (keyAttr && keyAttr.getText().includes(indexParam)) {
                                    issues.push(this.createIssue('index-key', 'Array Index as Key', 'Using the array index as a JSX "key" can lead to performance issues and UI bugs during re-renders.', 'high', 'render', relativePath, keyAttr.getStartLineNumber(), 'Use a unique ID from the data instead of the array index.'));
                                }
                            }
                        }
                    }
                }
            });
        }
        return issues;
    }
}
