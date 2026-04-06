import { PluginInterface, Config, ProjectInfo, Issue } from '../types/index.js';
import { logger } from '../utils/logger.js';
import path from 'path';

export class PluginManager {
  private plugins: PluginInterface[] = [];
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  public async loadPlugins() {
    for (const pluginName of this.config.plugins) {
      try {
        const pluginPath = pluginName.startsWith('.') 
            ? path.resolve(process.cwd(), pluginName)
            : pluginName;
            
        const module = await import(pluginPath);
        const plugin: PluginInterface = module.default || module;
        
        await plugin.initialize(this.config);
        this.plugins.push(plugin);
        logger.info(`Loaded plugin: ${plugin.name} v${plugin.version}`);
      } catch (error) {
        logger.error(`Failed to load plugin "${pluginName}":`, error);
      }
    }
  }

  public async runPlugins(project: ProjectInfo): Promise<Issue[]> {
    const allIssues: Issue[] = [];
    for (const plugin of this.plugins) {
      try {
        const issues = await plugin.analyze(project);
        allIssues.push(...issues);
      } catch (error) {
        logger.error(`Error in plugin "${plugin.name}":`, error);
      }
    }
    return allIssues;
  }

  public getPlugins(): PluginInterface[] {
    return this.plugins;
  }
}
