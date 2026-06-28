import { describe, it, expect } from 'vitest';
import { PluginInterface, ProjectInfo, Issue } from '../src/types/index.js';
import { PluginManager } from '../src/plugins/pluginManager.js';
import { DEFAULT_CONFIG } from '../src/config/configLoader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('PluginManager', () => {
  it('loads and runs a local plugin', async () => {
    const pluginPath = path.join(__dirname, 'fixtures', 'test-plugin.mjs');
    const config = {
      ...DEFAULT_CONFIG,
      plugins: [pluginPath],
    };

    const manager = new PluginManager(config);
    await manager.loadPlugins();

    expect(manager.getPlugins()).toHaveLength(1);
    expect(manager.getPlugins()[0].name).toBe('test-plugin');

    const project: ProjectInfo = {
      framework: 'next',
      buildTool: 'webpack',
      packageManager: 'npm',
      nodeVersion: 'v20.0.0',
      rootPath: process.cwd(),
    };

    const issues = await manager.runPlugins(project);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('test-plugin-custom-rule');
  });
});
