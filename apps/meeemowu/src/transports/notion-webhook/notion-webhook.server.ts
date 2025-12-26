import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { createServer, Server as HttpServer, IncomingMessage, ServerResponse } from 'http';

import { NOTION_EVENT_PREFIX } from './notion-event.decorator';
import type {
  NotionVerificationRequest,
  NotionWebhookEvent,
  NotionWebhookOptions,
} from './notion-webhook.types';

export class NotionWebhookServer extends Server implements CustomTransportStrategy {
  private httpServer: HttpServer | null = null;
  private readonly port: number;
  private readonly path: string;

  constructor(options: NotionWebhookOptions = {}) {
    super();
    this.port = options.port ?? 3001;
    this.path = options.path ?? '/notion/webhook';
  }

  listen(callback: () => void): void {
    this.httpServer = createServer((req, res) => this.handleRequest(req, res));
    this.httpServer.listen(this.port, callback);
    this.logger.log(`Notion Webhook server listening on port ${this.port}`);
  }

  close(): void {
    this.httpServer?.close();
  }

  on<EventKey extends string = string, EventCallback extends Function = Function>(
    _event: EventKey,
    _callback: EventCallback,
  ): void {}

  unwrap<T>(): T {
    return this.httpServer as T;
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    if (url.pathname !== this.path) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405);
      res.end('Method Not Allowed');
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      this.processWebhook(body, res);
    });
  }

  private processWebhook(body: string, res: ServerResponse): void {
    try {
      const payload = JSON.parse(body);

      if (this.isVerificationRequest(payload)) {
        this.handleVerification(payload, res);
        return;
      }

      const event = payload as NotionWebhookEvent;

      if (event.verification_token) {
        this.logger.log(`Received verification_token: ${event.verification_token}`);
      }

      const pattern = `${NOTION_EVENT_PREFIX}${event.type}`;
      const handler = this.getHandlerByPattern(pattern);

      if (!handler) {
        this.logger.warn(`No handler found for pattern: ${pattern}`);
        res.writeHead(200);
        res.end(JSON.stringify({ received: true }));
        return;
      }

      const ctx = {
        getPattern: () => pattern,
        getData: () => event.data,
        getEvent: () => event,
      };

      handler(event.data, ctx)
        .then((result: unknown) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result ?? { received: true }));
        })
        .catch((error: Error) => {
          this.logger.error(`Error handling webhook: ${error.message}`);
          res.writeHead(500);
          res.end('Internal Server Error');
        });
    } catch {
      this.logger.error('Failed to parse webhook payload');
      res.writeHead(400);
      res.end('Bad Request');
    }
  }

  private isVerificationRequest(payload: unknown): payload is NotionVerificationRequest {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'verification_token' in payload &&
      !('type' in payload)
    );
  }

  private handleVerification(payload: NotionVerificationRequest, res: ServerResponse): void {
    this.logger.log(`Received verification_token: ${payload.verification_token}`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    const response = payload.challenge ? { challenge: payload.challenge } : { ok: true };
    res.end(JSON.stringify(response));
  }
}
