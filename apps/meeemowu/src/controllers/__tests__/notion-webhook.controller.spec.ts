import 'reflect-metadata';
import { describe, it, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/microservices';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { NotionWebhookServer } from '../../transports/notion-webhook';

describe('NotionWebhookController (E2E)', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const strategy = new NotionWebhookServer({
      port: 0,
      path: '/notion/webhook',
      verificationToken: 'test-token',
    });

    app.connectMicroservice<MicroserviceOptions>({
      strategy,
    });

    await app.startAllMicroservices();
    await app.init();

    server = strategy.unwrap();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle verification request', () => {
    return request(server)
      .post('/notion/webhook')
      .send({
        verification_token: 'test-token',
        challenge: 'test-challenge',
      })
      .expect(200)
      .expect({ challenge: 'test-challenge' });
  });

  it('should handle page.created event', () => {
    return request(server)
      .post('/notion/webhook')
      .send({
        type: 'page.created',
        verification_token: 'test-token',
        timestamp: new Date().toISOString(),
        data: {
          object: 'page',
          id: 'page-123',
          properties: {
            title: [{ plain_text: 'Test Page' }],
          },
          content: 'This is test content',
          last_edited_time: '2025-01-01T00:00:00Z',
        },
      })
      .expect(200)
      .expect({ success: true });
  });

  it('should handle page.updated event', () => {
    return request(server)
      .post('/notion/webhook')
      .send({
        type: 'page.updated',
        verification_token: 'test-token',
        timestamp: new Date().toISOString(),
        data: {
          object: 'page',
          id: 'page-123',
          properties: {
            title: [{ plain_text: 'Updated Page' }],
          },
          content: 'Updated content',
          last_edited_time: '2025-01-02T00:00:00Z',
        },
      })
      .expect(200)
      .expect({ success: true });
  });

  it('should handle page.deleted event', () => {
    return request(server)
      .post('/notion/webhook')
      .send({
        type: 'page.deleted',
        verification_token: 'test-token',
        timestamp: new Date().toISOString(),
        data: {
          object: 'page',
          id: 'page-123',
          properties: {},
        },
      })
      .expect(200)
      .expect({ success: true });
  });

  it('should reject invalid verification token', () => {
    return request(server)
      .post('/notion/webhook')
      .send({
        type: 'page.created',
        verification_token: 'wrong-token',
        timestamp: new Date().toISOString(),
        data: {
          object: 'page',
          id: 'page-123',
        },
      })
      .expect(401);
  });

  it('should return 404 for invalid path', () => {
    return request(server).post('/wrong/path').expect(404);
  });

  it('should return 405 for non-POST method', () => {
    return request(server).get('/notion/webhook').expect(405);
  });
});
