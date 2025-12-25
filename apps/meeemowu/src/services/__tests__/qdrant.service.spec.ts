import { describe, it, expect } from 'vitest';
import { QdrantService, NotionPagePayload, VectorClient, EmbeddingClient } from '../qdrant.service';

function createVectorClientStub(overrides: Partial<VectorClient> = {}): VectorClient {
  return {
    getCollections: async () => ({ collections: [] }),
    createCollection: async () => ({}),
    upsert: async () => ({}),
    delete: async () => ({}),
    search: async () => [],
    ...overrides,
  };
}

function createEmbeddingClientStub(overrides: Partial<EmbeddingClient> = {}): EmbeddingClient {
  return {
    embed: async () => [{ embedding: new Array(1536).fill(0.1) }],
    ...overrides,
  };
}

describe('QdrantService', () => {
  describe('onModuleInit', () => {
    it('should create collection if it does not exist', async () => {
      let createCollectionCalled = false;
      let createCollectionArgs: unknown[] = [];

      const vectorClient = createVectorClientStub({
        getCollections: async () => ({ collections: [] }),
        createCollection: async (name, config) => {
          createCollectionCalled = true;
          createCollectionArgs = [name, config];
          return {};
        },
      });

      const service = new QdrantService(vectorClient, createEmbeddingClientStub());
      await service.onModuleInit();

      expect(createCollectionCalled).toBe(true);
      expect(createCollectionArgs[0]).toBe('notion_pages');
      expect(createCollectionArgs[1]).toEqual({
        vectors: {
          size: 1536,
          distance: 'Cosine',
        },
      });
    });

    it('should not create collection if it already exists', async () => {
      let createCollectionCalled = false;

      const vectorClient = createVectorClientStub({
        getCollections: async () => ({ collections: [{ name: 'notion_pages' }] }),
        createCollection: async () => {
          createCollectionCalled = true;
          return {};
        },
      });

      const service = new QdrantService(vectorClient, createEmbeddingClientStub());
      await service.onModuleInit();

      expect(createCollectionCalled).toBe(false);
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
      let embedTexts: string[] = [];
      let upsertArgs: unknown[] = [];

      const embeddingClient = createEmbeddingClientStub({
        embed: async (texts) => {
          embedTexts = texts;
          return [{ embedding: mockEmbedding }];
        },
      });

      const vectorClient = createVectorClientStub({
        upsert: async (collection, data) => {
          upsertArgs = [collection, data];
          return {};
        },
      });

      const service = new QdrantService(vectorClient, embeddingClient);
      await service.upsertPage(mockPage);

      expect(embedTexts).toEqual(['Test Page\n\nThis is test content']);
      expect(upsertArgs[0]).toBe('notion_pages');
      expect(upsertArgs[1]).toEqual({
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
      const embeddingClient = createEmbeddingClientStub({
        embed: async () => [],
      });

      const service = new QdrantService(createVectorClientStub(), embeddingClient);

      await expect(service.upsertPage(mockPage)).rejects.toThrow('Failed to generate embedding');
    });
  });

  describe('deletePage', () => {
    it('should delete page from Qdrant', async () => {
      let deleteArgs: unknown[] = [];

      const vectorClient = createVectorClientStub({
        delete: async (collection, data) => {
          deleteArgs = [collection, data];
          return {};
        },
      });

      const service = new QdrantService(vectorClient, createEmbeddingClientStub());
      await service.deletePage('page-123');

      expect(deleteArgs[0]).toBe('notion_pages');
      expect(deleteArgs[1]).toEqual({ points: ['page-123'] });
    });
  });

  describe('search', () => {
    it('should search for pages by query', async () => {
      const mockEmbedding = new Array(1536).fill(0.3);
      let embedTexts: string[] = [];
      let searchArgs: unknown[] = [];

      const embeddingClient = createEmbeddingClientStub({
        embed: async (texts) => {
          embedTexts = texts;
          return [{ embedding: mockEmbedding }];
        },
      });

      const vectorClient = createVectorClientStub({
        search: async (collection, params) => {
          searchArgs = [collection, params];
          return [
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
          ];
        },
      });

      const service = new QdrantService(vectorClient, embeddingClient);
      const results = await service.search('test query');

      expect(embedTexts).toEqual(['test query']);
      expect(searchArgs[0]).toBe('notion_pages');
      expect(searchArgs[1]).toEqual({
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
      let searchLimit: number | undefined;

      const vectorClient = createVectorClientStub({
        search: async (_collection, params) => {
          searchLimit = params.limit;
          return [];
        },
      });

      const service = new QdrantService(vectorClient, createEmbeddingClientStub());
      await service.search('test query', 10);

      expect(searchLimit).toBe(10);
    });

    it('should throw error if embedding generation fails', async () => {
      const embeddingClient = createEmbeddingClientStub({
        embed: async () => [],
      });

      const service = new QdrantService(createVectorClientStub(), embeddingClient);

      await expect(service.search('test query')).rejects.toThrow('Failed to generate embedding');
    });
  });
});
