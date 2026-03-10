import { Express } from 'express';
import { healthRouter } from './health';
import { createCourseRouter } from './course';
import { createStudentRouter } from './student';
import { createLlmRouter } from './llm';
import { createCorpusRouter } from './corpus';
import { courseRepo, studentService, corpusRetrievalAgent } from '../context';
import { llmGateway } from '../adapters/llm';

export function registerRoutes(app: Express): void {
  app.use(healthRouter);
  app.use(createCourseRouter(courseRepo));
  app.use('/students', createStudentRouter(studentService, courseRepo));
  app.use('/llm', createLlmRouter(llmGateway));
  app.use('/corpus', createCorpusRouter(corpusRetrievalAgent, courseRepo));
}
