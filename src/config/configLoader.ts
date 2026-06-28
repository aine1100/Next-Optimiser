import path from 'path';
import fs from 'fs-extra';
import { Config } from '../types/index.js';
import { DEFAULT_THRESHOLDS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

export const DEFAULT_CONFIG: Config = {
  bundleSizeWarning: DEFAULT_THRESHOLDS.BUNDLE_SIZE_WARNING,
  bundleSizeCritical: DEFAULT_THRESHOLDS.BUNDLE_SIZE_CRITICAL,
  componentLocLimit: DEFAULT_THRESHOLDS.COMPONENT_LOC_LIMIT,
  hookCountLimit: DEFAULT_THRESHOLDS.HOOK_COUNT_LIMIT,
  imageSizeLimit: DEFAULT_THRESHOLDS.IMAGE_SIZE_LIMIT,
  propDrillLimit: DEFAULT_THRESHOLDS.PROP_DRILL_LIMIT,
  ignoredPaths: ['node_modules', '.next', 'dist', 'build', '.git'],
  plugins: [],
  outputFormats: ['console', 'html'],
};

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: Config = DEFAULT_CONFIG;

  private constructor() {}

  public static getInstance(): ConfigLoader {
    if (!this.instance) {
      this.instance = new ConfigLoader();
    }
    return this.instance;
  }

  public async load(projectRoot: string): Promise<Config> {
    const configPaths = [
      path.join(projectRoot, 'next-optimize.config.ts'),
      path.join(projectRoot, 'next-optimize.config.js'),
      path.join(projectRoot, 'next-optimize.config.mjs'),
      path.join(projectRoot, 'next-optimize.config.json'),
    ];

    for (const configPath of configPaths) {
      if (await fs.pathExists(configPath)) {
        try {
          let loadedConfig: Partial<Config> = {};
          
          if (configPath.endsWith('.json')) {
            loadedConfig = await fs.readJson(configPath);
          } else {
            // For .ts/.js/.mjs we might need dynamic import
            // Note: In ESM, we can't easily import .ts without a loader
            // For now, let's stick to basic loading or JSDoc JS
            const module = await import(`file://${configPath}`);
            loadedConfig = module.default || module;
          }

          this.config = { ...DEFAULT_CONFIG, ...loadedConfig };
          logger.debug(`Loaded config from ${configPath}`);
          return this.config;
        } catch (error) {
          logger.warn(`Failed to load config from ${configPath}: ${error}`);
        }
      }
    }

    logger.debug('Using default configuration');
    return this.config;
  }

  public getConfig(): Config {
    return this.config;
  }
}

export const configLoader = ConfigLoader.getInstance();
