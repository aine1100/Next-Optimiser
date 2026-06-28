import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger.js';
import { metricsStore, MetricEntry } from './metricsStore.js';

export type { MetricEntry } from './metricsStore.js';

export class MetricsServer {
  private wss: WebSocketServer | null = null;
  private port: number;
  private clients: Set<WebSocket> = new Set();

  constructor(port: number = 3005) {
    this.port = port;
  }

  public start() {
    this.wss = new WebSocketServer({ port: this.port });

    logger.info(`Real-time Metrics Server started on ws://localhost:${this.port}`);

    this.wss.on('connection', (ws) => {
      logger.debug('Agent connected to metrics server');
      this.clients.add(ws);

      ws.on('message', (message) => {
        try {
          const entry: MetricEntry = JSON.parse(message.toString());
          metricsStore.add(entry);
          this.handleMetric(entry);
        } catch (e) {
          logger.error('Failed to parse metric from agent', e);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        logger.debug('Agent disconnected');
      });
    });
  }

  private handleMetric(entry: MetricEntry) {
    switch (entry.type) {
      case 'render':
        if ((entry.data.duration as number) > 16) {
          logger.warn(
            `[Runtime] Slow Render: <${entry.data.component}> took ${(entry.data.duration as number).toFixed(2)}ms`
          );
        }
        break;
      case 'api':
        logger.info(
          `[Runtime] API Call: ${entry.data.url} - ${(entry.data.duration as number).toFixed(0)}ms (${entry.data.status})`
        );
        break;
      case 'memory': {
        const heapMb = ((entry.data.heapUsed as number) / 1024 / 1024).toFixed(2);
        logger.debug(`[Runtime] Heap Usage: ${heapMb} MB`);
        break;
      }
      case 'event':
        if (entry.data.name === 'long-task') {
          logger.warn(`[Runtime] Long Task: ${(entry.data.duration as number).toFixed(0)}ms`);
        }
        break;
    }
  }

  public stop() {
    this.wss?.close();
  }
}
