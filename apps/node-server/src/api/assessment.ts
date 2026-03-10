import { Router, Request, Response } from 'express';
import { AssessmentService, NoQuestionsAvailableError } from '@brainule/core';
import { CourseRepository } from '@brainule/storage';

export function createAssessmentRouter(
  assessmentService: AssessmentService,
  courseRepo: CourseRepository,
): Router {
  const router = Router({ mergeParams: true });

  // GET /students/:studentId/topics/:leafTopicId/question
  router.get('/:studentId/topics/:leafTopicId/question', async (req: Request, res: Response) => {
    const { studentId, leafTopicId } = req.params;
    const pkg = await courseRepo.getCoursePackage();
    try {
      const question = await assessmentService.getNextQuestion(studentId, pkg.metadata.courseId, leafTopicId);
      res.json(question);
    } catch (err) {
      if (err instanceof NoQuestionsAvailableError) {
        res.status(404).json({ error: err.message });
      } else {
        throw err;
      }
    }
  });

  // POST /students/:studentId/topics/:leafTopicId/answer
  // body: { questionId, answer, latencyMs }
  router.post('/:studentId/topics/:leafTopicId/answer', async (req: Request, res: Response) => {
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
  });

  return router;
}
