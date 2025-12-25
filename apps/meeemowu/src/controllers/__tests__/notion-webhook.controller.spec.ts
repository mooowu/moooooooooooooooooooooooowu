import { describe, it, expect } from 'vitest';
import { NotionWebhookController } from '../notion-webhook.controller';
import { NotionWebhookEventData } from '../../transports/notion-webhook';

describe('NotionWebhookController', () => {
  describe('handlePageCreated', () => {
    it('should return success', async () => {
      const controller = new NotionWebhookController();

      const eventData: NotionWebhookEventData = {
        object: 'page',
        id: 'page-123',
        properties: {
          title: [{ plain_text: 'Test Page' }],
        },
        content: 'This is test content',
        last_edited_time: '2025-01-01T00:00:00Z',
      };

      const result = await controller.handlePageCreated(eventData);

      expect(result).toEqual({ success: true });
    });
  });

  describe('handlePageUpdated', () => {
    it('should return success', async () => {
      const controller = new NotionWebhookController();

      const eventData: NotionWebhookEventData = {
        object: 'page',
        id: 'page-123',
        properties: {
          title: [{ plain_text: 'Updated Page' }],
        },
        content: 'Updated content',
        last_edited_time: '2025-01-02T00:00:00Z',
      };

      const result = await controller.handlePageUpdated(eventData);

      expect(result).toEqual({ success: true });
    });
  });

  describe('handlePageDeleted', () => {
    it('should return success', async () => {
      const controller = new NotionWebhookController();

      const eventData: NotionWebhookEventData = {
        object: 'page',
        id: 'page-123',
        properties: {},
      };

      const result = await controller.handlePageDeleted(eventData);

      expect(result).toEqual({ success: true });
    });
  });
});
