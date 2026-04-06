import path from 'path';
import fs from 'fs-extra';
import { readJsonSafe } from '../utils/fileUtils.js';
export class Detector {
    static async detect(projectRoot) {
        const packageJson = await readJsonSafe(path.join(projectRoot, 'package.json'));
        if (!packageJson) {
            return {
                framework: 'unknown',
                buildTool: 'unknown',
                packageManager: 'unknown',
                nodeVersion: process.version,
                rootPath: projectRoot,
            };
        }
        const dependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
        };
        const projectInfo = {
            framework: 'unknown',
            buildTool: 'unknown',
            packageManager: await this.detectPackageManager(projectRoot),
            nodeVersion: process.version,
            rootPath: projectRoot,
        };
        // Detect Framework
        if (dependencies['next']) {
            projectInfo.framework = 'next';
            projectInfo.version = dependencies['next'];
        }
        else if (dependencies['@remix-run/react']) {
            projectInfo.framework = 'remix';
        }
        else if (dependencies['vite'] && dependencies['react']) {
            projectInfo.framework = 'vite';
        }
        else if (dependencies['react']) {
            projectInfo.framework = 'react';
        }
        else if (dependencies['express']) {
            projectInfo.framework = 'express';
        }
        // Detect Build Tool
        if (await fs.pathExists(path.join(projectRoot, 'next.config.js')) || await fs.pathExists(path.join(projectRoot, 'next.config.mjs'))) {
            // Next.js uses Webpack (default) or Turbopack
            projectInfo.buildTool = packageJson.scripts?.dev?.includes('--turbo') ? 'turbopack' : 'webpack';
        }
        else if (await fs.pathExists(path.join(projectRoot, 'vite.config.ts')) || await fs.pathExists(path.join(projectRoot, 'vite.config.js'))) {
            projectInfo.buildTool = 'vite';
        }
        else if (await fs.pathExists(path.join(projectRoot, 'webpack.config.js'))) {
            projectInfo.buildTool = 'webpack';
        }
        else if (await fs.pathExists(path.join(projectRoot, 'rollup.config.ts')) || await fs.pathExists(path.join(projectRoot, 'rollup.config.js'))) {
            projectInfo.buildTool = 'rollup';
        }
        return projectInfo;
    }
    static async detectPackageManager(projectRoot) {
        if (await fs.pathExists(path.join(projectRoot, 'package-lock.json')))
            return 'npm';
        if (await fs.pathExists(path.join(projectRoot, 'yarn.lock')))
            return 'yarn';
        if (await fs.pathExists(path.join(projectRoot, 'pnpm-lock.yaml')))
            return 'pnpm';
        return 'unknown';
    }
}
