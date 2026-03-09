// LLM package — provider-agnostic interface and adapters
// Fully implemented in M3.
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
