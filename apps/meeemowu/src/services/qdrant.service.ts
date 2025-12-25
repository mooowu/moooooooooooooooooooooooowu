import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIClient } from '@moooooooooooooooooooooooowu/ai';

export interface NotionPagePayload {
  id: string;
  title: string;
  content: string;
  url?: string;
  lastEditedTime?: string;
}

export interface VectorClient {
  getCollections(): Promise<{ collections: Array<{ name: string }> }>;
  createCollection(
    name: string,
    config: { vectors: { size: number; distance: string } },
  ): Promise<unknown>;
  upsert(
    collection: string,
    data: { points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }> },
  ): Promise<unknown>;
  delete(collection: string, data: { points: string[] }): Promise<unknown>;
  search(
    collection: string,
    params: { vector: number[]; limit: number; with_payload: boolean },
  ): Promise<Array<{ id: string | number; score: number; payload?: Record<string, unknown> }>>;
}

export interface EmbeddingClient {
  embed(texts: string[]): Promise<Array<{ embedding: number[] }>>;
}

export const VECTOR_CLIENT = Symbol('VECTOR_CLIENT');
export const EMBEDDING_CLIENT = Symbol('EMBEDDING_CLIENT');

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly collectionName = 'notion_pages';
  private readonly vectorSize = 1536;

  constructor(
    @Optional() @Inject(VECTOR_CLIENT) private readonly vectorClient?: VectorClient,
    @Optional() @Inject(EMBEDDING_CLIENT) private readonly embeddingClient?: EmbeddingClient,
  ) {
    if (!this.vectorClient) {
      this.vectorClient = new QdrantClient({
        url: process.env.QDRANT_URL ?? 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY,
      }) as unknown as VectorClient;
    }
    if (!this.embeddingClient) {
      this.embeddingClient = new OpenAIClient();
    }
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  async upsertPage(page: NotionPagePayload): Promise<void> {
    const textToEmbed = `${page.title}\n\n${page.content}`;
    const embeddings = await this.embeddingClient!.embed([textToEmbed]);
    const vector = embeddings[0]?.embedding;

    if (!vector) {
      throw new Error('Failed to generate embedding');
    }

    await this.vectorClient!.upsert(this.collectionName, {
      points: [
        {
          id: page.id,
          vector,
          payload: {
            title: page.title,
            content: page.content,
            url: page.url,
            lastEditedTime: page.lastEditedTime,
          },
        },
      ],
    });
  }

  async deletePage(pageId: string): Promise<void> {
    await this.vectorClient!.delete(this.collectionName, {
      points: [pageId],
    });
  }

  async search(query: string, limit = 5): Promise<NotionPagePayload[]> {
    const embeddings = await this.embeddingClient!.embed([query]);
    const vector = embeddings[0]?.embedding;

    if (!vector) {
      throw new Error('Failed to generate embedding');
    }

    const results = await this.vectorClient!.search(this.collectionName, {
      vector,
      limit,
      with_payload: true,
    });

    return results.map((result) => ({
      id: result.id as string,
      title: result.payload?.title as string,
      content: result.payload?.content as string,
      url: result.payload?.url as string | undefined,
      lastEditedTime: result.payload?.lastEditedTime as string | undefined,
    }));
  }

  private async ensureCollection(): Promise<void> {
    const collections = await this.vectorClient!.getCollections();
    const exists = collections.collections.some((c) => c.name === this.collectionName);

    if (!exists) {
      await this.vectorClient!.createCollection(this.collectionName, {
        vectors: {
          size: this.vectorSize,
          distance: 'Cosine',
        },
      });
    }
  }
}
