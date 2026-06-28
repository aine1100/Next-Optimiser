import { AnalysisEngine } from '../../core/analyzer.js';
import { Project, SyntaxKind, } from 'ts-morph';
import path from 'path';
import { findSourceFiles } from '../../utils/scanUtils.js';
export class RenderAnalyzer extends AnalysisEngine {
    name = 'Render';
    isApplicable(project) {
        return project.framework !== 'unknown';
    }
    async analyze(project) {
        const issues = [];
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
    collectMemoizedComponents(morphProject) {
        const memoized = new Set();
        for (const sourceFile of morphProject.getSourceFiles()) {
            sourceFile.getVariableDeclarations().forEach((decl) => {
                const name = decl.getName();
                const init = decl.getInitializer();
                if (!init || init.getKind() !== SyntaxKind.CallExpression)
                    return;
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
                        if (arg)
                            memoized.add(arg.getText());
                    }
                }
            });
        }
        return memoized;
    }
    checkInlineProps(sourceFile, relativePath, issues) {
        sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute).forEach((attr) => {
            const jsxElement = attr.getFirstAncestorByKind(SyntaxKind.JsxOpeningElement) ||
                attr.getFirstAncestorByKind(SyntaxKind.JsxSelfClosingElement);
            if (!jsxElement)
                return;
            const tagName = jsxElement.getTagNameNode().getText();
            if (!/^[A-Z]/.test(tagName))
                return;
            const attrNameNode = attr.getNameNode();
            if (!attrNameNode)
                return;
            const attrName = attrNameNode.getText();
            const initializer = attr.getInitializer();
            if (initializer?.getKind() !== SyntaxKind.JsxExpression)
                return;
            const expression = initializer.getExpression?.();
            if (expression &&
                (expression.getKind() === SyntaxKind.ArrowFunction ||
                    expression.getKind() === SyntaxKind.FunctionExpression)) {
                issues.push(this.createIssue('inline-function', 'Inline Function Prop', `The prop "${attrName}" of component <${tagName}> is defined as an inline function.`, 'medium', 'render', relativePath, attr.getStartLineNumber(), 'Use useCallback to memoize this function and prevent unnecessary re-renders of the child component.'));
            }
            if (expression &&
                (expression.getKind() === SyntaxKind.ObjectLiteralExpression ||
                    expression.getKind() === SyntaxKind.ArrayLiteralExpression)) {
                issues.push(this.createIssue('inline-object', 'Inline Object/Array Prop', `The prop "${attrName}" of component <${tagName}> is defined as an inline object or array.`, 'medium', 'render', relativePath, attr.getStartLineNumber(), 'Use useMemo to memoize this object/array to prevent unnecessary re-renders.'));
            }
        });
    }
    checkMapKeys(sourceFile, relativePath, issues) {
        sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
            const propAccess = call.getExpression().asKind(SyntaxKind.PropertyAccessExpression);
            if (!propAccess || propAccess.getName() !== 'map')
                return;
            const isInsideJsx = call.getFirstAncestorByKind(SyntaxKind.JsxExpression);
            if (!isInsideJsx)
                return;
            const callback = call.getArguments()[0];
            if (!callback ||
                (callback.getKind() !== SyntaxKind.ArrowFunction &&
                    callback.getKind() !== SyntaxKind.FunctionExpression)) {
                return;
            }
            const cb = callback;
            const body = cb.getBody();
            if (!body)
                return;
            const jsxElements = [
                ...body.getDescendantsOfKind(SyntaxKind.JsxElement),
                ...body.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
            ];
            for (const jsxEl of jsxElements) {
                const opening = jsxEl.getKind() === SyntaxKind.JsxElement
                    ? jsxEl.getOpeningElement()
                    : jsxEl;
                const keyAttr = opening.getAttribute('key');
                if (!keyAttr) {
                    const tagName = opening.getTagNameNode().getText();
                    issues.push(this.createIssue('missing-key', 'Missing Key in List Render', `List item <${tagName}> rendered via .map() is missing a "key" prop.`, 'high', 'render', relativePath, opening.getStartLineNumber(), 'Add a stable, unique "key" prop to each element in the list.'));
                    continue;
                }
                const indexParam = cb.getParameters()[1]?.getName();
                if (indexParam && keyAttr.getText().includes(indexParam)) {
                    issues.push(this.createIssue('index-key', 'Array Index as Key', 'Using the array index as a JSX "key" can lead to performance issues and UI bugs during re-renders.', 'high', 'render', relativePath, keyAttr.getStartLineNumber(), 'Use a unique ID from the data instead of the array index.'));
                }
            }
        });
    }
    checkMissingMemoInLists(sourceFile, relativePath, issues, memoizedComponents) {
        sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
            const propAccess = call.getExpression().asKind(SyntaxKind.PropertyAccessExpression);
            if (!propAccess || propAccess.getName() !== 'map')
                return;
            const callback = call.getArguments()[0];
            if (!callback ||
                (callback.getKind() !== SyntaxKind.ArrowFunction &&
                    callback.getKind() !== SyntaxKind.FunctionExpression)) {
                return;
            }
            const cb = callback;
            const body = cb.getBody();
            if (!body)
                return;
            const jsxElements = [
                ...body.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
                ...body.getDescendantsOfKind(SyntaxKind.JsxElement).map((el) => el.getOpeningElement()),
            ];
            for (const opening of jsxElements) {
                const tagName = opening.getTagNameNode().getText();
                if (!/^[A-Z]/.test(tagName))
                    continue;
                if (memoizedComponents.has(tagName))
                    continue;
                issues.push(this.createIssue('missing-memo', 'Unmemoized Component in List', `Component <${tagName}> is rendered inside a .map() but is not wrapped with React.memo().`, 'medium', 'render', relativePath, opening.getStartLineNumber(), 'Wrap this component with React.memo() to avoid unnecessary re-renders when the parent updates.'));
            }
        });
    }
    checkPropDrilling(sourceFile, relativePath, issues) {
        const limit = this.config.propDrillLimit;
        sourceFile.getFunctions().forEach((fn) => this.checkComponentPropDrill(fn, relativePath, issues, limit));
        sourceFile.getVariableDeclarations().forEach((v) => {
            const init = v.getInitializer();
            if (init &&
                (init.getKind() === SyntaxKind.ArrowFunction || init.getKind() === SyntaxKind.FunctionExpression)) {
                this.checkComponentPropDrill(init, relativePath, issues, limit, v.getName());
            }
        });
    }
    checkComponentPropDrill(node, relativePath, issues, limit, name) {
        const compName = name || node.getName?.() || 'Anonymous';
        if (!/^[A-Z]/.test(compName))
            return;
        const body = node.getBody();
        const params = node.getParameters().map((p) => p.getName());
        for (const param of params) {
            const depth = this.measurePropForwardDepth(body, param);
            if (depth >= limit) {
                issues.push(this.createIssue('prop-drilling', 'Prop Drilling Detected', `Prop "${param}" in component "${compName}" is forwarded ${depth} times without being used locally.`, 'medium', 'render', relativePath, node.getStartLineNumber(), 'Consider React Context, a state management library, or composition to avoid deep prop drilling.'));
            }
        }
    }
    measurePropForwardDepth(body, propName) {
        let forwardCount = 0;
        body.getDescendantsOfKind(SyntaxKind.JsxAttribute).forEach((attr) => {
            const init = attr.getInitializer();
            if (init?.getKind() === SyntaxKind.JsxExpression &&
                init.getExpression()?.getText() === propName) {
                forwardCount++;
            }
        });
        return forwardCount;
    }
}
