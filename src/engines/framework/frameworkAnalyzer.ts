import path from 'path';
import fs from 'fs-extra';
import { AnalysisEngine } from '../../core/analyzer.js';
import { Issue, ProjectInfo } from '../../types/index.js';
import { findSourceFiles } from '../../utils/scanUtils.js';

/**
 * Framework-specific performance checks for Remix, Vite SSR, and Express.
 */
export class FrameworkAnalyzer extends AnalysisEngine {
  public name = 'Framework';

  public isApplicable(project: ProjectInfo): boolean {
    return ['remix', 'vite', 'express', 'next'].includes(project.framework);
  }

  public async analyze(project: ProjectInfo): Promise<Issue[]> {
    const issues: Issue[] = [];

    switch (project.framework) {
      case 'remix':
        issues.push(...(await this.analyzeRemix(project)));
        break;
      case 'vite':
        issues.push(...(await this.analyzeVite(project)));
        break;
      case 'express':
        issues.push(...(await this.analyzeExpress(project)));
        break;
      case 'next':
        issues.push(...(await this.analyzeNext(project)));
        break;
    }

    return issues;
  }

  private async analyzeRemix(project: ProjectInfo): Promise<Issue[]> {
    const issues: Issue[] = [];
    const routesDir = path.join(project.rootPath, 'app', 'routes');

    if (!(await fs.pathExists(routesDir))) {
      issues.push(
        this.createIssue(
          'remix-no-routes',
          'Remix Routes Directory Missing',
          'Could not find app/routes directory for Remix route analysis.',
          'low',
          'build',
          undefined,
          undefined,
          'Ensure your Remix app follows the standard app/routes structure.'
        )
      );
      return issues;
    }

    const routeFiles = await fs.readdir(routesDir);
    const loadersWithoutCache = routeFiles.filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));

    for (const file of loadersWithoutCache) {
      const content = await fs.readFile(path.join(routesDir, file), 'utf8');
      if (content.includes('export async function loader') && !content.includes('Cache-Control') && !content.includes('cache')) {
        issues.push(
          this.createIssue(
            `remix-no-cache-${file}`,
            'Remix Loader Without Caching',
            `Route "${file}" has a loader but no cache headers configured.`,
            'medium',
            'api',
            path.join('app/routes', file),
            undefined,
            'Add Cache-Control headers in loader responses for better performance.'
          )
        );
      }
    }

    return issues;
  }

  private async analyzeVite(project: ProjectInfo): Promise<Issue[]> {
    const issues: Issue[] = [];
    const viteConfigPaths = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];

    for (const configFile of viteConfigPaths) {
      const configPath = path.join(project.rootPath, configFile);
      if (await fs.pathExists(configPath)) {
        const content = await fs.readFile(configPath, 'utf8');
        if (!content.includes('build') && !content.includes('rollupOptions')) {
          issues.push(
            this.createIssue(
              'vite-no-build-optimization',
              'Vite Build Not Optimized',
              'vite.config has no custom build or rollupOptions configuration.',
              'low',
              'build',
              configFile,
              undefined,
              'Configure manualChunks and build.target for production optimization.'
            )
          );
        }
        if (content.includes('ssr') && !content.includes('noExternal')) {
          issues.push(
            this.createIssue(
              'vite-ssr-no-external',
              'Vite SSR Missing noExternal',
              'SSR is configured but noExternal is not set, which can cause duplicate module loading.',
              'medium',
              'build',
              configFile,
              undefined,
              'Add ssr.noExternal for packages that need to be bundled in SSR.'
            )
          );
        }
        break;
      }
    }

    return issues;
  }

  private async analyzeExpress(project: ProjectInfo): Promise<Issue[]> {
    const issues: Issue[] = [];
    const tsFiles = await findSourceFiles(project.rootPath, this.config);

    for (const file of tsFiles) {
      const content = await fs.readFile(file, 'utf8');
      const relativePath = path.relative(project.rootPath, file);

      if (content.includes('app.use') && content.includes('express.json') && !content.includes('compression')) {
        issues.push(
          this.createIssue(
            'express-no-compression',
            'Missing Compression Middleware',
            'Express app does not use compression middleware for response gzip.',
            'medium',
            'api',
            relativePath,
            undefined,
            'Add the compression middleware: app.use(compression()).'
          )
        );
      }
    }

    return issues;
  }

  private async analyzeNext(project: ProjectInfo): Promise<Issue[]> {
    const issues: Issue[] = [];
    const configPaths = ['next.config.js', 'next.config.mjs', 'next.config.ts'];

    for (const configFile of configPaths) {
      const configPath = path.join(project.rootPath, configFile);
      if (await fs.pathExists(configPath)) {
        const content = await fs.readFile(configPath, 'utf8');
        if (!content.includes('images') && !content.includes('remotePatterns')) {
          issues.push(
            this.createIssue(
              'next-images-config',
              'Next.js Images Not Configured',
              'next.config.js has no images configuration for remote image optimization.',
              'low',
              'image',
              configFile,
              undefined,
              'Configure images.remotePatterns for external image optimization.'
            )
          );
        }
        break;
      }
    }

    return issues;
  }
}
