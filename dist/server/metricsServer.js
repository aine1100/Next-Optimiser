import { WebSocketServer } from 'ws';
import { logger } from '../utils/logger.js';
export class MetricsServer {
    wss = null;
    port;
    clients = new Set();
    constructor(port = 3005) {
        this.port = port;
    }
    start() {
        this.wss = new WebSocketServer({ port: this.port });
        logger.info(`Real-time Metrics Server started on ws://localhost:${this.port}`);
        this.wss.on('connection', (ws) => {
            logger.debug('Agent connected to metrics server');
            this.clients.add(ws);
            ws.on('message', (message) => {
                try {
                    const entry = JSON.parse(message.toString());
                    this.handleMetric(entry);
                }
                catch (e) {
                    logger.error('Failed to parse metric from agent', e);
                }
            });
            ws.on('close', () => {
                this.clients.delete(ws);
                logger.debug('Agent disconnected');
            });
        });
    }
    handleMetric(entry) {
        // Log real-time metrics to terminal in a condensed format
        switch (entry.type) {
            case 'render':
                if (entry.data.duration > 16) { // > 1 frame
                    logger.warn(`[Runtime] Slow Render: <${entry.data.component}> took ${entry.data.duration.toFixed(2)}ms`);
                }
                break;
            case 'api':
                logger.info(`[Runtime] API Call: ${entry.data.url} - ${entry.data.duration.toFixed(0)}ms (${entry.data.status})`);
                break;
            case 'memory':
                const heapMb = (entry.data.heapUsed / 1024 / 1024).toFixed(2);
                logger.debug(`[Runtime] Heap Usage: ${heapMb} MB`);
                break;
        }
    }
    stop() {
        this.wss?.close();
    }
}
