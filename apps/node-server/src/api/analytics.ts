import { Router, Request, Response } from 'express';
import { AnalysisAgent, EventLogger } from '@brainule/core';
import { CourseRepository, EventLogRepository, PolicyRepository, InMemorySessionSummaryRepository } from '@brainule/storage';
import { StudentModelService } from '@brainule/core';

export function createAnalyticsRouter(
  analysisAgent: AnalysisAgent,
  courseRepo: CourseRepository,
  eventLogRepo: EventLogRepository,
  policyRepo: PolicyRepository,
  sessionSummaryRepo: InMemorySessionSummaryRepository,
  studentService: StudentModelService,
): Router {
  const router = Router();

  // GET /analytics/topics — per-leaf-topic success rate and average attempts
  router.get('/topics', async (_req: Request, res: Response) => {
    const pkg = await courseRepo.getCoursePackage();
    const allEvents = await eventLogRepo.getEvents({});

    const answerGradedByTopic = new Map<string, { correct: number; total: number; attempts: Map<string, number> }>();

    for (const lt of pkg.leafTopics) {
      answerGradedByTopic.set(lt.leafTopicId, { correct: 0, total: 0, attempts: new Map() });
    }

    for (const e of allEvents) {
      if (e.eventType !== 'answer_graded') continue;
      const stats = answerGradedByTopic.get(e.leafTopicId);
      if (!stats) continue;
      stats.total += 1;
      if (e.payload?.['correct']) stats.correct += 1;
      // Track attempts per student for averaging
      const key = `${e.studentId}`;
      stats.attempts.set(key, (stats.attempts.get(key) ?? 0) + 1);
    }

    const topics = pkg.leafTopics.map((lt) => {
      const stats = answerGradedByTopic.get(lt.leafTopicId) ?? { correct: 0, total: 0, attempts: new Map() };
      const successRate = stats.total > 0 ? stats.correct / stats.total : 0;
      const avgAttempts = stats.attempts.size > 0
        ? [...stats.attempts.values()].reduce((a, b) => a + b, 0) / stats.attempts.size
        : 0;
      return {
        leafTopicId: lt.leafTopicId,
        title: lt.title,
        successRate: Math.round(successRate * 100) / 100,
        averageAttempts: Math.round(avgAttempts * 10) / 10,
      };
    });

    res.json(topics);
  });

  // GET /analytics/policies?leafTopicId=X — PolicyPerformance[] sorted by success rate
  router.get('/policies', async (req: Request, res: Response) => {
    const { leafTopicId } = req.query as { leafTopicId?: string };
    if (!leafTopicId) {
      res.status(400).json({ error: 'leafTopicId is required' });
      return;
    }
    const perfs = await policyRepo.getAllPerformances(leafTopicId);
    const sorted = perfs.sort((a, b) => {
      const rateA = a.impressions > 0 ? a.successCount / a.impressions : 0;
      const rateB = b.impressions > 0 ? b.successCount / b.impressions : 0;
      return rateB - rateA;
    });
    res.json(sorted);
  });

  // GET /analytics/student/:studentId — StudentState + session summaries
  router.get('/student/:studentId', async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const pkg = await courseRepo.getCoursePackage();
    const state = await studentService.getStudentState(studentId, pkg.metadata.courseId);
    const summaries = await sessionSummaryRepo.getByStudent(studentId);
    res.json({ studentState: state, sessionSummaries: summaries });
  });

  // GET /analytics/misconceptions — misconception frequency sorted descending
  router.get('/misconceptions', async (_req: Request, res: Response) => {
    const allEvents = await eventLogRepo.getEvents({ eventType: 'failure_analyzed' });
    const freq: Record<string, number> = {};
    for (const e of allEvents) {
      const ids = e.payload?.['likelyMisconceptionIds'];
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (typeof id === 'string') freq[id] = (freq[id] ?? 0) + 1;
        }
      }
    }
    const sorted = Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .map(([misconceptionId, count]) => ({ misconceptionId, count }));
    res.json(sorted);
  });

  // GET /analytics/sessions — list of SessionSummaryNote entries
  router.get('/sessions', async (_req: Request, res: Response) => {
    const summaries = await sessionSummaryRepo.getAll();
    res.json(summaries);
  });

  return router;
}
