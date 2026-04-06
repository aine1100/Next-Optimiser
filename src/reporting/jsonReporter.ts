import { AnalysisResult } from '../types/index.js';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';

export class JsonReporter {
  public static async report(result: AnalysisResult, outputPath?: string) {
    const finalPath = outputPath || path.join(result.project.rootPath, 'next-optimize-report.json');
    
    try {
      await fs.writeJson(finalPath, result, { spaces: 2 });
      logger.info(`JSON report generated at: ${finalPath}`);
    } catch (error) {
      logger.error('Failed to generate JSON report:', error);
    }
  }
}
