import { AnalysisResult, Issue } from '../types/index.js';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';

interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note';
  message: { text: string };
  locations?: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region?: { startLine?: number; startColumn?: number };
    };
  }>;
}

/**
 * Generates SARIF 2.1.0 output for GitHub Code Scanning integration.
 */
export class SarifReporter {
  public static async report(result: AnalysisResult, outputPath?: string) {
    const finalPath = outputPath || path.join(result.project.rootPath, 'next-optimize-results.sarif');

    const sarifResults: SarifResult[] = result.issues.map((issue) => ({
      ruleId: issue.id,
      level: this.severityToLevel(issue.severity),
      message: { text: `${issue.title}: ${issue.description}${issue.suggestion ? ` Suggestion: ${issue.suggestion}` : ''}` },
      locations: issue.file
        ? [
            {
              physicalLocation: {
                artifactLocation: { uri: issue.file },
                region: issue.line ? { startLine: issue.line, startColumn: issue.column } : undefined,
              },
            },
          ]
        : undefined,
    }));

    const sarif = {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'next-optimize',
              version: '1.0.0',
              informationUri: 'https://github.com/next-optimize/next-optimize',
              rules: this.buildRules(result.issues),
            },
          },
          results: sarifResults,
        },
      ],
    };

    try {
      await fs.writeJson(finalPath, sarif, { spaces: 2 });
      logger.info(`SARIF report generated at: ${finalPath}`);
    } catch (error) {
      logger.error('Failed to generate SARIF report:', error);
    }
  }

  private static severityToLevel(severity: Issue['severity']): SarifResult['level'] {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'note';
    }
  }

  private static buildRules(issues: Issue[]) {
    const seen = new Set<string>();
    const rules: Array<{ id: string; name: string; shortDescription: { text: string } }> = [];

    for (const issue of issues) {
      if (seen.has(issue.id)) continue;
      seen.add(issue.id);
      rules.push({
        id: issue.id,
        name: issue.title,
        shortDescription: { text: issue.description },
      });
    }

    return rules;
  }
}
