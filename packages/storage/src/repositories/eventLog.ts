import { EventLog, EventFilter } from '@brainule/core';

export interface EventLogRepository {
  logEvent(event: EventLog): Promise<void>;
  getEvents(filter: EventFilter): Promise<EventLog[]>;
}
