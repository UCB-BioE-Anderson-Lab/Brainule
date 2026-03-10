import { logger, config } from '@brainule/shared';
import { LlmClient, LlmRequest, LlmResponse } from './index';
import { OpenAiClient } from './clients/openai';
import { GeminiClient } from './clients/gemini';
import { MockLlmClient } from './clients/mock';

function hashPrompt(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16);
}

export class LlmGateway {
  constructor(
    private readonly client: LlmClient,
    private readonly defaultModel: string,
  ) {}

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const response = await this.client.generate(request);
    logger.debug('LLM call', {
      provider: response.provider,
      model: response.model,
      requestId: response.requestId,
      promptHash: hashPrompt(request.userPrompt),
    });
    return response;
  }
}

export function createLlmClient(provider: string): LlmClient {
  switch (provider) {
    case 'openai': return new OpenAiClient();
    case 'gemini': return new GeminiClient();
    case 'mock': return new MockLlmClient();
    default:
      throw new Error(`Unknown LLM provider: ${provider}. Supported: openai, gemini, mock`);
  }
}

export function createLlmGateway(): LlmGateway {
  const provider = config.llmProvider;
  const model = config.llmModel ?? (provider === 'gemini' ? 'gemini-1.5-pro' : 'gpt-4o');
  const client = createLlmClient(provider);
  return new LlmGateway(client, model);
}
