import { Router, Request, Response } from 'express';
import { TutoringOrchestrator } from '@brainule/core';
import { CourseRepository } from '@brainule/storage';
import { TeachingParameters } from '@brainule/core';

export function createTutoringRouter(
  orchestrator: TutoringOrchestrator,
  courseRepo: CourseRepository,
): Router {
  const router = Router();

  // POST /tutor/start
  // body: { studentId, leafTopicId, parameters? }
  // Returns a GeneratedLesson for the given topic
  router.post('/start', async (req: Request, res: Response) => {
    const { studentId, leafTopicId, parameters } = req.body as {
      studentId?: string;
      leafTopicId?: string;
      parameters?: Partial<TeachingParameters>;
    };
    if (!studentId || !leafTopicId) {
      res.status(400).json({ error: 'studentId and leafTopicId are required' });
      return;
    }
    const pkg = await courseRepo.getCoursePackage();
    const lesson = await orchestrator.startTopicLesson(
      studentId,
      pkg.metadata.courseId,
      leafTopicId,
      parameters,
    );
    res.json(lesson);
  });

  // GET /tutor/question
  // query: studentId, leafTopicId
  // Returns the next AssessmentItem for the student
  router.get('/question', async (req: Request, res: Response) => {
    const { studentId, leafTopicId } = req.query as {
      studentId?: string;
      leafTopicId?: string;
    };
    if (!studentId || !leafTopicId) {
      res.status(400).json({ error: 'studentId and leafTopicId are required' });
      return;
    }
    const pkg = await courseRepo.getCoursePackage();
    const question = await orchestrator.getNextQuestion(studentId, pkg.metadata.courseId, leafTopicId);
    res.json(question);
  });

  // POST /tutor/answer
  // body: { studentId, leafTopicId, questionId, answer, latencyMs? }
  // Returns AnswerResult (gradingResult, mastered, remediation?, updatedTopicState)
  router.post('/answer', async (req: Request, res: Response) => {
    const { studentId, leafTopicId, questionId, answer, latencyMs = 0 } = req.body as {
      studentId?: string;
      leafTopicId?: string;
      questionId?: string;
      answer?: string;
      latencyMs?: number;
    };
    if (!studentId || !leafTopicId || !questionId || answer === undefined) {
      res.status(400).json({ error: 'studentId, leafTopicId, questionId, and answer are required' });
      return;
    }
    const pkg = await courseRepo.getCoursePackage();
    const result = await orchestrator.submitAnswer(
      studentId,
      pkg.metadata.courseId,
      leafTopicId,
      questionId,
      answer,
      latencyMs,
    );
    res.json(result);
  });

  // POST /tutor/question
  // body: { leafTopicId, studentQuestion, lessonContent }
  // Returns TutorResponse answering the student's question
  router.post('/question', async (req: Request, res: Response) => {
    const { leafTopicId, studentQuestion, lessonContent = '' } = req.body as {
      leafTopicId?: string;
      studentQuestion?: string;
      lessonContent?: string;
    };
    if (!leafTopicId || !studentQuestion) {
      res.status(400).json({ error: 'leafTopicId and studentQuestion are required' });
      return;
    }
    const response = await orchestrator.answerStudentQuestion(leafTopicId, studentQuestion, lessonContent);
    res.json(response);
  });

  return router;
}
