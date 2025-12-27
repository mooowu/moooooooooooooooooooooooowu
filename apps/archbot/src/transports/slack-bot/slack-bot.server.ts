import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { App, AppOptions } from '@slack/bolt';
import { isObservable, lastValueFrom } from 'rxjs';
import { SLACK_PATTERN_PREFIX, SlackPatternType } from './slack-bot.decorators';

export class SlackBotServer extends Server implements CustomTransportStrategy {
  private app: App;

  constructor(options: AppOptions) {
    super();
    this.app = new App(options);
  }

  async listen(callback: () => void): Promise<void> {
    this.registerHandlers();

    try {
      await this.app.start(process.env.PORT || 3000);
      this.logger.log('Slack Bot server listening');
      callback();
    } catch (error) {
      this.logger.error('Failed to start Slack Bot server', error);
    }
  }

  async close(): Promise<void> {
    await this.app.stop();
  }

  public unwrap<T>(): T {
    return this.app as unknown as T;
  }

  public on<EventKey extends string = string, EventCallback extends Function = Function>(
    _event: EventKey,
    _callback: EventCallback,
  ): void {}

  private registerHandlers() {
    this.messageHandlers.forEach((handler, pattern) => {
      if (!pattern.startsWith(SLACK_PATTERN_PREFIX)) {
        return;
      }

      const { type, trigger } = this.parsePattern(pattern);
      if (!type || !trigger) {
        this.logger.warn(`Invalid Slack pattern: ${pattern}`);
        return;
      }

      const boltHandler = async (args: any) => {
        try {
          const resultOrStream = await handler(args, {
            pattern,
            trigger,
            type,
          });

          if (isObservable(resultOrStream)) {
            await lastValueFrom(resultOrStream);
          }
        } catch (error) {
          this.logger.error(`Error handling Slack event ${pattern}`, error);
        }
      };

      switch (type) {
        case SlackPatternType.EVENT:
          this.app.event(trigger, boltHandler);
          break;
        case SlackPatternType.MESSAGE:
          const msgTrigger = trigger.startsWith('REGEXP:')
            ? new RegExp(trigger.replace('REGEXP:', ''))
            : trigger;
          this.app.message(msgTrigger, boltHandler);
          break;
        case SlackPatternType.COMMAND:
          this.app.command(trigger, boltHandler);
          break;
        case SlackPatternType.ACTION:
          const actionTrigger = trigger.startsWith('REGEXP:')
            ? new RegExp(trigger.replace('REGEXP:', ''))
            : trigger;
          this.app.action(actionTrigger, boltHandler);
          break;
        case SlackPatternType.SHORTCUT:
          const shortcutTrigger = trigger.startsWith('REGEXP:')
            ? new RegExp(trigger.replace('REGEXP:', ''))
            : trigger;
          this.app.shortcut(shortcutTrigger, boltHandler);
          break;
        default:
          this.logger.warn(`Unknown Slack pattern type: ${type}`);
      }
    });
  }

  private parsePattern(pattern: string): { type: SlackPatternType | null; trigger: string | null } {
    const parts = pattern.split(':');
    if (parts.length < 3) {
      return { type: null, trigger: null };
    }
    const type = parts[1] as SlackPatternType;
    const trigger = parts.slice(2).join(':');

    return { type, trigger };
  }
}
