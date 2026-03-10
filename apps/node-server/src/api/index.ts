import { Express } from 'express';
import { healthRouter } from './health';
import { createCourseRouter } from './course';
import { courseRepo } from '../context';

export function registerRoutes(app: Express): void {
  app.use(healthRouter);
  app.use(createCourseRouter(courseRepo));
}
