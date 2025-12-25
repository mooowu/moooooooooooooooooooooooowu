import { describe, it, expect } from 'vitest';
import { NotionWebhookController } from '../notion-webhook.controller';
import { QdrantService, NotionPagePayload } from '../../services/qdrant.service';
import { NotionWebhookEventData } from '../../transports/notion-webhook';

interface QdrantServiceStub {
  upsertPage: (page: NotionPagePayload) => Promise<void>;
  deletePage: (pageId: string) => Promise<void>;
  search: (query: string, limit?: number) => Promise<NotionPagePayload[]>;
}

function createQdrantServiceStub(overrides: Partial<QdrantServiceStub> = {}): QdrantServiceStub {
  return {
    upsertPage: async () => {},
    deletePage: async () => {},
    search: async () => [],
    ...overrides,
  };
}

describe('NotionWebhookController', () => {
  describe('handlePageCreated', () => {
    it('should index new page to Qdrant', async () => {
      let upsertedPage: NotionPagePayload | undefined;

      const qdrantService = createQdrantServiceStub({
        upsertPage: async (page) => {
          upsertedPage = page;
        },
      });

      const controller = new NotionWebhookController(qdrantService as unknown as QdrantService);

      const eventData: NotionWebhookEventData = {
        id: 'page-123',
        properties: {
          title: [{ plain_text: 'Test Page' }],
        },
        content: 'This is test content',
        last_edited_time: '2025-01-01T00:00:00Z',
      };

      const result = await controller.handlePageCreated(eventData);

      expect(result).toEqual({ success: true });
      expect(upsertedPage).toEqual({
        id: 'page-123',
        title: 'Test Page',
        content: 'This is test content',
        url: 'https://notion.so/page123',
        lastEditedTime: '2025-01-01T00:00:00Z',
      });
    });

    it('should handle Name property for title', async () => {
      let upsertedPage: NotionPagePayload | undefined;

      const qdrantService = createQdrantServiceStub({
        upsertPage: async (page) => {
          upsertedPage = page;
        },
      });

      const controller = new NotionWebhookController(qdrantService as unknown as QdrantService);

      const eventData: NotionWebhookEventData = {
        id: 'page-456',
        properties: {
          Name: { title: [{ plain_text: 'Named Page' }] },
        },
        content: 'Content here',
      };

      await controller.handlePageCreated(eventData);

      expect(upsertedPage?.title).toBe('Named Page');
    });

    it('should default to Untitled when no title found', async () => {
      let upsertedPage: NotionPagePayload | undefined;

      const qdrantService = createQdrantServiceStub({
        upsertPage: async (page) => {
          upsertedPage = page;
        },
      });

      const controller = new NotionWebhookController(qdrantService as unknown as QdrantService);

      const eventData: NotionWebhookEventData = {
        id: 'page-789',
        properties: {},
        content: 'Some content',
      };

      await controller.handlePageCreated(eventData);

      expect(upsertedPage?.title).toBe('Untitled');
    });
  });

  describe('handlePageUpdated', () => {
    it('should update page in Qdrant', async () => {
      let upsertedPage: NotionPagePayload | undefined;

      const qdrantService = createQdrantServiceStub({
        upsertPage: async (page) => {
          upsertedPage = page;
        },
      });

      const controller = new NotionWebhookController(qdrantService as unknown as QdrantService);

      const eventData: NotionWebhookEventData = {
        id: 'page-123',
        properties: {
          title: [{ plain_text: 'Updated Page' }],
        },
        content: 'Updated content',
        last_edited_time: '2025-01-02T00:00:00Z',
      };

      const result = await controller.handlePageUpdated(eventData);

      expect(result).toEqual({ success: true });
      expect(upsertedPage).toEqual({
        id: 'page-123',
        title: 'Updated Page',
        content: 'Updated content',
        url: 'https://notion.so/page123',
        lastEditedTime: '2025-01-02T00:00:00Z',
      });
    });
  });

  describe('handlePageDeleted', () => {
    it('should remove page from Qdrant', async () => {
      let deletedPageId: string | undefined;

      const qdrantService = createQdrantServiceStub({
        deletePage: async (pageId) => {
          deletedPageId = pageId;
        },
      });

      const controller = new NotionWebhookController(qdrantService as unknown as QdrantService);

      const eventData: NotionWebhookEventData = {
        id: 'page-123',
        properties: {},
      };

      const result = await controller.handlePageDeleted(eventData);

      expect(result).toEqual({ success: true });
      expect(deletedPageId).toBe('page-123');
    });
  });

  describe('content extraction', () => {
    it('should handle string content', async () => {
      let upsertedPage: NotionPagePayload | undefined;

      const qdrantService = createQdrantServiceStub({
        upsertPage: async (page) => {
          upsertedPage = page;
        },
      });

      const controller = new NotionWebhookController(qdrantService as unknown as QdrantService);

      const eventData: NotionWebhookEventData = {
        id: 'page-1',
        properties: { title: [{ plain_text: 'Test' }] },
        content: 'Simple string content',
      };

      await controller.handlePageCreated(eventData);

      expect(upsertedPage?.content).toBe('Simple string content');
    });

    it('should handle array content with plain_text', async () => {
      let upsertedPage: NotionPagePayload | undefined;

      const qdrantService = createQdrantServiceStub({
        upsertPage: async (page) => {
          upsertedPage = page;
        },
      });

      const controller = new NotionWebhookController(qdrantService as unknown as QdrantService);

      const eventData: NotionWebhookEventData = {
        id: 'page-2',
        properties: { title: [{ plain_text: 'Test' }] },
        content: [{ plain_text: 'First block' }, { plain_text: 'Second block' }],
      };

      await controller.handlePageCreated(eventData);

      expect(upsertedPage?.content).toBe('First block\nSecond block');
    });

    it('should handle array content with text property', async () => {
      let upsertedPage: NotionPagePayload | undefined;

      const qdrantService = createQdrantServiceStub({
        upsertPage: async (page) => {
          upsertedPage = page;
        },
      });

      const controller = new NotionWebhookController(qdrantService as unknown as QdrantService);

      const eventData: NotionWebhookEventData = {
        id: 'page-3',
        properties: { title: [{ plain_text: 'Test' }] },
        content: [{ text: 'Text block 1' }, { text: 'Text block 2' }],
      };

      await controller.handlePageCreated(eventData);

      expect(upsertedPage?.content).toBe('Text block 1\nText block 2');
    });

    it('should handle undefined content', async () => {
      let upsertedPage: NotionPagePayload | undefined;

      const qdrantService = createQdrantServiceStub({
        upsertPage: async (page) => {
          upsertedPage = page;
        },
      });

      const controller = new NotionWebhookController(qdrantService as unknown as QdrantService);

      const eventData: NotionWebhookEventData = {
        id: 'page-4',
        properties: { title: [{ plain_text: 'Test' }] },
      };

      await controller.handlePageCreated(eventData);

      expect(upsertedPage?.content).toBe('');
    });
  });
});
