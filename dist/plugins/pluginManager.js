import { logger } from '../utils/logger.js';
import path from 'path';
export class PluginManager {
    plugins = [];
    config;
    constructor(config) {
        this.config = config;
    }
    async loadPlugins() {
        for (const pluginName of this.config.plugins) {
            try {
                const pluginPath = pluginName.startsWith('.')
                    ? path.resolve(process.cwd(), pluginName)
                    : pluginName;
                const module = await import(pluginPath);
                const plugin = module.default || module;
                await plugin.initialize(this.config);
                this.plugins.push(plugin);
                logger.info(`Loaded plugin: ${plugin.name} v${plugin.version}`);
            }
            catch (error) {
                logger.error(`Failed to load plugin "${pluginName}":`, error);
            }
        }
    }
    async runPlugins(project) {
        const allIssues = [];
        for (const plugin of this.plugins) {
            try {
                const issues = await plugin.analyze(project);
                allIssues.push(...issues);
            }
            catch (error) {
                logger.error(`Error in plugin "${plugin.name}":`, error);
            }
        }
        return allIssues;
    }
    getPlugins() {
        return this.plugins;
    }
}
