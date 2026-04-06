import { AnalysisResult, Issue, PerformanceScore } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { SCORING_CATEGORIES } from '../utils/constants.js';
import chalk from 'chalk';

export class ConsoleReporter {
  public static report(result: AnalysisResult) {
    logger.header('Performance Report Summary');
    
    // Project Info
    logger.info(`Project: ${chalk.bold(result.project.framework)} (${result.project.version || 'unknown'})`);
    logger.info(`Build Tool: ${result.project.buildTool}`);
    logger.info(`Package Manager: ${result.project.packageManager}`);
    console.log();

    // Performance Score
    this.reportScore(result.score);
    console.log();

    // Issues by Severity
    this.reportIssues(result.issues);
    console.log();

    // Recommendations
    this.reportRecommendations(result.recommendations);
    console.log();

    logger.success(`Analysis finished at ${new Date(result.timestamp).toLocaleString()}`);
  }

  private static reportScore(score: PerformanceScore) {
    const category = this.getScoreCategory(score.overall);
    const colorFn = category.color === 'green' ? chalk.green : 
                    category.color === 'blue' ? chalk.blue :
                    category.color === 'yellow' ? chalk.yellow : chalk.red;

    console.log(chalk.bold('OVERALL PERFORMANCE SCORE:'), colorFn(`${score.overall}/100 - ${category.label}`));
    
    // Category Breakdown
    const categories = Object.entries(score.categories);
    const mid = Math.ceil(categories.length / 2);
    
    for (let i = 0; i < mid; i++) {
        const [cat1, val1] = categories[i];
        const [cat2, val2] = categories[i + mid] || ['', 0];
        
        let line = `  ${cat1.padEnd(12)}: ${this.colorValue(val1).padStart(15)}`;
        if (cat2) {
            line += `    ${cat2.padEnd(12)}: ${this.colorValue(val2).padStart(15)}`;
        }
        console.log(line);
    }
  }

  private static getScoreCategory(score: number) {
    if (score >= SCORING_CATEGORIES.EXCELLENT.min) return SCORING_CATEGORIES.EXCELLENT;
    if (score >= SCORING_CATEGORIES.GOOD.min) return SCORING_CATEGORIES.GOOD;
    if (score >= SCORING_CATEGORIES.NEEDS_OPTIMIZATION.min) return SCORING_CATEGORIES.NEEDS_OPTIMIZATION;
    return SCORING_CATEGORIES.CRITICAL;
  }

  private static colorValue(value: number): string {
    if (value >= 90) return chalk.green(value);
    if (value >= 70) return chalk.blue(value);
    if (value >= 50) return chalk.yellow(value);
    return chalk.red(value);
  }

  private static reportIssues(issues: Issue[]) {
    if (issues.length === 0) {
      logger.success('No performance issues detected! Your project is in great shape.');
      return;
    }

    const critical = issues.filter(i => i.severity === 'critical');
    const high = issues.filter(i => i.severity === 'high');
    const others = issues.filter(i => !['critical', 'high'].includes(i.severity));

    if (critical.length > 0) {
      console.log(chalk.red.bold(`CRITICAL ISSUES (${critical.length}):`));
      critical.forEach(i => this.printIssue(i));
    }

    if (high.length > 0) {
      console.log(chalk.yellow.bold(`HIGH SEVERITY ISSUES (${high.length}):`));
      high.forEach(i => this.printIssue(i));
    }

    if (others.length > 0 && logger['isVerbose']) {
        console.log(chalk.blue.bold(`OTHER ISSUES (${others.length}):`));
        others.forEach(i => this.printIssue(i));
    }
  }

  private static printIssue(issue: Issue) {
    const symbol = issue.severity === 'critical' ? '✖' : '⚠';
    const color = issue.severity === 'critical' ? chalk.red : chalk.yellow;
    
    console.log(`  ${color(symbol)} ${chalk.bold(issue.title)}`);
    console.log(`    ${chalk.gray(issue.description)}`);
    if (issue.file) {
      console.log(`    ${chalk.cyan('Location:')} ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
    }
  }

  private static reportRecommendations(recommendations: any[]) {
      if (recommendations.length === 0) return;
      
      console.log(chalk.bold.underline('TOP OPTIMIZATION RECOMMENDATIONS:'));
      recommendations.slice(0, 5).forEach((rec, idx) => {
          const impactColor = rec.impact === 'high' ? chalk.green : chalk.yellow;
          console.log(`${idx + 1}. ${chalk.white(rec.action)}`);
          console.log(`   ${chalk.gray('Impact:')} ${impactColor(rec.impact.toUpperCase())}  ${chalk.gray('Effort:')} ${rec.effort.toUpperCase()}`);
      });
  }
}
