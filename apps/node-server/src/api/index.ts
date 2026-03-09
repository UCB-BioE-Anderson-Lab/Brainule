import { Express } from 'express';
import { healthRouter } from './health';

export function registerRoutes(app: Express): void {
  app.use(healthRouter);
  // Additional routers registered here as milestones are implemented.
}
