import { Injectable, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIClient } from '@moooooooooooooooooooooooowu/ai';

export interface NotionPagePayload {
  id: string;
  title: string;
  content: string;
  url?: string;
  lastEditedTime?: string;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private client: QdrantClient;
  private openai: OpenAIClient;
  private readonly collectionName = 'notion_pages';
  private readonly vectorSize = 1536;

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL ?? 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
    });
    this.openai = new OpenAIClient();
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  async upsertPage(page: NotionPagePayload): Promise<void> {
    const textToEmbed = `${page.title}\n\n${page.content}`;
    const embeddings = await this.openai.embed([textToEmbed]);
    const vector = embeddings[0]?.embedding;

    if (!vector) {
      throw new Error('Failed to generate embedding');
    }

    await this.client.upsert(this.collectionName, {
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
    await this.client.delete(this.collectionName, {
      points: [pageId],
    });
  }

  async search(query: string, limit = 5): Promise<NotionPagePayload[]> {
    const embeddings = await this.openai.embed([query]);
    const vector = embeddings[0]?.embedding;

    if (!vector) {
      throw new Error('Failed to generate embedding');
    }

    const results = await this.client.search(this.collectionName, {
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
    const collections = await this.client.getCollections();
    const exists = collections.collections.some((c) => c.name === this.collectionName);

    if (!exists) {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: this.vectorSize,
          distance: 'Cosine',
        },
      });
    }
  }
}
