import { Router } from 'express';

export const healthRouter: Router = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0' });
});
