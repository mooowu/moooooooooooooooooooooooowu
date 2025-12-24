export interface NotionWebhookOptions {
  port?: number;
  path?: string;
  verificationToken?: string;
}

export interface NotionWebhookEvent {
  type: string;
  data: NotionWebhookEventData;
  verification_token?: string;
  timestamp: string;
}

export interface NotionWebhookEventData {
  object: string;
  id: string;
  parent?: {
    type: string;
    page_id?: string;
    database_id?: string;
    workspace?: boolean;
  };
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface NotionVerificationRequest {
  verification_token: string;
  challenge: string;
}

export const NOTION_WEBHOOK_OPTIONS = Symbol('NOTION_WEBHOOK_OPTIONS');
