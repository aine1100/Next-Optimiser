import { PerformanceScore, Issue } from '../types/index.js';
import { WEIGHTS } from '../utils/constants.js';

/**
 * Calculates weighted performance scores for each analysis category.
 */
export class Scorer {
  /**
   * Computes the aggregated performance score based on severity deductions.
   * @param issues A list of performance issues detected across all engines.
   */
  public static calculate(issues: Issue[]): PerformanceScore {
    const catScores: PerformanceScore['categories'] = {
      bundle: 100,
      dependency: 100,
      component: 100,
      render: 100,
      memory: 100,
      image: 100,
      api: 100,
      build: 100,
    };

    for (const issue of issues) {
      const deduction = this.getDeduction(issue.severity);
      catScores[issue.category] = Math.max(0, catScores[issue.category] - deduction);
    }

    let overall = 0;
    const categories = Object.keys(WEIGHTS) as Array<keyof typeof WEIGHTS>;
    for (const cat of categories) {
      overall += catScores[cat] * (WEIGHTS[cat] || 0);
    }

    return {
      overall: Math.round(overall),
      categories: catScores,
    };
  }

  private static getDeduction(severity: Issue['severity']): number {
    switch (severity) {
      case 'critical': return 40;
      case 'high': return 25;
      case 'medium': return 15;
      case 'low': return 5;
      default: return 0;
    }
  }
}
