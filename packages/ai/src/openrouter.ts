import OpenAI from 'openai';
import type {
  ChatCompletionOptions,
  EmbeddingOptions,
  EmbeddingResult,
  LLMClient,
  Message,
  OpenRouterClientConfig,
} from './types';

export class OpenRouterClient implements LLMClient {
  private client: OpenAI;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: OpenRouterClientConfig = {}) {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.apiKey ?? process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': config.siteUrl ?? process.env.OPENROUTER_SITE_URL,
        'X-Title': config.siteName ?? process.env.OPENROUTER_SITE_NAME,
      },
    });
    this.defaultModel = config.defaultModel ?? 'openai/gpt-4o-mini';
    this.defaultTemperature = config.defaultTemperature ?? 0.7;
    this.defaultMaxTokens = config.defaultMaxTokens ?? 1024;
  }

  async chat(messages: Message[], options: ChatCompletionOptions = {}): Promise<string> {
    const model = options.model ?? this.defaultModel;
    const temperature = options.temperature ?? this.defaultTemperature;
    const maxTokens = options.maxTokens ?? this.defaultMaxTokens;

    const response = await this.client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return response.choices[0]?.message?.content ?? '';
  }

  async embed(texts: string[], options: EmbeddingOptions = {}): Promise<EmbeddingResult[]> {
    const model = options.model ?? 'openai/text-embedding-3-small';

    const response = await this.client.embeddings.create({
      model,
      input: texts,
    });

    return response.data.map((item) => ({
      embedding: item.embedding,
      index: item.index,
    }));
  }
}
