import { createHmac } from 'crypto';
import * as http from 'http';
import { afterEach, describe, expect, it } from 'vitest';
import { GithubWebhookServer } from '../github-webhook.server';

describe('GithubWebhookServer', () => {
  let server: GithubWebhookServer;
  let testPort = 6000;
  const TEST_PATH = '/github/webhook';
  const TEST_SECRET = 'test-webhook-secret';

  const getNextPort = () => testPort++;

  const createSignature = (payload: string, secret: string): string => {
    return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
  };

  const makeRequest = (
    port: number,
    options: Partial<http.RequestOptions>,
    body?: string,
  ): Promise<{ statusCode: number; body: string }> => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port,
          ...options,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body: data }));
        },
      );
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  };

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  describe('listen', () => {
    it('should start HTTP server on specified port', async () => {
      const port = getNextPort();
      server = new GithubWebhookServer({
        port,
        path: TEST_PATH,
        secret: TEST_SECRET,
      });

      await new Promise<void>((resolve) => {
        server.listen(() => {
          expect(server.unwrap<http.Server>()).toBeDefined();
          resolve();
        });
      });
    });
  });

  describe('handleRequest', () => {
    it('should return 404 for non-webhook paths', async () => {
      const port = getNextPort();
      server = new GithubWebhookServer({
        port,
        path: TEST_PATH,
        secret: TEST_SECRET,
      });

      await new Promise<void>((resolve) => {
        server.listen(async () => {
          const response = await makeRequest(port, {
            path: '/other-path',
            method: 'POST',
          });

          expect(response.statusCode).toBe(404);
          expect(response.body).toBe('Not Found');
          resolve();
        });
      });
    });

    it('should return 405 for non-POST methods', async () => {
      const port = getNextPort();
      server = new GithubWebhookServer({
        port,
        path: TEST_PATH,
        secret: TEST_SECRET,
      });

      await new Promise<void>((resolve) => {
        server.listen(async () => {
          const response = await makeRequest(port, {
            path: TEST_PATH,
            method: 'GET',
          });

          expect(response.statusCode).toBe(405);
          expect(response.body).toBe('Method Not Allowed');
          resolve();
        });
      });
    });

    it('should return 400 for invalid JSON', async () => {
      const port = getNextPort();
      server = new GithubWebhookServer({
        port,
        path: TEST_PATH,
      });

      await new Promise<void>((resolve) => {
        server.listen(async () => {
          const response = await makeRequest(
            port,
            {
              path: TEST_PATH,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-GitHub-Event': 'push',
                'X-GitHub-Delivery': 'test-delivery-id',
              },
            },
            'invalid-json',
          );

          expect(response.statusCode).toBe(400);
          expect(response.body).toBe('Bad Request');
          resolve();
        });
      });
    });

    it('should return 400 for missing X-GitHub-Event header', async () => {
      const port = getNextPort();
      server = new GithubWebhookServer({
        port,
        path: TEST_PATH,
      });

      await new Promise<void>((resolve) => {
        server.listen(async () => {
          const payload = JSON.stringify({ action: 'opened' });
          const response = await makeRequest(
            port,
            {
              path: TEST_PATH,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-GitHub-Delivery': 'test-delivery-id',
              },
            },
            payload,
          );

          expect(response.statusCode).toBe(400);
          expect(response.body).toBe('Missing X-GitHub-Event header');
          resolve();
        });
      });
    });
  });

  describe('signature verification', () => {
    it('should reject requests without signature when secret is configured', async () => {
      const port = getNextPort();
      server = new GithubWebhookServer({
        port,
        path: TEST_PATH,
        secret: TEST_SECRET,
      });

      await new Promise<void>((resolve) => {
        server.listen(async () => {
          const payload = JSON.stringify({ action: 'opened' });
          const response = await makeRequest(
            port,
            {
              path: TEST_PATH,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-GitHub-Event': 'push',
                'X-GitHub-Delivery': 'test-delivery-id',
              },
            },
            payload,
          );

          expect(response.statusCode).toBe(401);
          expect(response.body).toBe('Missing signature');
          resolve();
        });
      });
    });

    it('should reject requests with invalid signature', async () => {
      const port = getNextPort();
      server = new GithubWebhookServer({
        port,
        path: TEST_PATH,
        secret: TEST_SECRET,
      });

      await new Promise<void>((resolve) => {
        server.listen(async () => {
          const payload = JSON.stringify({ action: 'opened' });
          const response = await makeRequest(
            port,
            {
              path: TEST_PATH,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-GitHub-Event': 'push',
                'X-GitHub-Delivery': 'test-delivery-id',
                'X-Hub-Signature-256': 'sha256=invalid-signature',
              },
            },
            payload,
          );

          expect(response.statusCode).toBe(401);
          expect(response.body).toBe('Invalid signature');
          resolve();
        });
      });
    });

    it('should accept requests with valid signature', async () => {
      const port = getNextPort();
      server = new GithubWebhookServer({
        port,
        path: TEST_PATH,
        secret: TEST_SECRET,
      });

      await new Promise<void>((resolve) => {
        server.listen(async () => {
          const payload = JSON.stringify({
            action: 'opened',
            sender: { login: 'test-user', id: 1 },
          });
          const signature = createSignature(payload, TEST_SECRET);
          const response = await makeRequest(
            port,
            {
              path: TEST_PATH,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-GitHub-Event': 'issues',
                'X-GitHub-Delivery': 'test-delivery-id',
                'X-Hub-Signature-256': signature,
              },
            },
            payload,
          );

          expect(response.statusCode).toBe(200);
          expect(JSON.parse(response.body)).toEqual({ received: true });
          resolve();
        });
      });
    });
  });

  describe('ping event', () => {
    it('should respond to ping event', async () => {
      const port = getNextPort();
      server = new GithubWebhookServer({
        port,
        path: TEST_PATH,
      });

      await new Promise<void>((resolve) => {
        server.listen(async () => {
          const payload = JSON.stringify({
            zen: 'Keep it logically awesome.',
            hook_id: 12345,
            sender: { login: 'test-user', id: 1 },
          });
          const response = await makeRequest(
            port,
            {
              path: TEST_PATH,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-GitHub-Event': 'ping',
                'X-GitHub-Delivery': 'test-delivery-id',
              },
            },
            payload,
          );

          expect(response.statusCode).toBe(200);
          expect(JSON.parse(response.body)).toEqual({ message: 'pong' });
          resolve();
        });
      });
    });
  });

  describe('webhook event handling', () => {
    it('should accept events with no handler registered', async () => {
      const port = getNextPort();
      server = new GithubWebhookServer({
        port,
        path: TEST_PATH,
      });

      await new Promise<void>((resolve) => {
        server.listen(async () => {
          const payload = JSON.stringify({
            action: 'opened',
            sender: { login: 'test-user', id: 1 },
          });
          const response = await makeRequest(
            port,
            {
              path: TEST_PATH,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-GitHub-Event': 'issues',
                'X-GitHub-Delivery': 'test-delivery-id',
              },
            },
            payload,
          );

          expect(response.statusCode).toBe(200);
          expect(JSON.parse(response.body)).toEqual({ received: true });
          resolve();
        });
      });
    });
  });
});
