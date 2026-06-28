import path from 'path';
import fs from 'fs-extra';
import { AnalysisEngine } from '../../core/analyzer.js';
import { Issue, ProjectInfo } from '../../types/index.js';
import { readJsonSafe } from '../../utils/fileUtils.js';

export interface WorkspacePackage {
  name: string;
  path: string;
}

/**
 * Detects monorepo workspaces and flags cross-package performance issues.
 */
export class MonorepoAnalyzer extends AnalysisEngine {
  public name = 'Monorepo';

  public isApplicable(_project: ProjectInfo): boolean {
    return true;
  }

  public async analyze(project: ProjectInfo): Promise<Issue[]> {
    const issues: Issue[] = [];
    const packages = await this.detectWorkspaces(project.rootPath);

    if (packages.length <= 1) return issues;

    issues.push(
      this.createIssue(
        'monorepo-detected',
        'Monorepo Detected',
        `Found ${packages.length} workspace packages. Consider per-package analysis for accurate scoring.`,
        'info',
        'build',
        undefined,
        undefined,
        'Run next-optimize analyze in each package directory or use --workspace flag.'
      )
    );

    const depVersions = new Map<string, Set<string>>();

    for (const pkg of packages) {
      const packageJson = await readJsonSafe<any>(path.join(pkg.path, 'package.json'));
      if (!packageJson) continue;

      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      for (const [name, version] of Object.entries(deps)) {
        if (!depVersions.has(name)) depVersions.set(name, new Set());
        depVersions.get(name)!.add(version as string);
      }

      const hasBuild = !!packageJson.scripts?.build;
      if (!hasBuild && packageJson.dependencies?.react) {
        issues.push(
          this.createIssue(
            `no-build-${pkg.name}`,
            `Missing Build Script: ${pkg.name}`,
            `Workspace package "${pkg.name}" has React but no build script.`,
            'medium',
            'build',
            path.join(pkg.path, 'package.json'),
            undefined,
            'Add a build script for production optimization.'
          )
        );
      }
    }

    for (const [depName, versions] of depVersions) {
      if (versions.size > 1) {
        issues.push(
          this.createIssue(
            `duplicate-version-${depName}`,
            `Duplicate Dependency Versions: ${depName}`,
            `"${depName}" has ${versions.size} different versions across workspace packages: ${[...versions].join(', ')}.`,
            'high',
            'dependency',
            undefined,
            undefined,
            'Align dependency versions across workspace packages to reduce bundle duplication.'
          )
        );
      }
    }

    return issues;
  }

  public async detectWorkspaces(rootPath: string): Promise<WorkspacePackage[]> {
    const packages: WorkspacePackage[] = [];

    const rootPkg = await readJsonSafe<any>(path.join(rootPath, 'package.json'));
    if (rootPkg?.workspaces) {
      const patterns: string[] = Array.isArray(rootPkg.workspaces)
        ? rootPkg.workspaces
        : rootPkg.workspaces.packages || [];

      for (const pattern of patterns) {
        const globPattern = pattern.replace('/*', '');
        const workspaceDir = path.join(rootPath, globPattern);
        if (await fs.pathExists(workspaceDir)) {
          const entries = await fs.readdir(workspaceDir);
          for (const entry of entries) {
            const pkgPath = path.join(workspaceDir, entry);
            const pkgJson = path.join(pkgPath, 'package.json');
            if (await fs.pathExists(pkgJson)) {
              const pkg = await readJsonSafe<any>(pkgJson);
              packages.push({ name: pkg?.name || entry, path: pkgPath });
            }
          }
        }
      }
    }

    if (await fs.pathExists(path.join(rootPath, 'pnpm-workspace.yaml'))) {
      const content = await fs.readFile(path.join(rootPath, 'pnpm-workspace.yaml'), 'utf8');
      const dirMatches = content.match(/['"]?packages['"]?\s*:\s*\n((?:\s+-\s+.+\n?)+)/);
      if (dirMatches) {
        const lines = dirMatches[1].match(/-\s+['"]?([^'"\n]+)['"]?/g) || [];
        for (const line of lines) {
          const pattern = line.replace(/^-\s+['"]?/, '').replace(/['"]$/, '');
          const baseDir = pattern.replace('/*', '').replace('/\*', '');
          const workspaceDir = path.join(rootPath, baseDir);
          if (await fs.pathExists(workspaceDir)) {
            const entries = await fs.readdir(workspaceDir);
            for (const entry of entries) {
              const pkgPath = path.join(workspaceDir, entry);
              if (await fs.pathExists(path.join(pkgPath, 'package.json'))) {
                const pkg = await readJsonSafe<any>(path.join(pkgPath, 'package.json'));
                if (!packages.some((p) => p.path === pkgPath)) {
                  packages.push({ name: pkg?.name || entry, path: pkgPath });
                }
              }
            }
          }
        }
      }
    }

    if (packages.length === 0) {
      const rootPackageJson = await readJsonSafe<any>(path.join(rootPath, 'package.json'));
      if (rootPackageJson) {
        packages.push({ name: rootPackageJson.name || 'root', path: rootPath });
      }
    }

    return packages;
  }
}
