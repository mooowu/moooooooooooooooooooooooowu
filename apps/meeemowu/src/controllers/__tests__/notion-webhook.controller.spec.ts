import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotionWebhookController } from '../notion-webhook.controller';
import { QdrantService } from '../../services/qdrant.service';
import { NotionWebhookEventData } from '../../transports/notion-webhook';

describe('NotionWebhookController', () => {
  let controller: NotionWebhookController;
  let mockQdrantService: {
    upsertPage: ReturnType<typeof vi.fn>;
    deletePage: ReturnType<typeof vi.fn>;
    search: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockQdrantService = {
      upsertPage: vi.fn().mockResolvedValue(undefined),
      deletePage: vi.fn().mockResolvedValue(undefined),
      search: vi.fn().mockResolvedValue([]),
    };

    controller = new NotionWebhookController(mockQdrantService as unknown as QdrantService);
  });

  describe('handlePageCreated', () => {
    it('should index new page to Qdrant', async () => {
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
      expect(mockQdrantService.upsertPage).toHaveBeenCalledWith({
        id: 'page-123',
        title: 'Test Page',
        content: 'This is test content',
        url: 'https://notion.so/page123',
        lastEditedTime: '2025-01-01T00:00:00Z',
      });
    });

    it('should handle Name property for title', async () => {
      const eventData: NotionWebhookEventData = {
        id: 'page-456',
        properties: {
          Name: { title: [{ plain_text: 'Named Page' }] },
        },
        content: 'Content here',
      };

      await controller.handlePageCreated(eventData);

      expect(mockQdrantService.upsertPage).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Named Page',
        }),
      );
    });

    it('should default to Untitled when no title found', async () => {
      const eventData: NotionWebhookEventData = {
        id: 'page-789',
        properties: {},
        content: 'Some content',
      };

      await controller.handlePageCreated(eventData);

      expect(mockQdrantService.upsertPage).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Untitled',
        }),
      );
    });
  });

  describe('handlePageUpdated', () => {
    it('should update page in Qdrant', async () => {
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
      expect(mockQdrantService.upsertPage).toHaveBeenCalledWith({
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
      const eventData: NotionWebhookEventData = {
        id: 'page-123',
        properties: {},
      };

      const result = await controller.handlePageDeleted(eventData);

      expect(result).toEqual({ success: true });
      expect(mockQdrantService.deletePage).toHaveBeenCalledWith('page-123');
    });
  });

  describe('content extraction', () => {
    it('should handle string content', async () => {
      const eventData: NotionWebhookEventData = {
        id: 'page-1',
        properties: { title: [{ plain_text: 'Test' }] },
        content: 'Simple string content',
      };

      await controller.handlePageCreated(eventData);

      expect(mockQdrantService.upsertPage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Simple string content',
        }),
      );
    });

    it('should handle array content with plain_text', async () => {
      const eventData: NotionWebhookEventData = {
        id: 'page-2',
        properties: { title: [{ plain_text: 'Test' }] },
        content: [{ plain_text: 'First block' }, { plain_text: 'Second block' }],
      };

      await controller.handlePageCreated(eventData);

      expect(mockQdrantService.upsertPage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'First block\nSecond block',
        }),
      );
    });

    it('should handle array content with text property', async () => {
      const eventData: NotionWebhookEventData = {
        id: 'page-3',
        properties: { title: [{ plain_text: 'Test' }] },
        content: [{ text: 'Text block 1' }, { text: 'Text block 2' }],
      };

      await controller.handlePageCreated(eventData);

      expect(mockQdrantService.upsertPage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Text block 1\nText block 2',
        }),
      );
    });

    it('should handle undefined content', async () => {
      const eventData: NotionWebhookEventData = {
        id: 'page-4',
        properties: { title: [{ plain_text: 'Test' }] },
      };

      await controller.handlePageCreated(eventData);

      expect(mockQdrantService.upsertPage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: '',
        }),
      );
    });
  });
});
