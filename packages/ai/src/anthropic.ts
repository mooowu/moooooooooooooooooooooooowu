import Anthropic from '@anthropic-ai/sdk';
import { VoyageAIClient } from 'voyageai';
import type {
  AnthropicClientConfig,
  ChatCompletionOptions,
  EmbeddingOptions,
  EmbeddingResult,
  LLMClient,
  Message,
} from './types';

export class AnthropicClient implements LLMClient {
  private client: Anthropic;
  private voyageClient: VoyageAIClient;
  private defaultChatModel: string;
  private defaultEmbeddingModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: AnthropicClientConfig = {}) {
    this.client = new Anthropic({
      apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
    this.voyageClient = new VoyageAIClient({
      apiKey: config.voyageApiKey ?? process.env.VOYAGE_API_KEY,
    });
    this.defaultChatModel = config.defaultModel ?? 'claude-sonnet-4-20250514';
    this.defaultEmbeddingModel = config.defaultEmbeddingModel ?? 'voyage-3';
    this.defaultTemperature = config.defaultTemperature ?? 0.7;
    this.defaultMaxTokens = config.defaultMaxTokens ?? 1024;
  }

  async chat(messages: Message[], options: ChatCompletionOptions = {}): Promise<string> {
    const model = options.model ?? this.defaultChatModel;
    const temperature = options.temperature ?? this.defaultTemperature;
    const maxTokens = options.maxTokens ?? this.defaultMaxTokens;

    const { systemMessage, chatMessages } = this.buildMessages(messages);

    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemMessage?.content,
      messages: chatMessages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock?.type === 'text' ? textBlock.text : '';
  }

  async embed(texts: string[], options: EmbeddingOptions = {}): Promise<EmbeddingResult[]> {
    const model = options.model ?? this.defaultEmbeddingModel;

    const response = await this.voyageClient.embed({
      model,
      input: texts,
    });

    return (
      response.data?.map((item, index) => ({
        embedding: item.embedding as number[],
        index,
      })) ?? []
    );
  }

  private buildMessages(messages: Message[]) {
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
    return { systemMessage, chatMessages };
  }
}
