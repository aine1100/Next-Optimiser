import { Issue, Recommendation } from '../types/index.js';

/**
 * Generates actionable performance recommendations from detected issues.
 */
export class Recommender {
  /**
   * Evaluates detected issues and outputs prioritized recommendations.
   * @param issues A collection of issues found across all categories.
   */
  public static generate(issues: Issue[]): Recommendation[] {
    // Collect all unique recommendations from issues
    const recommendations: Recommendation[] = [];
    const seenActions = new Set<string>();

    for (const issue of issues) {
      if (issue.suggestion && !seenActions.has(issue.suggestion)) {
        recommendations.push({
          issueId: issue.id,
          action: issue.suggestion,
          effort: this.getEffort(issue.severity),
          impact: this.getImpact(issue.severity),
        });
        seenActions.add(issue.suggestion);
      }
    }

    // Sort by impact (high first) then effort (low first)
    return recommendations.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      const effortOrder = { low: 3, medium: 2, high: 1 };
      
      const diffImpact = impactOrder[b.impact] - impactOrder[a.impact];
      if (diffImpact !== 0) return diffImpact;
      
      return effortOrder[b.effort] - effortOrder[a.effort];
    });
  }

  private static getEffort(severity: Issue['severity']): Recommendation['effort'] {
    switch (severity) {
      case 'critical': return 'high';
      case 'high': return 'medium';
      default: return 'low';
    }
  }

  private static getImpact(severity: Issue['severity']): Recommendation['impact'] {
    switch (severity) {
      case 'critical':
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }
}
