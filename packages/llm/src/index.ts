// LLM package — provider-agnostic interface and adapters
export interface LlmRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  responseFormat?: 'text' | 'json';
  metadata?: Record<string, unknown>;
}

export interface LlmResponse {
  text: string;
  structured?: unknown;
  raw?: unknown;
  provider: string;
  model: string;
  requestId?: string;
}

export interface LlmClient {
  generate(request: LlmRequest): Promise<LlmResponse>;
}

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

export { OpenAiClient } from './clients/openai';
export { GeminiClient } from './clients/gemini';
export { MockLlmClient } from './clients/mock';
export { LlmGateway, createLlmClient, createLlmGateway } from './gateway';
