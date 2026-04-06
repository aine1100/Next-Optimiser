export class Recommender {
    static generate(issues) {
        // Collect all unique recommendations from issues
        const recommendations = [];
        const seenActions = new Set();
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
            if (diffImpact !== 0)
                return diffImpact;
            return effortOrder[b.effort] - effortOrder[a.effort];
        });
    }
    static getEffort(severity) {
        switch (severity) {
            case 'critical': return 'high';
            case 'high': return 'medium';
            default: return 'low';
        }
    }
    static getImpact(severity) {
        switch (severity) {
            case 'critical':
            case 'high': return 'high';
            case 'medium': return 'medium';
            default: return 'low';
        }
    }
}
