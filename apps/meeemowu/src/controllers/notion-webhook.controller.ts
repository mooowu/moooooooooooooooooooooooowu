import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { NotionWebhookEventData } from '../transports/notion-webhook';

@Controller()
export class NotionWebhookController {
  private readonly logger = new Logger(NotionWebhookController.name);

  @MessagePattern('page.created')
  async handlePageCreated(data: NotionWebhookEventData): Promise<{ success: boolean }> {
    return { success: true };
  }

  @MessagePattern('page.updated')
  async handlePageUpdated(data: NotionWebhookEventData): Promise<{ success: boolean }> {
    return { success: true };
  }

  @MessagePattern('page.deleted')
  async handlePageDeleted(data: NotionWebhookEventData): Promise<{ success: boolean }> {
    return { success: true };
  }
}
