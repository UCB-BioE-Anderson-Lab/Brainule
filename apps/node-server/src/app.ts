import express, { Express } from 'express';
import * as path from 'path';
import { registerRoutes } from './api/index';

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.resolve(process.cwd(), 'public')));

  registerRoutes(app);

  return app;
}
