import * as http from 'http';
import { afterEach, describe, expect, it } from 'vitest';
import { NotionWebhookServer } from '../notion-webhook.server';

describe('NotionWebhookServer', () => {
  let server: NotionWebhookServer;
  let testPort = 4000;
  const TEST_PATH = '/notion/webhook';
  const TEST_TOKEN = 'test-verification-token';

  const getNextPort = () => testPort++;

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
      server = new NotionWebhookServer({
        port,
        path: TEST_PATH,
        verificationToken: TEST_TOKEN,
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
      server = new NotionWebhookServer({
        port,
        path: TEST_PATH,
        verificationToken: TEST_TOKEN,
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
      server = new NotionWebhookServer({
        port,
        path: TEST_PATH,
        verificationToken: TEST_TOKEN,
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
      server = new NotionWebhookServer({
        port,
        path: TEST_PATH,
        verificationToken: TEST_TOKEN,
      });

      await new Promise<void>((resolve) => {
        server.listen(async () => {
          const response = await makeRequest(
            port,
            {
              path: TEST_PATH,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            },
            'invalid-json',
          );

          expect(response.statusCode).toBe(400);
          expect(response.body).toBe('Bad Request');
          resolve();
        });
      });
    });
  });

  describe('verification challenge', () => {
    it('should respond to verification challenge with correct token', async () => {
      const port = getNextPort();
      server = new NotionWebhookServer({
        port,
        path: TEST_PATH,
        verificationToken: TEST_TOKEN,
      });

      await new Promise<void>((resolve) => {
        server.listen(async () => {
          const challenge = 'test-challenge-string';
          const response = await makeRequest(
            port,
            {
              path: TEST_PATH,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            },
            JSON.stringify({
              verification_token: TEST_TOKEN,
              challenge,
            }),
          );

          expect(response.statusCode).toBe(200);
          expect(JSON.parse(response.body)).toEqual({ challenge });
          resolve();
        });
      });
    });

    it('should reject verification with incorrect token', async () => {
      const port = getNextPort();
      server = new NotionWebhookServer({
        port,
        path: TEST_PATH,
        verificationToken: TEST_TOKEN,
      });

      await new Promise<void>((resolve) => {
        server.listen(async () => {
          const response = await makeRequest(
            port,
            {
              path: TEST_PATH,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            },
            JSON.stringify({
              verification_token: 'wrong-token',
              challenge: 'test-challenge',
            }),
          );

          expect(response.statusCode).toBe(401);
          expect(response.body).toBe('Unauthorized');
          resolve();
        });
      });
    });
  });

  describe('webhook event handling', () => {
    it('should reject events with incorrect verification token', async () => {
      const port = getNextPort();
      server = new NotionWebhookServer({
        port,
        path: TEST_PATH,
        verificationToken: TEST_TOKEN,
      });

      await new Promise<void>((resolve) => {
        server.listen(async () => {
          const response = await makeRequest(
            port,
            {
              path: TEST_PATH,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            },
            JSON.stringify({
              type: 'page.created',
              verification_token: 'wrong-token',
              timestamp: new Date().toISOString(),
              data: { object: 'page', id: 'test-id' },
            }),
          );

          expect(response.statusCode).toBe(401);
          expect(response.body).toBe('Unauthorized');
          resolve();
        });
      });
    });

    it('should accept events with correct token but no handler', async () => {
      const port = getNextPort();
      server = new NotionWebhookServer({
        port,
        path: TEST_PATH,
        verificationToken: TEST_TOKEN,
      });

      await new Promise<void>((resolve) => {
        server.listen(async () => {
          const response = await makeRequest(
            port,
            {
              path: TEST_PATH,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            },
            JSON.stringify({
              type: 'page.created',
              verification_token: TEST_TOKEN,
              timestamp: new Date().toISOString(),
              data: { object: 'page', id: 'test-id' },
            }),
          );

          expect(response.statusCode).toBe(200);
          expect(JSON.parse(response.body)).toEqual({ received: true });
          resolve();
        });
      });
    });
  });
});
