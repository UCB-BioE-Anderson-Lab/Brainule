import { LlmClient, LlmRequest, LlmResponse } from '../index';

const DEFAULT_JSON = { result: 'Mock JSON response.', ok: true };

export interface MockLlmClientOptions {
  defaultResponse?: string;
  responses?: Record<string, string>;
}

export class MockLlmClient implements LlmClient {
  public calls: LlmRequest[] = [];
  private defaultResponse: string;
  private responses: Record<string, string>;

  constructor(options: MockLlmClientOptions = {}) {
    this.defaultResponse = options.defaultResponse ?? 'Mock LLM response.';
    this.responses = options.responses ?? {};
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    this.calls.push(request);

    // Find first key that appears in userPrompt
    let text = this.defaultResponse;
    for (const [key, value] of Object.entries(this.responses)) {
      if (request.userPrompt.includes(key)) {
        text = value;
        break;
      }
    }

    let structured: unknown;
    if (request.responseFormat === 'json') {
      try {
        structured = JSON.parse(text);
      } catch {
        text = JSON.stringify(DEFAULT_JSON);
        structured = DEFAULT_JSON;
      }
    }

    return Promise.resolve({
      text,
      structured,
      provider: 'mock',
      model: 'mock',
    });
  }
}
