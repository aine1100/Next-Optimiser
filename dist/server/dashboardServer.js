import http from 'http';
import { metricsStore } from './metricsStore.js';
import { logger } from '../utils/logger.js';
/**
 * Serves a live metrics dashboard over HTTP alongside the WebSocket server.
 */
export class DashboardServer {
    port;
    server = null;
    constructor(port = 3006) {
        this.port = port;
    }
    start() {
        this.server = http.createServer((req, res) => {
            if (req.url === '/api/metrics') {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify(metricsStore.getSummary()));
                return;
            }
            if (req.url === '/' || req.url === '/dashboard') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(this.generateDashboardHtml());
                return;
            }
            res.writeHead(404);
            res.end('Not Found');
        });
        this.server.listen(this.port, () => {
            logger.info(`Live dashboard available at http://localhost:${this.port}/dashboard`);
        });
    }
    stop() {
        this.server?.close();
    }
    generateDashboardHtml() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Next Optimize — Live Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
    h1 { margin-bottom: 0.5rem; }
    .subtitle { color: #94a3b8; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
    .card { background: #1e293b; border-radius: 0.75rem; padding: 1.5rem; border: 1px solid #334155; }
    .card h2 { font-size: 0.875rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 1rem; }
    .metric { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #334155; font-size: 0.875rem; }
    .metric:last-child { border-bottom: none; }
    .warn { color: #f59e0b; }
    .ok { color: #10b981; }
    .badge { font-size: 0.75rem; padding: 0.125rem 0.5rem; border-radius: 0.25rem; background: #334155; }
    #status { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; margin-right: 0.5rem; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  </style>
</head>
<body>
  <h1><span id="status"></span>Next Optimize Live Dashboard</h1>
  <p class="subtitle">Auto-refreshes every 3 seconds</p>
  <div class="grid">
    <div class="card"><h2>Slow Renders (&gt;16ms)</h2><div id="renders">Loading...</div></div>
    <div class="card"><h2>API Calls</h2><div id="api">Loading...</div></div>
    <div class="card"><h2>Memory</h2><div id="memory">Loading...</div></div>
    <div class="card"><h2>Performance Events</h2><div id="events">Loading...</div></div>
  </div>
  <script>
    async function refresh() {
      try {
        const res = await fetch('/api/metrics');
        const data = await res.json();
        document.getElementById('renders').innerHTML = data.slowRenders.length
          ? data.slowRenders.slice(-10).reverse().map(r =>
              '<div class="metric"><span>' + r.component + '</span><span class="warn">' + r.duration.toFixed(1) + 'ms</span></div>'
            ).join('')
          : '<div class="metric"><span class="ok">No slow renders</span></div>';
        document.getElementById('api').innerHTML = data.apiCalls.length
          ? data.apiCalls.slice(-10).reverse().map(a =>
              '<div class="metric"><span>' + a.url.slice(0,40) + '</span><span>' + a.duration.toFixed(0) + 'ms</span></div>'
            ).join('')
          : '<div class="metric"><span class="ok">No API calls yet</span></div>';
        const mem = data.memorySnapshots[data.memorySnapshots.length - 1];
        document.getElementById('memory').innerHTML = mem
          ? '<div class="metric"><span>Heap Used</span><span>' + (mem.heapUsed/1024/1024).toFixed(1) + ' MB</span></div>'
            + '<div class="metric"><span>Heap Total</span><span>' + (mem.heapTotal/1024/1024).toFixed(1) + ' MB</span></div>'
          : '<div class="metric"><span class="ok">No memory data</span></div>';
        document.getElementById('events').innerHTML = data.events.length
          ? data.events.slice(-10).reverse().map(e =>
              '<div class="metric"><span>' + e.name + '</span><span>' + (e.duration ? e.duration.toFixed(0) + 'ms' : '-') + '</span></div>'
            ).join('')
          : '<div class="metric"><span class="ok">No events</span></div>';
      } catch (e) {
        document.getElementById('renders').innerHTML = '<div class="metric"><span>Waiting for agent...</span></div>';
      }
    }
    refresh();
    setInterval(refresh, 3000);
  </script>
</body>
</html>`;
    }
}
