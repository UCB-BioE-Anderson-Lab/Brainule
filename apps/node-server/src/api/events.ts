import { Router, Request, Response } from 'express';
import { EventFilter } from '@brainule/core';
import { EventLogRepository } from '@brainule/storage';

export function createEventsRouter(eventLogRepo: EventLogRepository): Router {
  const router = Router();

  // GET /events — dev/debug endpoint; returns filtered event log
  // query: studentId?, leafTopicId?, eventType?, fromDate?, limit?
  router.get('/', async (req: Request, res: Response) => {
    const { studentId, leafTopicId, eventType, fromDate, limit } = req.query as Record<string, string | undefined>;
    const filter: EventFilter = {
      studentId,
      leafTopicId,
      eventType: eventType as EventFilter['eventType'],
      fromDate,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    const events = await eventLogRepo.getEvents(filter);
    res.json({ count: events.length, events });
  });

  return router;
}
