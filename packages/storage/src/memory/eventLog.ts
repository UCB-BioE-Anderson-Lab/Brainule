import { EventLog, EventFilter } from '@brainule/core';
import { logger } from '@brainule/shared';
import { EventLogRepository } from '../repositories/eventLog';

const MAX_EVENTS = 10_000;

export class InMemoryEventLogRepository implements EventLogRepository {
  private events: EventLog[] = [];

  async logEvent(event: EventLog): Promise<void> {
    if (this.events.length >= MAX_EVENTS) {
      this.events.shift();
      logger.warn('InMemoryEventLogRepository: max capacity reached, oldest event evicted');
    }
    this.events.push(event);
  }

  async getEvents(filter: EventFilter): Promise<EventLog[]> {
    let result = [...this.events];

    if (filter.studentId) result = result.filter((e) => e.studentId === filter.studentId);
    if (filter.leafTopicId) result = result.filter((e) => e.leafTopicId === filter.leafTopicId);
    if (filter.eventType) result = result.filter((e) => e.eventType === filter.eventType);
    if (filter.fromDate) result = result.filter((e) => e.createdAt >= filter.fromDate!);
    if (filter.limit) result = result.slice(-filter.limit);

    return result;
  }
}
