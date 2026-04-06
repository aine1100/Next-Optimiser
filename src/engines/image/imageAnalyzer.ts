import path from 'path';
import { AnalysisEngine } from '../../core/analyzer.js';
import { Issue, ProjectInfo } from '../../types/index.js';
import { findFiles, getFileSize, formatSize } from '../../utils/fileUtils.js';
import { Project, SyntaxKind } from 'ts-morph';

export class ImageAnalyzer extends AnalysisEngine {
  public name = 'Image';

  public isApplicable(project: ProjectInfo): boolean {
    return true;
  }

  public async analyze(project: ProjectInfo): Promise<Issue[]> {
    const issues: Issue[] = [];
    const imageFiles = await findFiles('public/**/*.{png,jpg,jpeg,gif,svg}', project.rootPath);

    for (const file of imageFiles) {
      const size = await getFileSize(file);
      const relativePath = path.relative(project.rootPath, file);

      if (size > this.config.imageSizeLimit) {
        issues.push(this.createIssue(
          'large-image',
          'Large Image Asset',
          `Image asset ${relativePath} is ${formatSize(size)}, exceeding limit of ${formatSize(this.config.imageSizeLimit)}.`,
          'medium',
          'image',
          relativePath,
          undefined,
          'Compress this image or use a modern format like WebP/AVIF.'
        ));
      }

      if (path.extname(file).match(/\.(png|jpg|jpeg)$/i)) {
        issues.push(this.createIssue(
          'unoptimized-format',
          'Unoptimized Image Format',
          `Image ${relativePath} is using a legacy format. Modern formats like WebP or AVIF offer better compression.`,
          'low',
          'image',
          relativePath,
          undefined,
          'Convert this image to WebP or AVIF.'
        ));
      }
    }

    // Next.js specific check for <img> instead of <Image />
    if (project.framework === 'next') {
      const tsFiles = await findFiles('src/**/*.{ts,tsx,js,jsx}', project.rootPath, ['node_modules/**', '.next/**']);
      const morphProject = new Project();
      morphProject.addSourceFilesAtPaths(tsFiles);

      for (const sourceFile of morphProject.getSourceFiles()) {
         sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).forEach(el => {
           if (el.getTagNameNode().getText() === 'img') {
             issues.push(this.createIssue(
               'legacy-img-tag',
               'Legacy <img> Tag Detected',
               'Using standard <img> tags in Next.js misses out on automatic image optimization.',
               'medium',
               'image',
               path.relative(project.rootPath, sourceFile.getFilePath()),
               el.getStartLineNumber(),
               'Use the next/image component for automatic optimization, lazy loading, and resizing.'
             ));
           }
         });
      }
    }

    return issues;
  }
}
