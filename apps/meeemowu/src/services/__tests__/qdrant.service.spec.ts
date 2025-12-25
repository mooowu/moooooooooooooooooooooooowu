import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QdrantService, NotionPagePayload } from '../qdrant.service';

const mockQdrantClient = {
  getCollections: vi.fn().mockResolvedValue({ collections: [] }),
  createCollection: vi.fn().mockResolvedValue({}),
  upsert: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
  search: vi.fn().mockResolvedValue([]),
};

const mockOpenAIClient = {
  embed: vi.fn().mockResolvedValue([{ embedding: new Array(1536).fill(0.1) }]),
};

// Mock QdrantClient
vi.mock('@qdrant/js-client-rest', () => ({
  QdrantClient: vi.fn().mockImplementation(function () {
    return mockQdrantClient;
  }),
}));

// Mock OpenAIClient
vi.mock('@moooooooooooooooooooooooowu/ai', () => ({
  OpenAIClient: vi.fn().mockImplementation(function () {
    return mockOpenAIClient;
  }),
}));

describe('QdrantService', () => {
  let service: QdrantService;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new QdrantService();
  });

  describe('onModuleInit', () => {
    it('should create collection if it does not exist', async () => {
      mockQdrantClient.getCollections.mockResolvedValue({ collections: [] });

      await service.onModuleInit();

      expect(mockQdrantClient.getCollections).toHaveBeenCalled();
      expect(mockQdrantClient.createCollection).toHaveBeenCalledWith('notion_pages', {
        vectors: {
          size: 1536,
          distance: 'Cosine',
        },
      });
    });

    it('should not create collection if it already exists', async () => {
      mockQdrantClient.getCollections.mockResolvedValue({
        collections: [{ name: 'notion_pages' }],
      });

      await service.onModuleInit();

      expect(mockQdrantClient.getCollections).toHaveBeenCalled();
      expect(mockQdrantClient.createCollection).not.toHaveBeenCalled();
    });
  });

  describe('upsertPage', () => {
    const mockPage: NotionPagePayload = {
      id: 'page-123',
      title: 'Test Page',
      content: 'This is test content',
      url: 'https://notion.so/page123',
      lastEditedTime: '2025-01-01T00:00:00Z',
    };

    it('should generate embedding and upsert page to Qdrant', async () => {
      const mockEmbedding = new Array(1536).fill(0.5);
      mockOpenAIClient.embed.mockResolvedValue([{ embedding: mockEmbedding }]);

      await service.upsertPage(mockPage);

      expect(mockOpenAIClient.embed).toHaveBeenCalledWith(['Test Page\n\nThis is test content']);
      expect(mockQdrantClient.upsert).toHaveBeenCalledWith('notion_pages', {
        points: [
          {
            id: 'page-123',
            vector: mockEmbedding,
            payload: {
              title: 'Test Page',
              content: 'This is test content',
              url: 'https://notion.so/page123',
              lastEditedTime: '2025-01-01T00:00:00Z',
            },
          },
        ],
      });
    });

    it('should throw error if embedding generation fails', async () => {
      mockOpenAIClient.embed.mockResolvedValue([]);

      await expect(service.upsertPage(mockPage)).rejects.toThrow('Failed to generate embedding');
    });
  });

  describe('deletePage', () => {
    it('should delete page from Qdrant', async () => {
      await service.deletePage('page-123');

      expect(mockQdrantClient.delete).toHaveBeenCalledWith('notion_pages', {
        points: ['page-123'],
      });
    });
  });

  describe('search', () => {
    it('should search for pages by query', async () => {
      const mockEmbedding = new Array(1536).fill(0.3);
      mockOpenAIClient.embed.mockResolvedValue([{ embedding: mockEmbedding }]);
      mockQdrantClient.search.mockResolvedValue([
        {
          id: 'page-1',
          score: 0.95,
          payload: {
            title: 'Result Page',
            content: 'Result content',
            url: 'https://notion.so/page1',
            lastEditedTime: '2025-01-01T00:00:00Z',
          },
        },
      ]);

      const results = await service.search('test query');

      expect(mockOpenAIClient.embed).toHaveBeenCalledWith(['test query']);
      expect(mockQdrantClient.search).toHaveBeenCalledWith('notion_pages', {
        vector: mockEmbedding,
        limit: 5,
        with_payload: true,
      });
      expect(results).toEqual([
        {
          id: 'page-1',
          title: 'Result Page',
          content: 'Result content',
          url: 'https://notion.so/page1',
          lastEditedTime: '2025-01-01T00:00:00Z',
        },
      ]);
    });

    it('should respect custom limit parameter', async () => {
      const mockEmbedding = new Array(1536).fill(0.3);
      mockOpenAIClient.embed.mockResolvedValue([{ embedding: mockEmbedding }]);
      mockQdrantClient.search.mockResolvedValue([]);

      await service.search('test query', 10);

      expect(mockQdrantClient.search).toHaveBeenCalledWith('notion_pages', {
        vector: mockEmbedding,
        limit: 10,
        with_payload: true,
      });
    });

    it('should throw error if embedding generation fails', async () => {
      mockOpenAIClient.embed.mockResolvedValue([]);

      await expect(service.search('test query')).rejects.toThrow('Failed to generate embedding');
    });
  });
});
