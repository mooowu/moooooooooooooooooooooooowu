import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { QdrantService, NotionPagePayload } from '../services/qdrant.service';
import { NotionWebhookEventData } from '../transports/notion-webhook';

@Controller()
export class NotionWebhookController {
  private readonly logger = new Logger(NotionWebhookController.name);

  constructor(private readonly qdrantService: QdrantService) {}

  @MessagePattern('page.created')
  async handlePageCreated(data: NotionWebhookEventData): Promise<{ success: boolean }> {
    this.logger.log(`Page created: ${data.id}`);

    const page = this.extractPagePayload(data);
    await this.qdrantService.upsertPage(page);

    this.logger.log(`Page ${data.id} indexed to Qdrant`);
    return { success: true };
  }

  @MessagePattern('page.updated')
  async handlePageUpdated(data: NotionWebhookEventData): Promise<{ success: boolean }> {
    this.logger.log(`Page updated: ${data.id}`);

    const page = this.extractPagePayload(data);
    await this.qdrantService.upsertPage(page);

    this.logger.log(`Page ${data.id} updated in Qdrant`);
    return { success: true };
  }

  @MessagePattern('page.deleted')
  async handlePageDeleted(data: NotionWebhookEventData): Promise<{ success: boolean }> {
    this.logger.log(`Page deleted: ${data.id}`);

    await this.qdrantService.deletePage(data.id);

    this.logger.log(`Page ${data.id} removed from Qdrant`);
    return { success: true };
  }

  private extractPagePayload(data: NotionWebhookEventData): NotionPagePayload {
    const properties = data.properties ?? {};
    const title = this.extractTitle(properties);
    const content = this.extractContent(data);

    return {
      id: data.id,
      title,
      content,
      url: `https://notion.so/${data.id.replace(/-/g, '')}`,
      lastEditedTime: data.last_edited_time as string | undefined,
    };
  }

  private extractTitle(properties: Record<string, unknown>): string {
    const titleProp = properties.title ?? properties.Name ?? properties.name;
    if (Array.isArray(titleProp)) {
      return titleProp.map((t: { plain_text?: string }) => t.plain_text ?? '').join('');
    }
    if (typeof titleProp === 'object' && titleProp !== null) {
      const titleObj = titleProp as { title?: Array<{ plain_text?: string }> };
      if (Array.isArray(titleObj.title)) {
        return titleObj.title.map((t) => t.plain_text ?? '').join('');
      }
    }
    return 'Untitled';
  }

  private extractContent(data: NotionWebhookEventData): string {
    const content = data.content;
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .map(
          (block: { plain_text?: string; text?: string }) => block.plain_text ?? block.text ?? '',
        )
        .join('\n');
    }
    return '';
  }
}
