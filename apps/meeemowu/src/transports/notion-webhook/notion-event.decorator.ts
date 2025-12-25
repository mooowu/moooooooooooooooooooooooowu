import { MessagePattern } from '@nestjs/microservices';

export enum NotionEventType {
  PageCreated = 'page.created',
  PageUpdated = 'page.updated',
  PageDeleted = 'page.deleted',
  PageRestored = 'page.restored',
  DatabaseCreated = 'database.created',
  DatabaseUpdated = 'database.updated',
  DatabaseDeleted = 'database.deleted',
  BlockCreated = 'block.created',
  BlockUpdated = 'block.updated',
  BlockDeleted = 'block.deleted',
  CommentCreated = 'comment.created',
  CommentUpdated = 'comment.updated',
  CommentDeleted = 'comment.deleted',
}

export const NOTION_EVENT_PREFIX = 'notion:';

export function notionEventPattern(event: NotionEventType): string {
  return `${NOTION_EVENT_PREFIX}${event}`;
}

export function NotionEvent(event: NotionEventType): MethodDecorator {
  return MessagePattern(notionEventPattern(event));
}
