import { AnalysisResult, Issue, PerformanceScore, Recommendation } from '../types/index.js';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';

export class HtmlReporter {
  public static async report(result: AnalysisResult, outputPath?: string) {
    const finalPath = outputPath || path.join(result.project.rootPath, 'next-optimize-report.html');
    const html = this.generateHtml(result);
    
    try {
      await fs.writeFile(finalPath, html);
      logger.info(`HTML report generated at: ${finalPath}`);
    } catch (error) {
      logger.error('Failed to generate HTML report:', error);
    }
  }

  private static generateHtml(result: AnalysisResult): string {
    const date = new Date(result.timestamp).toLocaleString();
    const scoreVal = result.score.overall;
    const scoreColor = scoreVal >= 90 ? '#10b981' : scoreVal >= 70 ? '#3b82f6' : scoreVal >= 50 ? '#f59e0b' : '#ef4444';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Next Optimize Report - ${result.project.framework}</title>
    <style>
        :root {
            --bg: #0f172a;
            --card-bg: #1e293b;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --primary: #3b82f6;
            --success: #10b981;
            --warning: #f59e0b;
            --error: #ef4444;
            --border: #334155;
        }
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 2rem;
            line-height: 1.5;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border);
        }
        .score-gauge {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            font-weight: bold;
            border: 8px solid ${scoreColor};
            color: ${scoreColor};
            box-shadow: 0 0 20px ${scoreColor}22;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .card {
            background: var(--card-bg);
            border-radius: 0.75rem;
            padding: 1.5rem;
            border: 1px solid var(--border);
        }
        .card h3 { margin: 0 0 0.5rem 0; font-size: 0.875rem; color: var(--text-muted); text-transform: uppercase; }
        .card p { margin: 0; font-size: 1.25rem; font-weight: 600; }
        .score-list { margin: 0; padding: 0; list-style: none; }
        .score-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid var(--border);
        }
        .issue-card {
            margin-bottom: 1rem;
            border-left: 4px solid var(--primary);
        }
        .issue-card.critical { border-left-color: var(--error); }
        .issue-card.high { border-left-color: var(--warning); }
        .severity {
            font-size: 0.75rem;
            text-transform: uppercase;
            font-weight: bold;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            margin-right: 0.5rem;
        }
        .sev-critical { background: var(--error)22; color: var(--error); }
        .sev-high { background: var(--warning)22; color: var(--warning); }
        .recommendation {
            background: var(--primary)11;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            border: 1px solid var(--primary)33;
        }
        footer {
            margin-top: 4rem;
            text-align: center;
            color: var(--text-muted);
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1>Next Optimize Report</h1>
                <p style="color: var(--text-muted)">Generated on ${date}</p>
            </div>
            <div class="score-gauge">${scoreVal}</div>
        </header>

        <div class="summary-grid">
            <div class="card">
                <h3>Framework</h3>
                <p>${result.project.framework.toUpperCase()} ${result.project.version || ''}</p>
            </div>
            <div class="card">
                <h3>Build Tool</h3>
                <p>${result.project.buildTool.toUpperCase()}</p>
            </div>
            <div class="card">
                <h3>Issues Found</h3>
                <p>${result.issues.length}</p>
            </div>
            <div class="card">
                <h3>Package Manager</h3>
                <p>${result.project.packageManager}</p>
            </div>
        </div>

        <section>
            <h2>Analysis Summary</h2>
            <div class="card">
                <div class="summary-grid">
                    <div>
                        <h3>Category Scores</h3>
                        <ul class="score-list">
                            ${Object.entries(result.score.categories).map(([cat, val]) => `
                                <li class="score-item">
                                    <span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                                    <span style="color: ${val >= 90 ? 'var(--success)' : val >= 70 ? 'var(--primary)' : 'var(--warning)'}">${val}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <div style="grid-column: span 2;">
                        <h3>Top Recommendations</h3>
                        ${result.recommendations.slice(0, 3).map(rec => `
                            <div class="recommendation">
                                <strong>${rec.action}</strong><br>
                                <small style="color: var(--text-muted)">Impact: ${rec.impact.toUpperCase()} | Effort: ${rec.effort.toUpperCase()}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </section>

        <section style="margin-top: 2rem;">
            <h2>Detected Issues</h2>
            ${result.issues.length === 0 ? '<p>No issues detected! 🎉</p>' : result.issues.map(issue => `
                <div class="card issue-card ${issue.severity}">
                    <div style="display: flex; align-items: flex-start; justify-content: space-between;">
                        <div>
                            <span class="severity sev-${issue.severity}">${issue.severity}</span>
                            <strong style="font-size: 1.1rem;">${issue.title}</strong>
                        </div>
                        <span style="color: var(--text-muted); font-size: 0.8rem;">${issue.category.toUpperCase()}</span>
                    </div>
                    <p style="margin: 1rem 0; color: var(--text-muted); font-size: 1rem;">${issue.description}</p>
                    ${issue.file ? `<div style="font-family: monospace; font-size: 0.875rem; color: var(--primary);">Location: ${issue.file}${issue.line ? `:${issue.line}` : ''}</div>` : ''}
                    ${issue.suggestion ? `<div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border); font-size: 0.875rem; color: var(--success);">Tip: ${issue.suggestion}</div>` : ''}
                </div>
            `).join('')}
        </section>

        <footer>
            Generated by Next Optimize CLI v1.0.0
        </footer>
    </div>
</body>
</html>
    `;
  }
}
