import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Effect } from 'effect';
import { Pool } from 'pg';

import { VectorDbError, VectorRepository } from './vector.repository';

@Injectable()
export class PgVectorRepository implements VectorRepository, OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      connectionString: this.configService.get<string>('POSTGRES_URL'),
    });
  }

  async onModuleInit() {
    await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector');
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  createCollection = (name: string, vectorSize: number) =>
    Effect.tryPromise({
      try: async () => {
        const tableName = this.sanitizeTableName(name);
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS ${tableName} (
            id TEXT PRIMARY KEY,
            embedding vector(${vectorSize}),
            payload JSONB DEFAULT '{}'::jsonb
          )
        `);
        await this.pool.query(`
          CREATE INDEX IF NOT EXISTS ${tableName}_embedding_idx
          ON ${tableName}
          USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100)
        `);
      },
      catch: (error) => new VectorDbError({ message: 'Failed to create collection', cause: error }),
    });

  upsert = (
    collection: string,
    points: Array<{ id: string; vector: number[]; payload?: Record<string, unknown> }>,
  ) =>
    Effect.tryPromise({
      try: async () => {
        const tableName = this.sanitizeTableName(collection);
        const client = await this.pool.connect();
        try {
          await client.query('BEGIN');
          for (const point of points) {
            const vectorStr = `[${point.vector.join(',')}]`;
            await client.query(
              `
              INSERT INTO ${tableName} (id, embedding, payload)
              VALUES ($1, $2::vector, $3::jsonb)
              ON CONFLICT (id) DO UPDATE SET
                embedding = EXCLUDED.embedding,
                payload = EXCLUDED.payload
              `,
              [point.id, vectorStr, JSON.stringify(point.payload ?? {})],
            );
          }
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      },
      catch: (error) => new VectorDbError({ message: 'Failed to upsert points', cause: error }),
    });

  delete = (collection: string, ids: string[]) =>
    Effect.tryPromise({
      try: async () => {
        const tableName = this.sanitizeTableName(collection);
        await this.pool.query(`DELETE FROM ${tableName} WHERE id = ANY($1)`, [ids]);
      },
      catch: (error) => new VectorDbError({ message: 'Failed to delete points', cause: error }),
    });

  search = (collection: string, vector: number[], limit = 5) =>
    Effect.tryPromise({
      try: async () => {
        const tableName = this.sanitizeTableName(collection);
        const vectorStr = `[${vector.join(',')}]`;
        const result = await this.pool.query(
          `
          SELECT id, payload, 1 - (embedding <=> $1::vector) as score
          FROM ${tableName}
          ORDER BY embedding <=> $1::vector
          LIMIT $2
          `,
          [vectorStr, limit],
        );
        return result.rows.map(
          (row: { id: string; score: number; payload?: Record<string, unknown> }) => ({
            id: row.id,
            score: row.score,
            payload: row.payload,
          }),
        );
      },
      catch: (error) => new VectorDbError({ message: 'Failed to search', cause: error }),
    });

  private sanitizeTableName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }
}
