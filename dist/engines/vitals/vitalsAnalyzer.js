import { AnalysisEngine } from '../../core/analyzer.js';
import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';
import { findSourceFiles } from '../../utils/scanUtils.js';
/**
 * Static checks for Core Web Vitals optimization opportunities.
 */
export class VitalsAnalyzer extends AnalysisEngine {
    name = 'Web Vitals';
    isApplicable(project) {
        return project.framework !== 'unknown';
    }
    async analyze(project) {
        const issues = [];
        const tsFiles = await findSourceFiles(project.rootPath, this.config);
        const morphProject = new Project();
        morphProject.addSourceFilesAtPaths(tsFiles);
        for (const sourceFile of morphProject.getSourceFiles()) {
            const relativePath = path.relative(project.rootPath, sourceFile.getFilePath());
            sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).forEach((el) => {
                const tag = el.getTagNameNode().getText();
                if (tag === 'img' && !el.getAttribute('loading')) {
                    issues.push(this.createIssue('lcp-lazy-loading', 'Missing Lazy Loading on Image', 'Image without loading="lazy" may hurt Largest Contentful Paint (LCP).', 'medium', 'image', relativePath, el.getStartLineNumber(), 'Add loading="lazy" for below-fold images, or use next/image which lazy-loads by default.'));
                }
            });
            sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
                const expr = call.getExpression().getText();
                if (expr === 'document.write' || expr === 'document.writeln') {
                    issues.push(this.createIssue('cls-document-write', 'document.write() Hurts CLS', 'document.write() can cause layout shifts and hurt Cumulative Layout Shift (CLS).', 'high', 'render', relativePath, call.getStartLineNumber(), 'Avoid document.write(). Use DOM APIs or framework rendering instead.'));
                }
            });
            const fontImports = sourceFile.getImportDeclarations().filter((imp) => {
                const mod = imp.getModuleSpecifierValue();
                return mod.includes('font') || mod.includes('@fontsource');
            });
            if (fontImports.length > 2) {
                issues.push(this.createIssue('cls-multiple-fonts', 'Multiple Font Imports', `${fontImports.length} font imports detected. Each can cause layout shift during load.`, 'medium', 'render', relativePath, fontImports[0].getStartLineNumber(), 'Use next/font to self-host and optimize fonts with zero layout shift.'));
            }
            sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute).forEach((attr) => {
                const name = attr.getNameNode()?.getText();
                if (name === 'style') {
                    const init = attr.getInitializer();
                    if (init?.getKind() === SyntaxKind.JsxExpression) {
                        const expr = init.getExpression?.();
                        if (expr?.getKind() === SyntaxKind.ObjectLiteralExpression) {
                            const text = expr.getText();
                            if (text.includes('height') && !text.includes('minHeight') && text.includes('width')) {
                                issues.push(this.createIssue('cls-fixed-dimensions', 'Potential Layout Shift from Inline Styles', 'Fixed width/height without min-height can cause CLS when content loads.', 'low', 'render', relativePath, attr.getStartLineNumber(), 'Reserve space with min-height or aspect-ratio to prevent layout shifts.'));
                            }
                        }
                    }
                }
            });
        }
        return issues;
    }
}
