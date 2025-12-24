export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface EmbeddingOptions {
  model?: string;
}

export interface EmbeddingResult {
  embedding: number[];
  index: number;
}

export interface LLMClientConfig {
  apiKey?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
}

export interface AnthropicClientConfig extends LLMClientConfig {
  voyageApiKey?: string;
  defaultEmbeddingModel?: string;
}

export interface LLMClient {
  chat(messages: Message[], options?: ChatCompletionOptions): Promise<string>;
  embed(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult[]>;
}
