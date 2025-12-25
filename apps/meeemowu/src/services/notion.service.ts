import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMClient, OpenAIClient } from '@moooooooooooooooooooooooowu/ai';
import { Data, Effect } from 'effect';
import {
  VectorDbError,
  VectorRepository,
  VectorRepositoryTag,
} from '../repositories/vector.repository';
import { NotionWebhookEventData } from '../transports/notion-webhook';

export class NotionServiceError extends Data.TaggedError('NotionServiceError')<{
  message: string;
  cause?: unknown;
}> {}

export class EmbeddingError extends Data.TaggedError('EmbeddingError')<{
  message: string;
  cause?: unknown;
}> {}

const COLLECTION_NAME = 'notion_pages';
const VECTOR_SIZE = 1536;

@Injectable()
export class NotionService {
  private readonly llmClient: LLMClient;

  constructor(
    private readonly configService: ConfigService,
    @Inject(VectorRepositoryTag)
    private readonly vectorRepository: VectorRepository,
  ) {
    this.llmClient = new OpenAIClient({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  ensureCollection(): Effect.Effect<void, VectorDbError> {
    return this.vectorRepository.createCollection(COLLECTION_NAME, VECTOR_SIZE);
  }

  indexPage(
    data: NotionWebhookEventData,
  ): Effect.Effect<void, NotionServiceError | EmbeddingError | VectorDbError> {
    const content = this.extractTextContent(data);

    if (!content.trim()) {
      return Effect.void;
    }

    return this.createEmbedding(content).pipe(
      Effect.flatMap((embedding) =>
        this.vectorRepository.upsert(COLLECTION_NAME, [
          {
            id: data.id,
            vector: embedding,
            payload: {
              pageId: data.id,
              parentType: data.parent?.type,
              parentId: data.parent?.page_id ?? data.parent?.database_id,
              content,
            },
          },
        ]),
      ),
    );
  }

  deletePage(pageId: string): Effect.Effect<void, VectorDbError> {
    return this.vectorRepository.delete(COLLECTION_NAME, [pageId]);
  }

  searchSimilar(
    query: string,
    limit = 5,
  ): Effect.Effect<
    Array<{
      id: string | number;
      score: number;
      payload?: Record<string, unknown>;
    }>,
    EmbeddingError | VectorDbError
  > {
    return this.createEmbedding(query).pipe(
      Effect.flatMap((embedding) =>
        this.vectorRepository.search(COLLECTION_NAME, embedding, limit),
      ),
    );
  }

  private extractTextContent(data: NotionWebhookEventData): string {
    const parts: string[] = [];

    if (data.properties) {
      for (const [key, value] of Object.entries(data.properties)) {
        const extracted = this.extractPropertyValue(value);
        if (extracted) {
          parts.push(`${key}: ${extracted}`);
        }
      }
    }

    return parts.join('\n');
  }

  private extractPropertyValue(value: unknown): string | null {
    if (!value || typeof value !== 'object') return null;

    const prop = value as Record<string, unknown>;

    if (prop.type === 'title' && Array.isArray(prop.title)) {
      return prop.title.map((t: { plain_text?: string }) => t.plain_text ?? '').join('');
    }

    if (prop.type === 'rich_text' && Array.isArray(prop.rich_text)) {
      return prop.rich_text.map((t: { plain_text?: string }) => t.plain_text ?? '').join('');
    }

    if (prop.type === 'number' && typeof prop.number === 'number') {
      return String(prop.number);
    }

    if (prop.type === 'select' && prop.select && typeof prop.select === 'object') {
      return (prop.select as { name?: string }).name ?? null;
    }

    if (prop.type === 'multi_select' && Array.isArray(prop.multi_select)) {
      return prop.multi_select.map((s: { name?: string }) => s.name ?? '').join(', ');
    }

    if (prop.type === 'date' && prop.date && typeof prop.date === 'object') {
      const date = prop.date as { start?: string; end?: string };
      return date.end ? `${date.start} - ${date.end}` : (date.start ?? null);
    }

    if (prop.type === 'checkbox' && typeof prop.checkbox === 'boolean') {
      return prop.checkbox ? 'Yes' : 'No';
    }

    if (prop.type === 'url' && typeof prop.url === 'string') {
      return prop.url;
    }

    if (prop.type === 'email' && typeof prop.email === 'string') {
      return prop.email;
    }

    if (prop.type === 'phone_number' && typeof prop.phone_number === 'string') {
      return prop.phone_number;
    }

    return null;
  }

  private createEmbedding(text: string): Effect.Effect<number[], EmbeddingError> {
    return Effect.tryPromise({
      try: async () => {
        const results = await this.llmClient.embed([text]);
        if (results.length === 0) {
          throw new Error('No embedding returned');
        }
        return results[0].embedding;
      },
      catch: (error) =>
        new EmbeddingError({
          message: 'Failed to create embedding',
          cause: error,
        }),
    });
  }
}
