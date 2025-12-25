import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { Effect } from 'effect';
import { NotionService } from '../services/notion.service';
import { NotionWebhookEventData } from '../transports/notion-webhook';

@Controller()
export class NotionWebhookController {
  private readonly logger = new Logger(NotionWebhookController.name);

  constructor(private readonly notionService: NotionService) {}

  @MessagePattern('page.created')
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

  @MessagePattern('page.updated')
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

  @MessagePattern('page.deleted')
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
