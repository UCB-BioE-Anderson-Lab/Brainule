import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '@brainule/shared';
import { LlmClient, LlmRequest, LlmResponse, LlmError } from '../index';

const DEFAULT_MODEL = 'gemini-1.5-pro';

export class GeminiClient implements LlmClient {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey ?? '');
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const modelName = request.model ?? config.llmModel ?? DEFAULT_MODEL;
    const generationConfig: Record<string, unknown> = {};
    if (request.temperature !== undefined) generationConfig.temperature = request.temperature;
    if (request.responseFormat === 'json') generationConfig.responseMimeType = 'application/json';

    try {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: request.systemPrompt,
        generationConfig,
      });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
      });
      const text = result.response.text();
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
        raw: result,
        provider: 'gemini',
        model: modelName,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new LlmError(msg, 'gemini');
    }
  }
}
