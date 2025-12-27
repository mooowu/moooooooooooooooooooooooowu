import { INestMicroservice } from '@nestjs/common';
import { MicroserviceOptions } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from '@slack/bolt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SlackBotServer } from '../slack-bot.server';
import { TestController } from './fixtures/test.controller';

vi.mock('@slack/bolt', () => {
  return {
    App: class {
      start = vi.fn().mockResolvedValue(undefined);
      stop = vi.fn().mockResolvedValue(undefined);
      event = vi.fn();
      message = vi.fn();
      command = vi.fn();
      action = vi.fn();
      shortcut = vi.fn();
    },
  };
});

describe('SlackBotServer (E2E)', () => {
  let microservice: INestMicroservice;
  let server: SlackBotServer;
  let boltApp: App;

  const getRegisteredHandler = (
    method: 'event' | 'message' | 'command' | 'action' | 'shortcut',
    trigger: string | RegExp,
  ) => {
    const calls = (boltApp[method] as any).mock.calls;
    const call = calls.find((c: any[]) => {
      if (trigger instanceof RegExp) {
        return c[0] instanceof RegExp && c[0].source === trigger.source;
      }
      return c[0] === trigger;
    });
    return call ? call[1] : null;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    TestController.clearAllSpies();

    server = new SlackBotServer({
      token: 'xoxb-test',
      signingSecret: 'test-secret',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
    }).compile();

    microservice = moduleFixture.createNestMicroservice<MicroserviceOptions>({
      strategy: server,
    });

    await microservice.listen();
    boltApp = server.unwrap<App>();
  });

  afterEach(async () => {
    await microservice.close();
  });

  describe('Handler Registration', () => {
    it('should register event handlers with Bolt', () => {
      expect(boltApp.event).toHaveBeenCalledWith('app_mention', expect.any(Function));
      expect(boltApp.event).toHaveBeenCalledWith('error_event', expect.any(Function));
    });

    it('should register message handlers with Bolt (string pattern)', () => {
      expect(boltApp.message).toHaveBeenCalledWith('hello', expect.any(Function));
    });

    it('should register message handlers with Bolt (regex pattern)', () => {
      expect(boltApp.message).toHaveBeenCalledWith(expect.any(RegExp), expect.any(Function));
    });

    it('should register command handlers with Bolt', () => {
      expect(boltApp.command).toHaveBeenCalledWith('/search', expect.any(Function));
    });

    it('should register action handlers with Bolt', () => {
      expect(boltApp.action).toHaveBeenCalledWith('button_click', expect.any(Function));
    });

    it('should register shortcut handlers with Bolt', () => {
      expect(boltApp.shortcut).toHaveBeenCalledWith('open_modal', expect.any(Function));
    });
  });

  describe('Event Handling', () => {
    it('should route app_mention events to controller', async () => {
      const handler = getRegisteredHandler('event', 'app_mention');
      const mockData = {
        type: 'app_mention',
        text: '<@U123> hello',
        user: 'U456',
        channel: 'C789',
      };

      await handler(mockData);

      expect(TestController.eventSpy).toHaveBeenCalledTimes(1);
      expect(TestController.eventSpy).toHaveBeenCalledWith(mockData);
    });

    it('should handle errors in event handlers gracefully', async () => {
      const handler = getRegisteredHandler('event', 'error_event');

      await expect(handler({})).resolves.not.toThrow();
      expect(TestController.errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message Handling', () => {
    it('should route string-pattern messages to controller', async () => {
      const handler = getRegisteredHandler('message', 'hello');
      const mockData = { text: 'hello world', user: 'U123', channel: 'C456' };

      await handler(mockData);

      expect(TestController.messageSpy).toHaveBeenCalledTimes(1);
      expect(TestController.messageSpy).toHaveBeenCalledWith(mockData);
    });

    it('should route regex-pattern messages to controller', async () => {
      const handler = getRegisteredHandler('message', /^help/i);
      const mockData = { text: 'help me please', user: 'U123', channel: 'C456' };

      await handler(mockData);

      expect(TestController.messageSpy).toHaveBeenCalledTimes(1);
      expect(TestController.messageSpy).toHaveBeenCalledWith(mockData);
    });
  });

  describe('Command Handling', () => {
    it('should route slash commands to controller', async () => {
      const handler = getRegisteredHandler('command', '/search');
      const mockData = {
        command: '/search',
        text: 'query string',
        user_id: 'U123',
        channel_id: 'C456',
        ack: vi.fn(),
        respond: vi.fn(),
      };

      await handler(mockData);

      expect(TestController.commandSpy).toHaveBeenCalledTimes(1);
      expect(TestController.commandSpy).toHaveBeenCalledWith(mockData);
    });
  });

  describe('Action Handling', () => {
    it('should route block actions to controller', async () => {
      const handler = getRegisteredHandler('action', 'button_click');
      const mockData = {
        action: { action_id: 'button_click', value: 'clicked' },
        user: { id: 'U123' },
        channel: { id: 'C456' },
        ack: vi.fn(),
      };

      await handler(mockData);

      expect(TestController.actionSpy).toHaveBeenCalledTimes(1);
      expect(TestController.actionSpy).toHaveBeenCalledWith(mockData);
    });
  });

  describe('Shortcut Handling', () => {
    it('should route shortcuts to controller', async () => {
      const handler = getRegisteredHandler('shortcut', 'open_modal');
      const mockData = {
        callback_id: 'open_modal',
        user: { id: 'U123' },
        trigger_id: 'T123',
        ack: vi.fn(),
      };

      await handler(mockData);

      expect(TestController.shortcutSpy).toHaveBeenCalledTimes(1);
      expect(TestController.shortcutSpy).toHaveBeenCalledWith(mockData);
    });
  });

  describe('Microservice Lifecycle', () => {
    it('should start Bolt app when microservice starts', () => {
      expect(boltApp.start).toHaveBeenCalledTimes(1);
    });

    it('should stop Bolt app when microservice closes', async () => {
      await microservice.close();
      expect(boltApp.stop).toHaveBeenCalledTimes(1);
    });
  });
});
