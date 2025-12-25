import { Data } from 'effect';

export class NotionServiceError extends Data.TaggedError('NotionServiceError')<{
  message: string;
  cause?: unknown;
}> {}

export class EmbeddingError extends Data.TaggedError('EmbeddingError')<{
  message: string;
  cause?: unknown;
}> {}
