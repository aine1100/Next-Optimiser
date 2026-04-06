import path from 'path';
import { AnalysisEngine } from '../../core/analyzer.js';
import { Issue, ProjectInfo } from '../../types/index.js';
import { readJsonSafe } from '../../utils/fileUtils.js';
import fs from 'fs-extra';

export class BuildAnalyzer extends AnalysisEngine {
  public name = 'Build';

  public isApplicable(project: ProjectInfo): boolean {
    return project.framework !== 'unknown';
  }

  public async analyze(project: ProjectInfo): Promise<Issue[]> {
    const issues: Issue[] = [];
    const packageJson = await readJsonSafe<any>(path.join(project.rootPath, 'package.json'));

    if (packageJson) {
      // Check for production build script
      if (!packageJson.scripts?.build) {
        issues.push(this.createIssue(
          'missing-build-script',
          'Missing Production Build Script',
          'A "build" script was not found in package.json. Production builds are essential for performance.',
          'high',
          'build',
          'package.json',
          undefined,
          'Add a "build" script to your package.json (e.g., "next build" or "vite build").'
        ));
      }
    }

    // Next.js specific optimizations
    if (project.framework === 'next') {
      const nextConfigPath = path.join(project.rootPath, 'next.config.js');
      const nextConfigMjsPath = path.join(project.rootPath, 'next.config.mjs');

      if (!(await fs.pathExists(nextConfigPath)) && !(await fs.pathExists(nextConfigMjsPath))) {
        issues.push(this.createIssue(
          'missing-next-config',
          'Missing next.config.js',
          'Next.js configuration file is missing. Default settings might not be optimal for production.',
          'low',
          'build',
          undefined,
          undefined,
          'Create a next.config.js file to manage custom optimizations.'
        ));
      } else {
        // Further static analysis of next.config.js could go here
        // (e.g., checking for swcMinify, experimental features, etc.)
      }
    }

    // Vite specific check
    if (project.framework === 'vite') {
      const viteConfigPath = path.join(project.rootPath, 'vite.config.ts');
      if (!(await fs.pathExists(viteConfigPath)) && !(await fs.pathExists(path.join(project.rootPath, 'vite.config.js')))) {
         // Should be there if framework is vite, but check anyway
      }
    }

    return issues;
  }
}
