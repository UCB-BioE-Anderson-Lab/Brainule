import { Router, Request, Response } from 'express';
import { EventLogger } from '@brainule/core';
import { CourseRepository, EventLogRepository } from '@brainule/storage';

export function createFeedbackRouter(
  courseRepo: CourseRepository,
  eventLogRepo: EventLogRepository,
): Router {
  const router = Router();

  // POST /feedback
  // body: { studentId, leafTopicId, type: "frustration_signal" | "preference_signal", value }
  router.post('/', async (req: Request, res: Response) => {
    const { studentId, leafTopicId, type, value } = req.body as {
      studentId?: string;
      leafTopicId?: string;
      type?: string;
      value?: unknown;
    };
    if (!studentId || !leafTopicId || !type) {
      res.status(400).json({ error: 'studentId, leafTopicId, and type are required' });
      return;
    }

    const pkg = await courseRepo.getCoursePackage();
    const sessionId = (req.headers['x-session-id'] as string | undefined) ?? 'unknown';
    const logger = new EventLogger(eventLogRepo, pkg.metadata.courseId, sessionId);

    logger.log('feedback_captured', studentId, leafTopicId, { type, value });

    res.json({ ok: true });
  });

  return router;
}
