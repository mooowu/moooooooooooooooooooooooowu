import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { Effect } from 'effect';
import { VectorDbError, VectorRepository } from './vector.repository';

@Injectable()
export class QdrantRepository implements VectorRepository, OnModuleInit {
  private client: QdrantClient;

  constructor(private readonly configService: ConfigService) {
    this.client = new QdrantClient({
      url: this.configService.get<string>('QDRANT_URL') ?? 'http://localhost:6333',
      apiKey: this.configService.get<string>('QDRANT_API_KEY'),
    });
  }

  onModuleInit() {}

  createCollection = (name: string, vectorSize: number) =>
    Effect.tryPromise({
      try: async () => {
        const result = await this.client.getCollections();
        const exists = result.collections.some((c) => c.name === name);
        if (!exists) {
          await this.client.createCollection(name, {
            vectors: {
              size: vectorSize,
              distance: 'Cosine',
            },
          });
        }
      },
      catch: (error) => new VectorDbError({ message: 'Failed to create collection', cause: error }),
    });

  upsert = (
    collection: string,
    points: Array<{ id: string; vector: number[]; payload?: Record<string, unknown> }>,
  ) =>
    Effect.tryPromise({
      try: () =>
        this.client.upsert(collection, {
          points: points.map((p) => ({
            id: p.id,
            vector: p.vector,
            payload: p.payload,
          })),
        }),
      catch: (error) => new VectorDbError({ message: 'Failed to upsert points', cause: error }),
    }).pipe(Effect.asVoid);

  delete = (collection: string, ids: string[]) =>
    Effect.tryPromise({
      try: () =>
        this.client.delete(collection, {
          points: ids,
        }),
      catch: (error) => new VectorDbError({ message: 'Failed to delete points', cause: error }),
    }).pipe(Effect.asVoid);

  search = (collection: string, vector: number[], limit = 5) =>
    Effect.tryPromise({
      try: async () => {
        const results = await this.client.search(collection, {
          vector,
          limit,
          with_payload: true,
        });
        return results.map((r) => ({
          id: r.id,
          score: r.score,
          payload: r.payload ?? undefined,
        }));
      },
      catch: (error) => new VectorDbError({ message: 'Failed to search', cause: error }),
    });
}
