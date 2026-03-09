# M2 — Student State & Mastery

**Goal:** Define the full `StudentState` type hierarchy, implement an in-memory
`StudentStateRepository`, implement mastery policy logic, and expose student progress
via a server endpoint.

**Depends on:** M1 (needs `LeafTopic` type for mastery checks)

---

## Implementation Tasks

### Type definitions (`packages/core/src/types/student.ts`)
- [ ] `StudentInteractionProfile` interface:
  - `preferredStyleIndicators: Record<string, number>`
  - `preferredToneIndicators: Record<string, number>`
  - `sentimentTrend: number`
  - `persistenceTrend: number`
  - `verbosityTolerance: number`
  - `visualizationAffinity: number`
- [ ] `StudentTopicState` interface:
  - `studentId, leafTopicId: string`
  - `mastered: boolean`
  - `masteryScore: number`
  - `attemptCount, correctCount, incorrectCount: number`
  - `recentQuestionIds: string[]`
  - `recentMisconceptionIds: string[]`
  - `frustrationScore: number`
  - `averageResponseLatencyMs: number`
  - `lastLessonPolicyId?: string`
  - `lastSeenAt?: string`
- [ ] `StudentState` interface:
  - `studentId: string`
  - `activeCourseId: string`
  - `topicStates: StudentTopicState[]`
  - `globalInteractionProfile: StudentInteractionProfile`
  - `createdAt, updatedAt: string`
- [ ] `FeedbackEvent` interface (eventId, studentId, leafTopicId, type, value, capturedAt)
- [ ] Zod schemas for all student types in `packages/core/src/schemas/student.ts`

### Mastery Policy (`packages/core/src/policies/masteryPolicy.ts`)
- [ ] `MasteryPolicyConfig` interface:
  - `policyId: string`
  - `type: string`
  - `minimumCorrect: number`
  - `requiredQuestionTypes?: string[]`
  - `requiredDelayCheck?: boolean`
- [ ] `MasteryPolicy` class:
  - `isMastered(topicState: StudentTopicState, config: MasteryPolicyConfig): boolean`
  - Default config: `minimumCorrect: 1` (baseline per spec)
- [ ] Load mastery policy config from `packages/shared/src/config/index.ts`
- [ ] Policy must be swappable without changing agent code

### Student model helpers (`packages/core/src/services/studentModel.ts`)
- [ ] `createFreshStudentState(studentId: string, courseId: string): StudentState`
- [ ] `getOrCreateTopicState(state: StudentState, leafTopicId: string): StudentTopicState`
- [ ] `recordCorrectAnswer(state: StudentState, leafTopicId: string, questionId: string, latencyMs: number): StudentState`
- [ ] `recordIncorrectAnswer(state: StudentState, leafTopicId: string, questionId: string, latencyMs: number, misconceptionIds?: string[]): StudentState`
- [ ] `applyMasteryCheck(state: StudentState, leafTopicId: string, policy: MasteryPolicyConfig): StudentState`
- [ ] All functions are **pure** (no side effects, return new state)

### StudentModelService (`packages/core/src/services/studentModelService.ts`)
- [ ] `StudentModelService` class wrapping `StudentStateRepository`
- [ ] `getStudentState(studentId: string): Promise<StudentState>` — creates fresh if not found
- [ ] `saveStudentState(state: StudentState): Promise<void>`
- [ ] `markAnswerAndCheckMastery(studentId, leafTopicId, questionId, correct, latencyMs): Promise<StudentState>`

### Repository interface (`packages/storage/src/index.ts`)
- [ ] `StudentStateRepository` interface:
  - `getStudentState(studentId: string): Promise<StudentState | null>`
  - `saveStudentState(state: StudentState): Promise<void>`
- [ ] `InMemoryStudentStateRepository` in `packages/storage/src/memory/studentState.ts`
  - Stores state in a `Map<string, StudentState>`
  - `getStudentState` returns deep clone to prevent mutation
  - `saveStudentState` stores deep clone

### Server endpoint (`apps/node-server/src/api/student.ts`)
- [ ] `GET /students/:studentId/progress` — returns:
  ```json
  {
    "studentId": "...",
    "activeCourseId": "...",
    "topicStates": [
      { "leafTopicId": "...", "mastered": false, "attemptCount": 0, "correctCount": 0 }
    ]
  }
  ```
- [ ] `POST /students/:studentId` — creates a student session (body: `{ courseId }`)

---

## Behavioral Acceptance Checklist

- [ ] `POST /students/alice` with `{ "courseId": "bioe_234" }` creates a student and returns a fresh `StudentState`
- [ ] `GET /students/alice/progress` returns topic states for all leaf topics in the course (mastered: false, all counts 0)
- [ ] After calling `recordCorrectAnswer`, `correctCount` increments and `recentQuestionIds` includes the question
- [ ] After 1 correct answer, `applyMasteryCheck` with `minimumCorrect: 1` sets `mastered: true`
- [ ] After 0 correct answers, `applyMasteryCheck` with `minimumCorrect: 1` leaves `mastered: false`
- [ ] `InMemoryStudentStateRepository.saveStudentState` followed by `getStudentState` returns identical data
- [ ] Mutating the returned state from `getStudentState` does **not** affect the stored state (deep clone verified)
- [ ] `createFreshStudentState` returns a valid state that passes zod schema validation
- [ ] Mastery policy can be set to `minimumCorrect: 2` via config without any agent code changes
- [ ] TypeScript: `StudentState` is fully typed — no `any` fields
