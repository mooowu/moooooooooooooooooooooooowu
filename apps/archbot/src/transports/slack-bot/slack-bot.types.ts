import { AppOptions } from '@slack/bolt';

export interface SlackBotOptions extends AppOptions {
  manualStart?: boolean;
}

export interface SlackContext {
  [key: string]: unknown;
}
