import fs from 'fs-extra';
import { glob } from 'glob';
import path from 'path';

export const findFiles = async (pattern: string, cwd: string, ignore: string[] = []) => {
  return glob(pattern, { cwd, ignore, absolute: true });
};

export const readJsonSafe = async <T>(filePath: string): Promise<T | null> => {
  try {
    if (await fs.pathExists(filePath)) {
      return await fs.readJson(filePath);
    }
  } catch (error) {
    // Silently fail or log to debug
  }
  return null;
};

export const getFileSize = async (filePath: string): Promise<number> => {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
};

export const resolveProjectRoot = async (startDir: string): Promise<string> => {
  let current = startDir;
  while (current !== path.parse(current).root) {
    if (await fs.pathExists(path.join(current, 'package.json'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return startDir;
};

export const formatSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};
