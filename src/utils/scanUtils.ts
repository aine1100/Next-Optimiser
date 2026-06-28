import { Config } from '../types/index.js';
import { findFiles } from './fileUtils.js';

export const SOURCE_DIRS = ['src', 'app', 'pages', 'components'] as const;

export const SOURCE_GLOB_PATTERNS = SOURCE_DIRS.map(
  (dir) => `${dir}/**/*.{ts,tsx,js,jsx}`
);

/**
 * Builds glob ignore patterns from config.ignoredPaths.
 */
export function getIgnoreGlobs(config: Config): string[] {
  return config.ignoredPaths.map((p) => `${p}/**`);
}

/**
 * Discovers React/Next source files across common directory layouts.
 */
export async function findSourceFiles(
  rootPath: string,
  config: Config
): Promise<string[]> {
  const ignore = getIgnoreGlobs(config);
  const files = new Set<string>();

  for (const pattern of SOURCE_GLOB_PATTERNS) {
    const found = await findFiles(pattern, rootPath, ignore);
    found.forEach((f) => files.add(f));
  }

  return [...files];
}
