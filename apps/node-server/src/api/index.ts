import { Express, Request, Response } from 'express';
import { healthRouter } from './health';
import { createCourseRouter } from './course';
import { createStudentRouter } from './student';
import { createLlmRouter } from './llm';
import { createCorpusRouter } from './corpus';
import { createLessonRouter } from './lesson';
import { createAssessmentRouter } from './assessment';
import { createTutoringRouter } from './tutoring';
import { courseRepo, studentService, corpusRetrievalAgent, tutorAgent, assessmentService, tutoringOrchestrator } from '../context';
import { llmGateway } from '../adapters/llm';

export function registerRoutes(app: Express): void {
  app.get('/app-bootstrap', async (_req: Request, res: Response) => {
    const pkg = await courseRepo.getCoursePackage();
    res.json({ courseId: pkg.metadata.courseId, courseTitle: pkg.metadata.title });
  });

  app.use(healthRouter);
  app.use(createCourseRouter(courseRepo));
  app.use('/students', createStudentRouter(studentService, courseRepo));
  app.use('/llm', createLlmRouter(llmGateway));
  app.use('/corpus', createCorpusRouter(corpusRetrievalAgent, courseRepo));
  app.use('/lessons', createLessonRouter(tutorAgent, corpusRetrievalAgent, studentService, courseRepo));
  app.use('/students', createAssessmentRouter(assessmentService, courseRepo));
  app.use('/tutor', createTutoringRouter(tutoringOrchestrator, courseRepo));
}
