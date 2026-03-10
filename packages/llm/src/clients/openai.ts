import OpenAI from 'openai';
import { config } from '@brainule/shared';
import { LlmClient, LlmRequest, LlmResponse, LlmError } from '../index';

const DEFAULT_MODEL = 'gpt-4o';

export class OpenAiClient implements LlmClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: config.openaiApiKey });
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const model = request.model ?? config.llmModel ?? DEFAULT_MODEL;
    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      temperature: request.temperature,
    };
    if (request.responseFormat === 'json') {
      params.response_format = { type: 'json_object' };
    }

    try {
      const completion = await this.client.chat.completions.create(params);
      const text = completion.choices[0]?.message?.content ?? '';
      let structured: unknown;
      if (request.responseFormat === 'json') {
        try {
          structured = JSON.parse(text);
        } catch {
          // return raw text if parse fails
        }
      }
      return {
        text,
        structured,
        raw: completion,
        provider: 'openai',
        model: completion.model,
        requestId: completion.id,
      };
    } catch (err) {
      if (err instanceof OpenAI.APIError) {
        throw new LlmError(err.message, 'openai', err.status, err.status === 429);
      }
      throw err;
    }
  }
}
