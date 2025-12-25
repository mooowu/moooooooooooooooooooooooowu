import { Data } from 'effect';

export class VectorDbError extends Data.TaggedError('VectorDbError')<{
  message: string;
  cause?: unknown;
}> {}
