# M7 — Remediation Loop (MVP Complete)

**Goal:** Implement `FailureAnalysisAgent`, wire the full tutoring loop
(lesson → quiz → grade → failure analysis → remediation → new question), and
verify end-to-end MVP behavior. After M7, the system is functionally complete for a
single student working through a single topic.

**Depends on:** M1, M2, M3, M5, M6

---

## Implementation Tasks

### Type definitions (`packages/core/src/types/remediation.ts`)
- [ ] `FailureAnalysis` interface:
  - `failureAnalysisId: string`
  - `studentId: string`
  - `leafTopicId: string`
  - `questionId: string`
  - `likelyMisconceptionIds: string[]`
  - `failureType: 'conceptual' | 'procedural' | 'careless' | 'language' | 'unknown'`
  - `summary: string`
  - `remediationHints: string[]`

### FailureAnalysisAgent (`packages/core/src/agents/failureAnalysisAgent.ts`)
- [ ] `FailureAnalysisAgent` class:
  - Constructor: `(llmGateway: LlmGateway, promptRepo: PromptRepository)`
  - `analyze(input: FailureAnalysisInput): Promise<FailureAnalysis>`
- [ ] `FailureAnalysisInput` interface:
  - `studentId: string`
  - `question: AssessmentItem`
  - `studentAnswer: string`
  - `gradingResult: GradingResult`
  - `leafTopic: LeafTopic`
  - `topicMisconceptions: Misconception[]`
- [ ] Implementation:
  1. Load `grading/failure-analysis.md` prompt
  2. Substitute: question prompt, student answer, grading notes, misconceptions list
  3. Call LLM with `responseFormat: 'json'`
  4. Parse response into `FailureAnalysis`
  5. Match `likelyMisconceptionIds` against provided misconceptions list (LLM may name labels; match by label or id)
  6. Fallback to `failureType: 'unknown'` if LLM response fails to parse

### TutorAgent — remediation (`packages/core/src/agents/tutorAgent.ts`)
- [ ] Add `generateRemediation(input: RemediationInput): Promise<GeneratedLesson>` (stubbed in M5)
- [ ] `RemediationInput` interface:
  - `leafTopic: LeafTopic`
  - `contentPack: RetrievedContentPack`
  - `failureAnalysis: FailureAnalysis`
  - `studentTopicState: StudentTopicState`
  - `parameters: TeachingParameters`
- [ ] Implementation uses `tutor/remediation.md` prompt, substitutes failure evidence
- [ ] Remediation prompt must explicitly instruct LLM:
  - Explain the underlying concept, not just the missed question
  - Do NOT reveal the answer to the failed question
  - The next quiz question will be a *different* question from the same topic

### TutoringOrchestrator (`packages/core/src/orchestration/tutoringOrchestrator.ts`)
- [ ] `TutoringOrchestrator` class:
  - Constructor: `(tutorAgent, assessmentAgent, gradingAgent, failureAnalysisAgent, corpusRetrievalAgent, studentModelService, courseRepo)`
  - `startTopicLesson(studentId: string, leafTopicId: string): Promise<GeneratedLesson>`
  - `submitAnswer(studentId, leafTopicId, questionId, answer, latencyMs): Promise<AnswerResult>`
  - `getNextQuestion(studentId, leafTopicId): Promise<AssessmentItem>`
  - `answerStudentQuestion(studentId, leafTopicId, message): Promise<TutorResponse>`
- [ ] `AnswerResult` interface:
  - `gradingResult: GradingResult`
  - `mastered: boolean`
  - `remediation?: GeneratedLesson` (present when `correct === false`)
  - `updatedTopicState: StudentTopicState`
- [ ] `submitAnswer` orchestration flow:
  1. Grade the answer via `GradingAgent`
  2. Update student state via `StudentModelService`
  3. If correct: return `{ mastered: true/false }`, no remediation
  4. If incorrect:
     a. Load topic misconceptions from course
     b. Call `FailureAnalysisAgent.analyze`
     c. Retrieve fresh corpus pack
     d. Call `TutorAgent.generateRemediation`
     e. Return remediation in `AnswerResult`

### Server endpoints (`apps/node-server/src/api/tutoring.ts`)
- [ ] `POST /tutor/start` body: `{ studentId, leafTopicId }` → calls `startTopicLesson`, returns `GeneratedLesson`
- [ ] `POST /tutor/answer` body: `{ studentId, leafTopicId, questionId, answer, latencyMs }` → returns `AnswerResult`
- [ ] `POST /tutor/question` body: `{ studentId, leafTopicId, message }` → returns `TutorResponse` (in-lesson Q&A)
- [ ] `GET /tutor/next-question` query: `studentId, leafTopicId` → returns `AssessmentItem`

---

## Behavioral Acceptance Checklist

End-to-end loop tests (can be run with `LLM_PROVIDER=mock`):

- [ ] `POST /tutor/start` returns a `GeneratedLesson` with non-empty `content`
- [ ] `GET /tutor/next-question` returns an `AssessmentItem` for the active topic
- [ ] `POST /tutor/answer` with the correct answer returns `{ correct: true, mastered: true, remediation: null }`
- [ ] `POST /tutor/answer` with an incorrect answer returns `{ correct: false, mastered: false }` and `remediation` is a non-empty `GeneratedLesson`
- [ ] The `remediation.content` does not contain the literal answer to the failed question (verify prompt instruction is working)
- [ ] After remediation, `GET /tutor/next-question` returns a **different** `questionId` than the one that was just failed
- [ ] After a second correct answer following remediation, `GET /students/alice/progress` shows `mastered: true`
- [ ] `POST /tutor/question` with `"Can you give me an example?"` returns a `TutorResponse` that stays on topic
- [ ] `FailureAnalysisAgent` with a wrong MC answer returns a `FailureAnalysis` with a populated `summary` and at least one `remediationHint`
- [ ] `FailureAnalysis.likelyMisconceptionIds` contains IDs that exist in the course's misconception library
- [ ] `TutoringOrchestrator` composes all agents without any agent knowing about others (injected via constructor)
- [ ] Entire loop works with `LLM_PROVIDER=mock` (no live API calls required for integration test)
