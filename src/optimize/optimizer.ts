import path from 'path';
import { Project, SyntaxKind } from 'ts-morph';
import { Config } from '../types/index.js';
import { findSourceFiles } from '../utils/scanUtils.js';
import { logger } from '../utils/logger.js';
import { Detector } from '../core/detector.js';

export interface OptimizeResult {
  filesModified: number;
  fixesApplied: number;
  skipped: string[];
}

export interface OptimizeOptions {
  dryRun?: boolean;
}

/**
 * Applies safe automatic codemods for common performance issues.
 */
export class Optimizer {
  constructor(private config: Config) {}

  public async apply(
    projectRoot: string,
    options: OptimizeOptions = {}
  ): Promise<OptimizeResult> {
    const project = await Detector.detect(projectRoot);
    const result: OptimizeResult = { filesModified: 0, fixesApplied: 0, skipped: [] };

    if (project.framework !== 'next') {
      result.skipped.push('img-to-image codemod requires a Next.js project');
      return result;
    }

    const tsFiles = await findSourceFiles(projectRoot, this.config);
    const morphProject = new Project();

    for (const filePath of tsFiles) {
      morphProject.addSourceFileAtPath(filePath);
    }

    for (const sourceFile of morphProject.getSourceFiles()) {
      let fileChanged = false;
      const imgElements = [
        ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
        ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
      ].filter((el) => el.getTagNameNode().getText() === 'img');

      for (const el of imgElements) {
        const widthAttr = el.getAttribute('width');
        const heightAttr = el.getAttribute('height');
        const srcAttr = el.getAttribute('src');
        const altAttr = el.getAttribute('alt');

        if (!srcAttr || !altAttr) {
          result.skipped.push(
            `${path.relative(projectRoot, sourceFile.getFilePath())}:${el.getStartLineNumber()} — img missing src or alt`
          );
          continue;
        }

        if (!widthAttr || !heightAttr) {
          result.skipped.push(
            `${path.relative(projectRoot, sourceFile.getFilePath())}:${el.getStartLineNumber()} — img missing width/height (required for next/image)`
          );
          continue;
        }

        if (!options.dryRun) {
          el.getTagNameNode().replaceWithText('Image');
        }
        fileChanged = true;
        result.fixesApplied++;
      }

      if (fileChanged && !options.dryRun) {
        const hasImageImport = sourceFile
          .getImportDeclarations()
          .some((imp) => imp.getModuleSpecifierValue() === 'next/image');

        if (!hasImageImport) {
          sourceFile.addImportDeclaration({
            defaultImport: 'Image',
            moduleSpecifier: 'next/image',
          });
        }

        await sourceFile.save();
        result.filesModified++;
        logger.success(`Fixed: ${path.relative(projectRoot, sourceFile.getFilePath())}`);
      } else if (fileChanged && options.dryRun) {
        result.filesModified++;
        logger.info(`[dry-run] Would fix: ${path.relative(projectRoot, sourceFile.getFilePath())}`);
      }
    }

    return result;
  }
}
