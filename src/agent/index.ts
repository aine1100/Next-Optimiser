/**
 * Next Optimize Real-time Agent
 * This script is injected into the client-side application to capture
 * performance metrics and send them to the local dev server.
 */

class NextOptimizeAgent {
  private ws: WebSocket | null = null;
  private serverUrl: string;

  constructor(port: number = 3005) {
    this.serverUrl = `ws://localhost:${port}`;
    this.init();
  }

  private init() {
    this.connect();
    this.setupInterceptors();
    this.setupPerformanceObserver();
    this.setupMemoryMonitoring();
  }

  private connect() {
    this.ws = new WebSocket(this.serverUrl);
    this.ws.onopen = () => console.log('[Next-Optimize] Connected to monitoring server');
    this.ws.onclose = () => {
      // Reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    };
  }

  private send(type: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type,
        data,
        timestamp: new Date().toISOString()
      }));
    }
  }

  private setupInterceptors() {
    // Intercept Fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        this.send('api', {
          url: typeof args[0] === 'string' ? args[0] : (args[0] as Request).url,
          duration,
          status: response.status,
          method: args[1]?.method || 'GET'
        });
        return response;
      } catch (error) {
        const duration = performance.now() - start;
        this.send('api', {
          url: typeof args[0] === 'string' ? args[0] : (args[0] as Request).url,
          duration,
          status: 'error',
          error: (error as Error).message
        });
        throw error;
      }
    };
  }

  private setupPerformanceObserver() {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'longtask') {
            this.send('event', {
              name: 'long-task',
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            this.send('event', {
              name: 'cls',
              value: (entry as any).value,
              startTime: entry.startTime,
            });
          }
          if (entry.entryType === 'largest-contentful-paint') {
            this.send('event', {
              name: 'lcp',
              duration: entry.startTime,
              size: (entry as any).size,
            });
          }
          if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
            this.send('event', {
              name: 'fcp',
              duration: entry.startTime,
            });
          }
        });
      });
      observer.observe({ entryTypes: ['longtask', 'layout-shift', 'paint', 'largest-contentful-paint'] });
    } catch (_e) {
      // Browser support check
    }
  }

  private setupMemoryMonitoring() {
    // Check memory every 10 seconds if supported
    setInterval(() => {
      if ((performance as any).memory) {
        const mem = (performance as any).memory;
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
  public traceRender(componentName: string, duration: number) {
    this.send('render', {
      component: componentName,
      duration
    });
  }
}

// Initialize on window
(window as any).nextOptimizeAgent = new NextOptimizeAgent();
