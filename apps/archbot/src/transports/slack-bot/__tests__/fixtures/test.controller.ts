import { Controller } from '@nestjs/common';
import { Mock, vi } from 'vitest';
import {
  SlackAction,
  SlackCommand,
  SlackEvent,
  SlackMessage,
  SlackShortcut,
} from '../../slack-bot.decorators';

@Controller()
export class TestController {
  @SlackEvent('app_mention')
  handleAppMention(data: any) {
    TestController.eventSpy(data);
    return { ok: true, event: 'app_mention' };
  }

  @SlackMessage('hello')
  handleHelloMessage(data: any) {
    TestController.messageSpy(data);
    return { ok: true, message: 'hello' };
  }

  @SlackMessage(/^help/i)
  handleHelpMessage(data: any) {
    TestController.messageSpy(data);
    return { ok: true, message: 'help' };
  }

  @SlackCommand('/search')
  async handleSearchCommand(data: any) {
    TestController.commandSpy(data);
    return { ok: true, command: '/search' };
  }

  @SlackAction('button_click')
  handleButtonAction(data: any) {
    TestController.actionSpy(data);
    return { ok: true, action: 'button_click' };
  }

  @SlackShortcut('open_modal')
  handleOpenModalShortcut(data: any) {
    TestController.shortcutSpy(data);
    return { ok: true, shortcut: 'open_modal' };
  }

  @SlackEvent('error_event')
  handleErrorEvent() {
    TestController.errorSpy();
    throw new Error('Test error');
  }

  static eventSpy: Mock = vi.fn();
  static messageSpy: Mock = vi.fn();
  static commandSpy: Mock = vi.fn();
  static actionSpy: Mock = vi.fn();
  static shortcutSpy: Mock = vi.fn();
  static errorSpy: Mock = vi.fn();

  static clearAllSpies() {
    TestController.eventSpy.mockClear();
    TestController.messageSpy.mockClear();
    TestController.commandSpy.mockClear();
    TestController.actionSpy.mockClear();
    TestController.shortcutSpy.mockClear();
    TestController.errorSpy.mockClear();
  }
}
