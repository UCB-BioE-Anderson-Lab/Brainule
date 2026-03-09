# M9 — Event Logging

**Goal:** Implement structured event logging for all meaningful system events. Every lesson
generation, quiz interaction, grading result, and mastery change is logged with a consistent
schema. Initial backend: in-memory log (dev) and Google Sheets tab (prod, wired in M12).

**Depends on:** M7 (all agent outputs to log exist)

---

## Implementation Tasks

### Type definitions (`packages/core/src/types/events.ts`)
- [ ] `EventType` union type — all required event types:
  ```
  'lesson_generated' | 'student_question' | 'tutor_response' |
  'question_served' | 'answer_submitted' | 'answer_graded' |
  'failure_analyzed' | 'remediation_generated' | 'topic_mastered' |
  'feedback_captured' | 'policy_assigned' | 'session_analyzed'
  ```
- [ ] `EventLog` interface:
  - `eventId: string` (UUID)
  - `eventType: EventType`
  - `studentId: string`
  - `courseId: string`
  - `leafTopicId: string`
  - `sessionId: string`
  - `policyAssignmentId?: string`
  - `promptName?: string`
  - `promptHash?: string`
  - `llmProvider?: string`
  - `llmModel?: string`
  - `payload: Record<string, unknown>`
  - `createdAt: string` (ISO 8601)
- [ ] Zod schema for `EventLog` in `packages/core/src/schemas/events.ts`

### EventLogRepository interface (`packages/storage/src/index.ts`)
- [ ] `EventLogRepository` interface:
  - `logEvent(event: EventLog): Promise<void>`
  - `getEvents(filter: EventFilter): Promise<EventLog[]>`
- [ ] `EventFilter` interface: `{ studentId?, leafTopicId?, eventType?, fromDate?, limit? }`
- [ ] `InMemoryEventLogRepository` in `packages/storage/src/memory/eventLog.ts`:
  - Stores events in array, supports filtering
  - Max 10,000 events in memory (oldest evicted with a warning)

### EventLogger service (`packages/core/src/services/eventLogger.ts`)
- [ ] `EventLogger` class:
  - Constructor: `(repo: EventLogRepository, courseId: string, sessionId: string)`
  - `log(eventType: EventType, studentId: string, leafTopicId: string, payload: Record<string, unknown>, meta?: Partial<EventLog>): Promise<void>`
  - Generates `eventId` (UUID v4) and `createdAt` automatically
  - Silent on failure (logs error to `console.error` but never throws — logging must not break tutoring)

### Wire EventLogger into TutoringOrchestrator
- [ ] Pass `EventLogger` as constructor dependency
- [ ] `startTopicLesson` → logs `lesson_generated` with `{ promptName, promptHash, llmProvider, parameters }`
- [ ] `submitAnswer` (correct) → logs `answer_submitted`, `answer_graded`, and `topic_mastered`
- [ ] `submitAnswer` (incorrect) → logs `answer_submitted`, `answer_graded`, `failure_analyzed`, `remediation_generated`
- [ ] `getNextQuestion` → logs `question_served` with `{ questionId, questionType, difficulty }`
- [ ] `answerStudentQuestion` → logs `student_question` and `tutor_response`

### UUID utility (`packages/shared/src/utils/uuid.ts`)
- [ ] `generateId(): string` using Node.js `crypto.randomUUID()`

### Session ID
- [ ] Sessions are created per browser tab (frontend generates UUID and sends with every request in header `X-Session-Id`)
- [ ] Server reads `X-Session-Id` header and passes to `EventLogger`

### Server endpoint (`apps/node-server/src/api/events.ts`)
- [ ] `GET /events` query params: `studentId, leafTopicId, eventType, limit` → returns filtered event log (dev/debug only)

---

## Behavioral Acceptance Checklist

- [ ] After `POST /tutor/start`, `GET /events?studentId=alice&eventType=lesson_generated` returns at least 1 event
- [ ] The `lesson_generated` event has non-empty `promptName`, `promptHash`, `llmProvider`, `llmModel`
- [ ] After a correct answer, `GET /events?studentId=alice&eventType=topic_mastered` returns an event for the mastered leaf topic
- [ ] After an incorrect answer, both `failure_analyzed` and `remediation_generated` events appear in the log
- [ ] Each `question_served` event has `questionId`, `questionType`, and `difficulty` in `payload`
- [ ] `EventLog.eventId` is unique across all logged events (no collisions)
- [ ] Logging failure (e.g., repo throws) does not cause `POST /tutor/answer` to return an error
- [ ] `X-Session-Id` header sent from frontend appears in all logged events for that session
- [ ] Events are stored with `createdAt` in ISO 8601 format and sorted ascending in the log
- [ ] `GET /events?limit=5` returns at most 5 events
- [ ] All events pass zod `EventLog` schema validation when deserialized
