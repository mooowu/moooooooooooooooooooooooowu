import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchController } from '../search.controller';
import { QdrantService } from '../../services/qdrant.service';

describe('SearchController', () => {
  let controller: SearchController;
  let mockQdrantService: {
    search: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockQdrantService = {
      search: vi.fn().mockResolvedValue([]),
    };

    controller = new SearchController(mockQdrantService as unknown as QdrantService);
  });

  describe('search', () => {
    it('should return empty results for empty query', async () => {
      const result = await controller.search('', undefined);

      expect(result).toEqual({
        results: [],
        query: '',
        limit: 0,
      });
      expect(mockQdrantService.search).not.toHaveBeenCalled();
    });

    it('should return empty results for whitespace query', async () => {
      const result = await controller.search('   ', undefined);

      expect(result).toEqual({
        results: [],
        query: '',
        limit: 0,
      });
      expect(mockQdrantService.search).not.toHaveBeenCalled();
    });

    it('should search with default limit of 5', async () => {
      mockQdrantService.search.mockResolvedValue([
        { id: 'page-1', title: 'Test', content: 'Content' },
      ]);

      const result = await controller.search('test query', undefined);

      expect(mockQdrantService.search).toHaveBeenCalledWith('test query', 5);
      expect(result).toEqual({
        results: [{ id: 'page-1', title: 'Test', content: 'Content' }],
        query: 'test query',
        limit: 5,
      });
    });

    it('should respect custom limit parameter', async () => {
      mockQdrantService.search.mockResolvedValue([]);

      await controller.search('test', '10');

      expect(mockQdrantService.search).toHaveBeenCalledWith('test', 10);
    });

    it('should cap limit at 20', async () => {
      mockQdrantService.search.mockResolvedValue([]);

      const result = await controller.search('test', '100');

      expect(mockQdrantService.search).toHaveBeenCalledWith('test', 20);
      expect(result.limit).toBe(20);
    });

    it('should default to 5 for invalid limit', async () => {
      mockQdrantService.search.mockResolvedValue([]);

      const result = await controller.search('test', 'invalid');

      expect(mockQdrantService.search).toHaveBeenCalledWith('test', 5);
      expect(result.limit).toBe(5);
    });

    it('should default to 5 for zero limit', async () => {
      mockQdrantService.search.mockResolvedValue([]);

      const result = await controller.search('test', '0');

      expect(mockQdrantService.search).toHaveBeenCalledWith('test', 5);
      expect(result.limit).toBe(5);
    });

    it('should default to 5 for negative limit', async () => {
      mockQdrantService.search.mockResolvedValue([]);

      const result = await controller.search('test', '-5');

      expect(mockQdrantService.search).toHaveBeenCalledWith('test', 5);
      expect(result.limit).toBe(5);
    });
  });
});
