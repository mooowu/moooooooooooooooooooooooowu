import { describe, it, expect } from 'vitest';
import { SearchController } from '../search.controller';
import { QdrantService, NotionPagePayload } from '../../services/qdrant.service';

interface QdrantServiceStub {
  search: (query: string, limit?: number) => Promise<NotionPagePayload[]>;
}

function createQdrantServiceStub(overrides: Partial<QdrantServiceStub> = {}): QdrantServiceStub {
  return {
    search: async () => [],
    ...overrides,
  };
}

describe('SearchController', () => {
  describe('search', () => {
    it('should return empty results for empty query', async () => {
      let searchCalled = false;

      const qdrantService = createQdrantServiceStub({
        search: async () => {
          searchCalled = true;
          return [];
        },
      });

      const controller = new SearchController(qdrantService as unknown as QdrantService);
      const result = await controller.search('', undefined);

      expect(result).toEqual({
        results: [],
        query: '',
        limit: 0,
      });
      expect(searchCalled).toBe(false);
    });

    it('should return empty results for whitespace query', async () => {
      let searchCalled = false;

      const qdrantService = createQdrantServiceStub({
        search: async () => {
          searchCalled = true;
          return [];
        },
      });

      const controller = new SearchController(qdrantService as unknown as QdrantService);
      const result = await controller.search('   ', undefined);

      expect(result).toEqual({
        results: [],
        query: '',
        limit: 0,
      });
      expect(searchCalled).toBe(false);
    });

    it('should search with default limit of 5', async () => {
      let searchQuery: string | undefined;
      let searchLimit: number | undefined;

      const qdrantService = createQdrantServiceStub({
        search: async (query, limit) => {
          searchQuery = query;
          searchLimit = limit;
          return [{ id: 'page-1', title: 'Test', content: 'Content' }];
        },
      });

      const controller = new SearchController(qdrantService as unknown as QdrantService);
      const result = await controller.search('test query', undefined);

      expect(searchQuery).toBe('test query');
      expect(searchLimit).toBe(5);
      expect(result).toEqual({
        results: [{ id: 'page-1', title: 'Test', content: 'Content' }],
        query: 'test query',
        limit: 5,
      });
    });

    it('should respect custom limit parameter', async () => {
      let searchLimit: number | undefined;

      const qdrantService = createQdrantServiceStub({
        search: async (_query, limit) => {
          searchLimit = limit;
          return [];
        },
      });

      const controller = new SearchController(qdrantService as unknown as QdrantService);
      await controller.search('test', '10');

      expect(searchLimit).toBe(10);
    });

    it('should cap limit at 20', async () => {
      let searchLimit: number | undefined;

      const qdrantService = createQdrantServiceStub({
        search: async (_query, limit) => {
          searchLimit = limit;
          return [];
        },
      });

      const controller = new SearchController(qdrantService as unknown as QdrantService);
      const result = await controller.search('test', '100');

      expect(searchLimit).toBe(20);
      expect(result.limit).toBe(20);
    });

    it('should default to 5 for invalid limit', async () => {
      let searchLimit: number | undefined;

      const qdrantService = createQdrantServiceStub({
        search: async (_query, limit) => {
          searchLimit = limit;
          return [];
        },
      });

      const controller = new SearchController(qdrantService as unknown as QdrantService);
      const result = await controller.search('test', 'invalid');

      expect(searchLimit).toBe(5);
      expect(result.limit).toBe(5);
    });

    it('should default to 5 for zero limit', async () => {
      let searchLimit: number | undefined;

      const qdrantService = createQdrantServiceStub({
        search: async (_query, limit) => {
          searchLimit = limit;
          return [];
        },
      });

      const controller = new SearchController(qdrantService as unknown as QdrantService);
      const result = await controller.search('test', '0');

      expect(searchLimit).toBe(5);
      expect(result.limit).toBe(5);
    });

    it('should default to 5 for negative limit', async () => {
      let searchLimit: number | undefined;

      const qdrantService = createQdrantServiceStub({
        search: async (_query, limit) => {
          searchLimit = limit;
          return [];
        },
      });

      const controller = new SearchController(qdrantService as unknown as QdrantService);
      const result = await controller.search('test', '-5');

      expect(searchLimit).toBe(5);
      expect(result.limit).toBe(5);
    });
  });
});
