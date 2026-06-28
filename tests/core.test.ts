import { describe, it, expect } from 'vitest';
import { Scorer } from '../src/core/scorer.js';
import { Recommender } from '../src/core/recommender.js';
import { Issue } from '../src/types/index.js';

describe('Scorer', () => {
  it('returns perfect score when no issues', () => {
    const score = Scorer.calculate([]);
    expect(score.overall).toBe(100);
    expect(score.categories.bundle).toBe(100);
  });

  it('deducts points by severity', () => {
    const issues: Issue[] = [
      {
        id: 'test-high',
        title: 'High issue',
        description: 'test',
        severity: 'high',
        category: 'bundle',
        suggestion: 'Fix it',
      },
    ];
    const score = Scorer.calculate(issues);
    expect(score.categories.bundle).toBe(75);
    expect(score.overall).toBeLessThan(100);
  });
});

describe('Recommender', () => {
  it('sorts by impact then effort', () => {
    const issues: Issue[] = [
      {
        id: 'a',
        title: 'Low',
        description: 'd',
        severity: 'low',
        category: 'api',
        suggestion: 'low impact fix',
      },
      {
        id: 'b',
        title: 'Critical',
        description: 'd',
        severity: 'critical',
        category: 'bundle',
        suggestion: 'critical fix',
      },
    ];

    const recs = Recommender.generate(issues);
    expect(recs[0].action).toBe('critical fix');
    expect(recs[0].impact).toBe('high');
  });

  it('deduplicates suggestions', () => {
    const issues: Issue[] = [
      {
        id: 'a',
        title: 'A',
        description: 'd',
        severity: 'medium',
        category: 'render',
        suggestion: 'same fix',
      },
      {
        id: 'b',
        title: 'B',
        description: 'd',
        severity: 'medium',
        category: 'render',
        suggestion: 'same fix',
      },
    ];

    const recs = Recommender.generate(issues);
    expect(recs).toHaveLength(1);
  });
});
