import { Express, Request, Response } from 'express';
import { generateId } from '@brainule/shared';
import { healthRouter } from './health';
import { createCourseRouter } from './course';
import { createStudentRouter } from './student';
import { createLlmRouter } from './llm';
import { createCorpusRouter } from './corpus';
import { createLessonRouter } from './lesson';
import { createAssessmentRouter, createQuestionsRouter } from './assessment';
import { createTutoringRouter } from './tutoring';
import { asyncHandler } from './asyncHandler';
import { courseRepo, studentService, corpusRetrievalAgent, tutorAgent, assessmentAgent, assessmentService, tutoringOrchestrator } from '../context';
import { llmGateway } from '../adapters/llm';

export function registerRoutes(app: Express): void {
  // GET /app-bootstrap?studentId=… — page init payload. Echoes back the
  // student id the browser already has, or mints one for a first-time visitor.
  app.get('/app-bootstrap', asyncHandler(async (req: Request, res: Response) => {
    const pkg = await courseRepo.getCoursePackage();
    const studentId = (req.query.studentId as string | undefined) || generateId();
    res.json({ courseId: pkg.metadata.courseId, courseTitle: pkg.metadata.title, studentId });
  }));

  app.use(healthRouter);
  app.use(createCourseRouter(courseRepo));
  app.use('/students', createStudentRouter(studentService, courseRepo));
  app.use('/questions', createQuestionsRouter(assessmentAgent));
  app.use('/llm', createLlmRouter(llmGateway));
  app.use('/corpus', createCorpusRouter(corpusRetrievalAgent, courseRepo));
  app.use('/lessons', createLessonRouter(tutorAgent, corpusRetrievalAgent, studentService, courseRepo));
  app.use('/students', createAssessmentRouter(assessmentService, courseRepo));
  app.use('/tutor', createTutoringRouter(tutoringOrchestrator, courseRepo));
}
