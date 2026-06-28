/**
 * In-memory circular buffer for runtime telemetry from the browser agent.
 */
export class MetricsStore {
    static instance;
    entries = [];
    maxEntries;
    constructor(maxEntries = 1000) {
        this.maxEntries = maxEntries;
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new MetricsStore();
        }
        return this.instance;
    }
    add(entry) {
        this.entries.push(entry);
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(-this.maxEntries);
        }
    }
    getEntries() {
        return [...this.entries];
    }
    getSummary() {
        const summary = {
            slowRenders: [],
            apiCalls: [],
            memorySnapshots: [],
            events: [],
        };
        for (const entry of this.entries) {
            switch (entry.type) {
                case 'render':
                    if (entry.data.duration > 16) {
                        summary.slowRenders.push({
                            component: entry.data.component,
                            duration: entry.data.duration,
                            timestamp: entry.timestamp,
                        });
                    }
                    break;
                case 'api':
                    summary.apiCalls.push({
                        url: entry.data.url,
                        duration: entry.data.duration,
                        status: entry.data.status,
                        timestamp: entry.timestamp,
                    });
                    break;
                case 'memory':
                    summary.memorySnapshots.push({
                        heapUsed: entry.data.heapUsed,
                        heapTotal: entry.data.heapTotal,
                        timestamp: entry.timestamp,
                    });
                    break;
                case 'event':
                    summary.events.push({
                        name: entry.data.name,
                        duration: entry.data.duration,
                        timestamp: entry.timestamp,
                    });
                    break;
            }
        }
        return summary;
    }
    clear() {
        this.entries = [];
    }
    /**
     * Correlates runtime telemetry with static analysis issues.
     */
    correlateWithIssues(issues) {
        const summary = this.getSummary();
        const correlated = [...issues];
        for (const render of summary.slowRenders) {
            const existing = issues.find((i) => i.category === 'render' && i.file?.includes(render.component));
            if (!existing) {
                correlated.push({
                    id: `runtime-slow-render-${render.component}`,
                    title: `Runtime Slow Render: ${render.component}`,
                    description: `Component "${render.component}" took ${render.duration.toFixed(1)}ms at runtime (>${16}ms frame budget).`,
                    severity: render.duration > 50 ? 'high' : 'medium',
                    category: 'render',
                    suggestion: 'Profile this component with React DevTools and consider memoization or code splitting.',
                });
            }
        }
        for (const api of summary.apiCalls.filter((a) => a.duration > 1000)) {
            correlated.push({
                id: `runtime-slow-api-${api.url.slice(0, 40)}`,
                title: 'Slow API Call Detected at Runtime',
                description: `API call to ${api.url} took ${api.duration.toFixed(0)}ms (>${1000}ms threshold).`,
                severity: api.duration > 3000 ? 'high' : 'medium',
                category: 'api',
                suggestion: 'Add caching, pagination, or optimize the backend endpoint.',
            });
        }
        const latestMemory = summary.memorySnapshots[summary.memorySnapshots.length - 1];
        if (latestMemory && latestMemory.heapUsed > 100 * 1024 * 1024) {
            correlated.push({
                id: 'runtime-high-memory',
                title: 'High Memory Usage at Runtime',
                description: `JS heap usage reached ${(latestMemory.heapUsed / 1024 / 1024).toFixed(1)}MB.`,
                severity: 'high',
                category: 'memory',
                suggestion: 'Check for memory leaks, large closures, or unbounded caches.',
            });
        }
        return correlated;
    }
}
export const metricsStore = MetricsStore.getInstance();
