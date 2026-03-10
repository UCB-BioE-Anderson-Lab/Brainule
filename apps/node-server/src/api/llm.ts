import { Router, Request, Response } from 'express';
import { LlmGateway } from '@brainule/llm';
import { config } from '@brainule/shared';

export function createLlmRouter(llmGateway: LlmGateway): Router {
  const router = Router();

  // GET /llm/smoke — dev-only smoke test
  router.get('/smoke', async (_req: Request, res: Response) => {
    if (config.nodeEnv === 'production') {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const response = await llmGateway.generate({
      systemPrompt: 'You are a helpful assistant.',
      userPrompt: 'Say "LLM smoke test OK" and nothing else.',
    });
    res.json({ provider: response.provider, model: response.model, text: response.text });
  });

  return router;
}
