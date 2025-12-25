import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { createHmac, timingSafeEqual } from 'crypto';
import { createServer, Server as HttpServer, IncomingMessage, ServerResponse } from 'http';

import { GITHUB_EVENT_PREFIX } from './github-event.decorator';
import type { GithubWebhookEvent, GithubWebhookOptions } from './github-webhook.types';

export class GithubWebhookServer extends Server implements CustomTransportStrategy {
  private httpServer: HttpServer | null = null;
  private readonly port: number;
  private readonly path: string;
  private readonly secret?: string;

  constructor(options: GithubWebhookOptions = {}) {
    super();
    this.port = options.port ?? 3002;
    this.path = options.path ?? '/github/webhook';
    this.secret = options.secret;
  }

  listen(callback: () => void): void {
    this.httpServer = createServer((req, res) => this.handleRequest(req, res));
    this.httpServer.listen(this.port, callback);
    this.logger.log(`GitHub Webhook server listening on port ${this.port}`);
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

    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      const body = Buffer.concat(chunks);
      this.processWebhook(req, body, res);
    });
  }

  private processWebhook(req: IncomingMessage, body: Buffer, res: ServerResponse): void {
    try {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;

      if (this.secret) {
        if (!signature) {
          res.writeHead(401);
          res.end('Missing signature');
          return;
        }

        if (!this.verifySignature(body, signature)) {
          res.writeHead(401);
          res.end('Invalid signature');
          return;
        }
      }

      const eventType = req.headers['x-github-event'] as string;
      const deliveryId = req.headers['x-github-delivery'] as string;

      if (!eventType) {
        res.writeHead(400);
        res.end('Missing X-GitHub-Event header');
        return;
      }

      const payload = JSON.parse(body.toString()) as GithubWebhookEvent;

      if (eventType === 'ping') {
        this.handlePing(res);
        return;
      }

      const basePattern = this.buildPattern(eventType, payload.action);
      const pattern = `${GITHUB_EVENT_PREFIX}${basePattern}`;
      const fallbackPattern = `${GITHUB_EVENT_PREFIX}${eventType}`;
      const handler =
        this.getHandlerByPattern(pattern) ?? this.getHandlerByPattern(fallbackPattern);

      if (!handler) {
        this.logger.warn(`No handler found for pattern: ${pattern}`);
        res.writeHead(200);
        res.end(JSON.stringify({ received: true }));
        return;
      }

      const ctx = {
        getPattern: () => pattern,
        getData: () => payload,
        getEventType: () => eventType,
        getDeliveryId: () => deliveryId,
        getHeaders: () => req.headers,
      };

      handler(payload, ctx)
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

  private verifySignature(payload: Buffer, signature: string): boolean {
    if (!this.secret) return true;

    const expectedSignature = `sha256=${createHmac('sha256', this.secret).update(payload).digest('hex')}`;

    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch {
      return false;
    }
  }

  private buildPattern(eventType: string, action?: string): string {
    if (action) {
      return `${eventType}.${action}`;
    }
    return eventType;
  }

  private handlePing(res: ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'pong' }));
    this.logger.log('GitHub webhook ping received');
  }
}
