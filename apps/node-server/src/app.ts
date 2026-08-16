import express, { Express, Request, Response, NextFunction } from 'express';
import * as path from 'path';
import { logger } from '@brainule/shared';
import { NoQuestionsAvailableError } from '@brainule/core';
import { registerRoutes } from './api/index';

// Resolved from this file, not the current working directory, so the static
// assets are found whether the server runs from src/ (tsx) or dist/ (node).
const publicDir = path.resolve(__dirname, '..', 'public');

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(express.static(publicDir));

  registerRoutes(app);

  // JSON 404 for unmatched API paths
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Central error handler — every async route funnels here via asyncHandler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    const status = err instanceof NoQuestionsAvailableError ? 404 : 500;
    logger.error('Request failed', {
      method: req.method,
      path: req.path,
      status,
      error: err.message,
    });
    res.status(status).json({ error: err.message });
  });

  return app;
}
