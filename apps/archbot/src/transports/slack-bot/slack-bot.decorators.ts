import { MessagePattern } from '@nestjs/microservices';

export const SLACK_PATTERN_PREFIX = 'slack:';

export enum SlackPatternType {
  EVENT = 'event',
  MESSAGE = 'message',
  COMMAND = 'command',
  ACTION = 'action',
  SHORTCUT = 'shortcut',
}

export function createSlackPattern(type: SlackPatternType, trigger: string | RegExp): string {
  const triggerStr = trigger instanceof RegExp ? `REGEXP:${trigger.source}` : trigger;
  return `${SLACK_PATTERN_PREFIX}${type}:${triggerStr}`;
}

export function SlackEvent(eventName: string): MethodDecorator {
  return MessagePattern(createSlackPattern(SlackPatternType.EVENT, eventName));
}

export function SlackMessage(pattern: string | RegExp): MethodDecorator {
  return MessagePattern(createSlackPattern(SlackPatternType.MESSAGE, pattern));
}

export function SlackCommand(commandName: string): MethodDecorator {
  return MessagePattern(createSlackPattern(SlackPatternType.COMMAND, commandName));
}

export function SlackAction(actionId: string | RegExp): MethodDecorator {
  return MessagePattern(createSlackPattern(SlackPatternType.ACTION, actionId));
}

export function SlackShortcut(callbackId: string | RegExp): MethodDecorator {
  return MessagePattern(createSlackPattern(SlackPatternType.SHORTCUT, callbackId));
}
