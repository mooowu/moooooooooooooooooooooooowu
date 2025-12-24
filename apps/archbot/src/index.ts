import { App } from '@slack/bolt';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.event('app_mention', async ({ event, say }) => {
  await say(`Hello <@${event.user}>!`);
});

app.message('hello', async ({ message, say }) => {
  if (message.subtype === undefined || message.subtype === 'bot_message') {
    await say('Hello! I am Archbot.');
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('Archbot is running!');
})();
