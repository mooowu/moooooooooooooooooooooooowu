import { Context, Effect } from 'effect';

import { VectorDbError } from './errors';

export { VectorDbError };

export interface VectorRepository {
  readonly createCollection: (
    name: string,
    vectorSize: number,
  ) => Effect.Effect<void, VectorDbError>;

  readonly upsert: (
    collection: string,
    points: Array<{ id: string; vector: number[]; payload?: Record<string, unknown> }>,
  ) => Effect.Effect<void, VectorDbError>;

  readonly delete: (collection: string, ids: string[]) => Effect.Effect<void, VectorDbError>;

  readonly search: (
    collection: string,
    vector: number[],
    limit?: number,
  ) => Effect.Effect<
    Array<{ id: string | number; score: number; payload?: Record<string, unknown> }>,
    VectorDbError
  >;
}

export class VectorRepositoryTag extends Context.Tag('VectorRepository')<
  VectorRepositoryTag,
  VectorRepository
>() {}
