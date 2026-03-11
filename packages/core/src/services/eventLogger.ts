import { generateId } from '@brainule/shared';
import { EventLog, EventType } from '../types/events';

export interface EventLogRepository {
  logEvent(event: EventLog): Promise<void>;
  getEvents(filter: import('../types/events').EventFilter): Promise<EventLog[]>;
}

export class EventLogger {
  constructor(
    private readonly repo: EventLogRepository,
    private readonly courseId: string,
    private readonly sessionId: string,
  ) {}

  async log(
    eventType: EventType,
    studentId: string,
    leafTopicId: string,
    payload: Record<string, unknown>,
    meta?: Partial<Pick<EventLog, 'promptName' | 'promptHash' | 'llmProvider' | 'llmModel' | 'policyAssignmentId'>>,
  ): Promise<void> {
    // Logging must never throw — failures are swallowed silently
    try {
      const event: EventLog = {
        eventId: generateId(),
        eventType,
        studentId,
        courseId: this.courseId,
        leafTopicId,
        sessionId: this.sessionId,
        payload,
        createdAt: new Date().toISOString(),
        ...meta,
      };
      await this.repo.logEvent(event);
    } catch (err) {
      console.error('[EventLogger] Failed to log event:', eventType, err);
    }
  }
}
