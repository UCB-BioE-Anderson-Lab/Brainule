import { Router, Request, Response } from 'express';
import { TutoringOrchestrator, toServedItem } from '@brainule/core';
import { CourseRepository } from '@brainule/storage';
import { TeachingParameters } from '@brainule/core';
import { asyncHandler } from './asyncHandler';

export function createTutoringRouter(
  orchestrator: TutoringOrchestrator,
  courseRepo: CourseRepository,
): Router {
  const router = Router();

  // POST /tutor/start
  // body: { studentId, leafTopicId, parameters? }
  // Returns a GeneratedLesson for the given topic
  router.post('/start', asyncHandler(async (req: Request, res: Response) => {
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
  }));

  // GET /tutor/next-question
  // query: studentId, leafTopicId
  // Returns the next AssessmentItem for the student
  router.get('/next-question', asyncHandler(async (req: Request, res: Response) => {
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
    // answerKey/rubric are withheld until the answer is submitted
    res.json(toServedItem(question));
  }));

  // POST /tutor/answer
  // body: { studentId, leafTopicId, questionId, answer, latencyMs? }
  // Returns AnswerResult (gradingResult, mastered, remediation?, updatedTopicState)
  router.post('/answer', asyncHandler(async (req: Request, res: Response) => {
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
  }));

  // POST /tutor/question
  // body: { studentId, leafTopicId, message, lessonContent? }
  // Returns TutorResponse answering the student's in-lesson question
  router.post('/question', asyncHandler(async (req: Request, res: Response) => {
    const { studentId, leafTopicId, message, lessonContent = '' } = req.body as {
      studentId?: string;
      leafTopicId?: string;
      message?: string;
      lessonContent?: string;
    };
    if (!studentId || !leafTopicId || !message) {
      res.status(400).json({ error: 'studentId, leafTopicId, and message are required' });
      return;
    }
    const pkg = await courseRepo.getCoursePackage();
    const response = await orchestrator.answerStudentTopicQuestion(
      studentId,
      pkg.metadata.courseId,
      leafTopicId,
      message,
      lessonContent,
    );
    res.json(response);
  }));

  return router;
}
