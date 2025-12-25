import { LLMClient, OpenAIClient } from '@moooooooooooooooooooooooowu/ai';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Data, Effect } from 'effect';
import { NotionDocument } from '../domain/notion-document';
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
    const document = NotionDocument.fromWebhookData(data);

    if (!document.hasContent()) {
      return Effect.void;
    }

    return this.createEmbedding(document.content).pipe(
      Effect.flatMap((embedding) =>
        this.vectorRepository.upsert(COLLECTION_NAME, [
          {
            id: document.id,
            vector: embedding,
            payload: document.toPayload(),
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
