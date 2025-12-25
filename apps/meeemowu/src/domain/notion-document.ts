import { NotionWebhookEventData } from '../transports/notion-webhook';

export class NotionDocument {
  readonly id: string;
  readonly parentType?: string;
  readonly parentId?: string;
  readonly content: string;

  private constructor(id: string, content: string, parentType?: string, parentId?: string) {
    this.id = id;
    this.content = content;
    this.parentType = parentType;
    this.parentId = parentId;
  }

  hasContent(): boolean {
    return this.content.trim().length > 0;
  }

  toPayload(): Record<string, unknown> {
    return {
      pageId: this.id,
      parentType: this.parentType,
      parentId: this.parentId,
      content: this.content,
    };
  }

  static fromWebhookData(data: NotionWebhookEventData): NotionDocument {
    const content = NotionDocument.extractTextContent(data.properties);
    return new NotionDocument(
      data.id,
      content,
      data.parent?.type,
      data.parent?.page_id ?? data.parent?.database_id,
    );
  }

  private static extractTextContent(properties?: Record<string, unknown>): string {
    if (!properties) return '';

    const parts: string[] = [];
    for (const [key, value] of Object.entries(properties)) {
      const extracted = NotionDocument.extractPropertyValue(value);
      if (extracted) {
        parts.push(`${key}: ${extracted}`);
      }
    }
    return parts.join('\n');
  }

  private static extractPropertyValue(value: unknown): string | null {
    if (!value || typeof value !== 'object') return null;

    const prop = value as Record<string, unknown>;

    if (prop.type === 'title' && Array.isArray(prop.title)) {
      return prop.title.map((t: { plain_text?: string }) => t.plain_text ?? '').join('');
    }

    if (prop.type === 'rich_text' && Array.isArray(prop.rich_text)) {
      return prop.rich_text.map((t: { plain_text?: string }) => t.plain_text ?? '').join('');
    }

    if (prop.type === 'number' && typeof prop.number === 'number') {
      return String(prop.number);
    }

    if (prop.type === 'select' && prop.select && typeof prop.select === 'object') {
      return (prop.select as { name?: string }).name ?? null;
    }

    if (prop.type === 'multi_select' && Array.isArray(prop.multi_select)) {
      return prop.multi_select.map((s: { name?: string }) => s.name ?? '').join(', ');
    }

    if (prop.type === 'date' && prop.date && typeof prop.date === 'object') {
      const date = prop.date as { start?: string; end?: string };
      return date.end ? `${date.start} - ${date.end}` : (date.start ?? null);
    }

    if (prop.type === 'checkbox' && typeof prop.checkbox === 'boolean') {
      return prop.checkbox ? 'Yes' : 'No';
    }

    if (prop.type === 'url' && typeof prop.url === 'string') {
      return prop.url;
    }

    if (prop.type === 'email' && typeof prop.email === 'string') {
      return prop.email;
    }

    if (prop.type === 'phone_number' && typeof prop.phone_number === 'string') {
      return prop.phone_number;
    }

    return null;
  }
}
