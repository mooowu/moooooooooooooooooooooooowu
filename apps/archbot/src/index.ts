import { App } from '@slack/bolt';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  url?: string;
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
  limit: number;
}

const MEEEMOWU_URL = process.env.MEEEMOWU_URL ?? 'http://localhost:3000';

async function searchNotion(query: string, limit = 5): Promise<SearchResult[]> {
  try {
    const url = new URL('/search', MEEEMOWU_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(limit));

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`Search failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = (await response.json()) as SearchResponse;
    return data.results;
  } catch (error) {
    console.error('Error searching Notion:', error);
    return [];
  }
}

function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No results found.';
  }

  return results
    .map((result, index) => {
      const snippet = result.content.slice(0, 200) + (result.content.length > 200 ? '...' : '');
      const urlPart = result.url ? ` (<${result.url}|View>)` : '';
      return `*${index + 1}. ${result.title}*${urlPart}\n${snippet}`;
    })
    .join('\n\n');
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Slash command: /search <query>
app.command('/search', async ({ command, ack, respond }) => {
  await ack();

  const query = command.text.trim();
  if (!query) {
    await respond('Please provide a search query. Usage: `/search <query>`');
    return;
  }

  await respond(`Searching for: "${query}"...`);

  const results = await searchNotion(query);
  const formatted = formatSearchResults(results);

  await respond({
    text: `Search results for "${query}"`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Search results for "${query}":*\n\n${formatted}`,
        },
      },
    ],
  });
});

// Respond to app mentions with context from Notion
app.event('app_mention', async ({ event, say }) => {
  const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

  if (!text) {
    await say(
      `Hello <@${event.user}>! How can I help you? Try mentioning me with a question and I'll search our Notion workspace for relevant information.`,
    );
    return;
  }

  const results = await searchNotion(text, 3);

  if (results.length === 0) {
    await say(
      `Sorry <@${event.user}>, I couldn't find any relevant information about "${text}" in our Notion workspace.`,
    );
    return;
  }

  const context = results
    .map((r) => `**${r.title}**\n${r.content.slice(0, 500)}`)
    .join('\n\n---\n\n');

  await say({
    text: `Here's what I found related to your question:`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<@${event.user}> Here's what I found related to your question:\n\n${formatSearchResults(results)}`,
        },
      },
    ],
  });
});

app.message('hello', async ({ message, say }) => {
  if (message.subtype === undefined || message.subtype === 'bot_message') {
    await say(
      'Hello! I am Archbot. Mention me with a question to search our Notion workspace, or use `/search <query>` to find information.',
    );
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('Archbot is running!');
  console.log(`Connected to meeemowu at: ${MEEEMOWU_URL}`);
})();
