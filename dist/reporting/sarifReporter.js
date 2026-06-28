import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
/**
 * Generates SARIF 2.1.0 output for GitHub Code Scanning integration.
 */
export class SarifReporter {
    static async report(result, outputPath) {
        const finalPath = outputPath || path.join(result.project.rootPath, 'next-optimize-results.sarif');
        const sarifResults = result.issues.map((issue) => ({
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
        }
        catch (error) {
            logger.error('Failed to generate SARIF report:', error);
        }
    }
    static severityToLevel(severity) {
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
    static buildRules(issues) {
        const seen = new Set();
        const rules = [];
        for (const issue of issues) {
            if (seen.has(issue.id))
                continue;
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
