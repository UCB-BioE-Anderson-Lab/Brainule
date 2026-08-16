import { Router, Request, Response } from 'express';
import { AssessmentService, AssessmentAgent, toServedItem } from '@brainule/core';
import { CourseRepository } from '@brainule/storage';
import { config } from '@brainule/shared';
import { asyncHandler } from './asyncHandler';

export function createAssessmentRouter(
  assessmentService: AssessmentService,
  courseRepo: CourseRepository,
): Router {
  const router = Router({ mergeParams: true });

  // GET /students/:studentId/topics/:leafTopicId/question
  router.get('/:studentId/topics/:leafTopicId/question', asyncHandler(async (req: Request, res: Response) => {
    const { studentId, leafTopicId } = req.params;
    const pkg = await courseRepo.getCoursePackage();
    // NoQuestionsAvailableError is mapped to 404 by the central error handler.
    const question = await assessmentService.getNextQuestion(studentId, pkg.metadata.courseId, leafTopicId);
    // answerKey/rubric are withheld until the answer is submitted
    res.json(toServedItem(question));
  }));

  // POST /students/:studentId/topics/:leafTopicId/answer
  // body: { questionId, answer, latencyMs }
  router.post('/:studentId/topics/:leafTopicId/answer', asyncHandler(async (req: Request, res: Response) => {
    const { studentId, leafTopicId } = req.params;
    const { questionId, answer, latencyMs = 0 } = req.body as {
      questionId?: string;
      answer?: string;
      latencyMs?: number;
    };
    if (!questionId || answer === undefined) {
      res.status(400).json({ error: 'questionId and answer are required' });
      return;
    }
    const pkg = await courseRepo.getCoursePackage();
    const { gradingResult, updatedState } = await assessmentService.submitAnswer(
      studentId,
      pkg.metadata.courseId,
      leafTopicId,
      questionId,
      answer,
      latencyMs,
    );
    const topicState = updatedState.topicStates.find((ts) => ts.leafTopicId === leafTopicId);
    res.json({ gradingResult, mastered: topicState?.mastered ?? false });
  }));

  return router;
}

export function createQuestionsRouter(assessmentAgent: AssessmentAgent): Router {
  const router = Router();

  // GET /questions/:questionId — dev-only lookup of a single item, answer key
  // included. Disabled in production so it cannot be used to read answers.
  router.get('/:questionId', asyncHandler(async (req: Request, res: Response) => {
    if (config.nodeEnv === 'production') {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const question = await assessmentAgent.getQuestion(req.params.questionId);
    if (!question) {
      res.status(404).json({ error: `Question not found: ${req.params.questionId}` });
      return;
    }
    res.json(question);
  }));

  return router;
}
