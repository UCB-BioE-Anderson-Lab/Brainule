import { Router, Request, Response } from 'express';
import { TutoringOrchestrator, EventLogger, TeachingParameters, AnalysisAgent } from '@brainule/core';
import { CourseRepository, EventLogRepository, InMemorySessionSummaryRepository } from '@brainule/storage';

function makeLogger(req: Request, repo: EventLogRepository, courseId: string): EventLogger {
  const sessionId = (req.headers['x-session-id'] as string | undefined) ?? 'unknown';
  return new EventLogger(repo, courseId, sessionId);
}

export function createTutoringRouter(
  orchestrator: TutoringOrchestrator,
  courseRepo: CourseRepository,
  eventLogRepo: EventLogRepository,
  analysisAgent?: AnalysisAgent,
  sessionSummaryRepo?: InMemorySessionSummaryRepository,
): Router {
  const router = Router();

  // POST /tutor/start
  // body: { studentId, leafTopicId, parameters? }
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
    const logger = makeLogger(req, eventLogRepo, pkg.metadata.courseId);
    const lesson = await orchestrator.startTopicLesson(
      studentId, pkg.metadata.courseId, leafTopicId, parameters, logger,
    );
    res.json(lesson);
  });

  // GET /tutor/question
  // query: studentId, leafTopicId
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
    const logger = makeLogger(req, eventLogRepo, pkg.metadata.courseId);
    const question = await orchestrator.getNextQuestion(
      studentId, pkg.metadata.courseId, leafTopicId, logger,
    );
    res.json(question);
  });

  // POST /tutor/answer
  // body: { studentId, leafTopicId, questionId, answer, latencyMs?, policyAssignmentId? }
  router.post('/answer', async (req: Request, res: Response) => {
    const { studentId, leafTopicId, questionId, answer, latencyMs = 0, policyAssignmentId } = req.body as {
      studentId?: string;
      leafTopicId?: string;
      questionId?: string;
      answer?: string;
      latencyMs?: number;
      policyAssignmentId?: string;
    };
    if (!studentId || !leafTopicId || !questionId || answer === undefined) {
      res.status(400).json({ error: 'studentId, leafTopicId, questionId, and answer are required' });
      return;
    }
    const pkg = await courseRepo.getCoursePackage();
    const logger = makeLogger(req, eventLogRepo, pkg.metadata.courseId);
    const result = await orchestrator.submitAnswer(
      studentId, pkg.metadata.courseId, leafTopicId, questionId, answer, latencyMs, logger, policyAssignmentId,
    );
    res.json(result);
  });

  // POST /tutor/question
  // body: { studentId, leafTopicId, studentQuestion, lessonContent? }
  router.post('/question', async (req: Request, res: Response) => {
    const { studentId, leafTopicId, studentQuestion, lessonContent = '' } = req.body as {
      studentId?: string;
      leafTopicId?: string;
      studentQuestion?: string;
      lessonContent?: string;
    };
    if (!leafTopicId || !studentQuestion) {
      res.status(400).json({ error: 'leafTopicId and studentQuestion are required' });
      return;
    }
    const pkg = await courseRepo.getCoursePackage();
    const logger = studentId ? makeLogger(req, eventLogRepo, pkg.metadata.courseId) : undefined;
    const response = await orchestrator.answerStudentQuestion(
      studentId ?? 'anonymous', leafTopicId, studentQuestion, lessonContent, logger,
    );
    res.json(response);
  });

  // POST /tutor/end-session
  // body: { studentId, sessionId }
  // Triggers async session analysis; responds immediately with { ok: true }
  router.post('/end-session', async (req: Request, res: Response) => {
    const { studentId, sessionId } = req.body as {
      studentId?: string;
      sessionId?: string;
    };
    if (!studentId || !sessionId) {
      res.status(400).json({ error: 'studentId and sessionId are required' });
      return;
    }

    res.json({ ok: true, message: 'Session analysis queued' });

    // Fire-and-forget async analysis
    if (analysisAgent && sessionSummaryRepo) {
      (async () => {
        try {
          const pkg = await courseRepo.getCoursePackage();
          const events = await eventLogRepo.getEvents({ studentId });
          // Filter to this session
          const sessionEvents = events.filter((e) => e.sessionId === sessionId);
          const result = await analysisAgent.analyzeSession({
            sessionId,
            studentId,
            courseId: pkg.metadata.courseId,
            events: sessionEvents,
          });
          await sessionSummaryRepo.save(result.summary);

          // Log session_analyzed event
          const logger = new EventLogger(eventLogRepo, pkg.metadata.courseId, sessionId);
          logger.log('session_analyzed', studentId, sessionEvents[0]?.leafTopicId ?? '', {
            topicsCovered: result.summary.topicsCovered,
            masteredThisSession: result.summary.masteredThisSession,
            totalCorrect: result.summary.totalCorrect,
            totalIncorrect: result.summary.totalIncorrect,
          });
        } catch (err) {
          console.error('Session analysis failed:', err);
        }
      })();
    }
  });

  return router;
}
