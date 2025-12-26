import { Controller, Logger } from '@nestjs/common';
import { Effect } from 'effect';

import { NotionService } from '../services/notion.service';
import { NotionEvent, NotionEventType, NotionWebhookEventData } from '../transports/notion-webhook';

@Controller()
export class NotionWebhookController {
  private readonly logger = new Logger(NotionWebhookController.name);

  constructor(private readonly notionService: NotionService) {}

  @NotionEvent(NotionEventType.PageCreated)
  async handlePageCreated(data: NotionWebhookEventData): Promise<{ success: boolean }> {
    const program = this.notionService.ensureCollection().pipe(
      Effect.flatMap(() => this.notionService.indexPage(data)),
      Effect.match({
        onSuccess: () => ({ success: true }),
        onFailure: (error) => {
          this.logger.error('Failed to index created page', error);
          return { success: false };
        },
      }),
    );

    return Effect.runPromise(program);
  }

  @NotionEvent(NotionEventType.PageUpdated)
  async handlePageUpdated(data: NotionWebhookEventData): Promise<{ success: boolean }> {
    const program = this.notionService.indexPage(data).pipe(
      Effect.match({
        onSuccess: () => ({ success: true }),
        onFailure: (error) => {
          this.logger.error('Failed to index updated page', error);
          return { success: false };
        },
      }),
    );

    return Effect.runPromise(program);
  }

  @NotionEvent(NotionEventType.PageContentUpdated)
  async handlePageContentUpdated(data: NotionWebhookEventData): Promise<{ success: boolean }> {
    const program = this.notionService.indexPage(data).pipe(
      Effect.match({
        onSuccess: () => ({ success: true }),
        onFailure: (error) => {
          this.logger.error('Failed to index content updated page', error);
          return { success: false };
        },
      }),
    );

    return Effect.runPromise(program);
  }

  @NotionEvent(NotionEventType.PageDeleted)
  async handlePageDeleted(data: NotionWebhookEventData): Promise<{ success: boolean }> {
    const program = this.notionService.deletePage(data.id).pipe(
      Effect.match({
        onSuccess: () => ({ success: true }),
        onFailure: (error) => {
          this.logger.error('Failed to delete page from index', error);
          return { success: false };
        },
      }),
    );

    return Effect.runPromise(program);
  }
}
