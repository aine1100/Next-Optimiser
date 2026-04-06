/**
 * Next Optimize Real-time Agent
 * This script is injected into the client-side application to capture
 * performance metrics and send them to the local dev server.
 */
class NextOptimizeAgent {
    ws = null;
    serverUrl;
    constructor(port = 3005) {
        this.serverUrl = `ws://localhost:${port}`;
        this.init();
    }
    init() {
        this.connect();
        this.setupInterceptors();
        this.setupPerformanceObserver();
        this.setupMemoryMonitoring();
    }
    connect() {
        this.ws = new WebSocket(this.serverUrl);
        this.ws.onopen = () => console.log('[Next-Optimize] Connected to monitoring server');
        this.ws.onclose = () => {
            // Reconnect after 5 seconds
            setTimeout(() => this.connect(), 5000);
        };
    }
    send(type, data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type,
                data,
                timestamp: new Date().toISOString()
            }));
        }
    }
    setupInterceptors() {
        // Intercept Fetch
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const start = performance.now();
            try {
                const response = await originalFetch(...args);
                const duration = performance.now() - start;
                this.send('api', {
                    url: typeof args[0] === 'string' ? args[0] : args[0].url,
                    duration,
                    status: response.status,
                    method: args[1]?.method || 'GET'
                });
                return response;
            }
            catch (error) {
                const duration = performance.now() - start;
                this.send('api', {
                    url: typeof args[0] === 'string' ? args[0] : args[0].url,
                    duration,
                    status: 'error',
                    error: error.message
                });
                throw error;
            }
        };
    }
    setupPerformanceObserver() {
        // Observe Layout Shifts, Long Tasks, and Paints
        try {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.entryType === 'longtask') {
                        this.send('event', {
                            name: 'long-task',
                            duration: entry.duration,
                            startTime: entry.startTime
                        });
                    }
                });
            });
            observer.observe({ entryTypes: ['longtask', 'layout-shift', 'paint', 'largest-contentful-paint'] });
        }
        catch (e) {
            // Browser support check
        }
    }
    setupMemoryMonitoring() {
        // Check memory every 10 seconds if supported
        setInterval(() => {
            if (performance.memory) {
                const mem = performance.memory;
                this.send('memory', {
                    heapLimit: mem.jsHeapSizeLimit,
                    heapTotal: mem.totalJSHeapSize,
                    heapUsed: mem.usedJSHeapSize
                });
            }
        }, 10000);
    }
    /**
     * Helper to wrap React components for render timing
     */
    traceRender(componentName, duration) {
        this.send('render', {
            component: componentName,
            duration
        });
    }
}
// Initialize on window
window.nextOptimizeAgent = new NextOptimizeAgent();
export {};
