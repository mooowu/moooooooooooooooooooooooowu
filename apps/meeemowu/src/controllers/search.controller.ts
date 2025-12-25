import { Controller, Get, Query, Logger } from '@nestjs/common';
import { QdrantService, NotionPagePayload } from '../services/qdrant.service';

export interface SearchResult {
  results: NotionPagePayload[];
  query: string;
  limit: number;
}

@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly qdrantService: QdrantService) {}

  @Get()
  async search(@Query('q') query: string, @Query('limit') limit?: string): Promise<SearchResult> {
    if (!query || query.trim() === '') {
      return {
        results: [],
        query: '',
        limit: 0,
      };
    }

    const parsedLimit = limit ? parseInt(limit, 10) : 5;
    const effectiveLimit = isNaN(parsedLimit) || parsedLimit < 1 ? 5 : Math.min(parsedLimit, 20);

    this.logger.log(`Searching for: "${query}" (limit: ${effectiveLimit})`);

    const results = await this.qdrantService.search(query, effectiveLimit);

    this.logger.log(`Found ${results.length} results`);

    return {
      results,
      query,
      limit: effectiveLimit,
    };
  }
}
