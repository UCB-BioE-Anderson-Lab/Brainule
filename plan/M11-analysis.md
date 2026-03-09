# M11 — Analysis & Analytics

**Goal:** Implement `AnalysisAgent` that runs at the end of each tutoring session to update
policy performance statistics, update the student interaction profile, and generate session
summary notes. Expose analytics endpoints for instructor/developer review.

**Depends on:** M9 (event log as input), M10 (PolicyRepository to update)

---

## Implementation Tasks

### Type definitions (`packages/core/src/types/analysis.ts`)
- [ ] `PolicyPerformanceUpdate` interface:
  - `policyId: string`
  - `leafTopicId: string`
  - `deltaSuccessCount: number`
  - `deltaFailureCount: number`
  - `deltaImpressions: number`
  - `newAverageAttemptsToMastery: number`
  - `newAverageSentimentDelta: number`
- [ ] `StudentProfileUpdate` interface:
  - `studentId: string`
  - `preferredStyleIndicators: Record<string, number>` (updated)
  - `sentimentTrend: number`
  - `persistenceTrend: number`
- [ ] `SessionSummaryNote` interface:
  - `sessionId: string`
  - `studentId: string`
  - `courseId: string`
  - `topicsCovered: string[]`
  - `masteredThisSession: string[]`
  - `totalCorrect: number`
  - `totalIncorrect: number`
  - `totalLessons: number`
  - `highlights: string[]` (LLM-generated bullet points)
  - `analyzedAt: string`

### AnalysisAgent (`packages/core/src/agents/analysisAgent.ts`)
- [ ] `AnalysisAgent` class:
  - Constructor: `(llmGateway: LlmGateway, promptRepo: PromptRepository, policyRepo: PolicyRepository)`
  - `analyzeSession(input: SessionAnalysisInput): Promise<SessionAnalysisResult>`
- [ ] `SessionAnalysisInput` interface: `{ sessionId, studentId, courseId, events: EventLog[] }`
- [ ] `SessionAnalysisResult` interface: `{ policyUpdates: PolicyPerformanceUpdate[], profileUpdate: StudentProfileUpdate, summary: SessionSummaryNote }`
- [ ] Implementation:
  1. Filter events by `sessionId`
  2. Group events by `leafTopicId` and `policyAssignmentId`
  3. For each policy assignment: compute outcome (mastered yes/no, attempts count)
  4. Build `PolicyPerformanceUpdate` list
  5. Call `policyRepo.savePolicyPerformance` for each update
  6. Detect style preferences from correct-answer events (which `lessonStyle` correlates with faster mastery)
  7. Build `StudentProfileUpdate`
  8. Call LLM with `analysis/session-review.md` prompt to generate `highlights` (2–4 bullet points)
  9. Return `SessionAnalysisResult`
  10. Log `session_analyzed` event

### Session trigger
- [ ] `POST /tutor/end-session` body: `{ studentId, sessionId }` → triggers `AnalysisAgent.analyzeSession` asynchronously
- [ ] Frontend calls this on tab close (`visibilitychange` event) or explicit "End session" button

### Analytics endpoints (`apps/node-server/src/api/analytics.ts`)
- [ ] `GET /analytics/topics` — returns per-leaf-topic stats:
  ```json
  [{ "leafTopicId": "...", "title": "...", "successRate": 0.72, "averageAttempts": 1.4 }]
  ```
- [ ] `GET /analytics/policies?leafTopicId=X` — returns `PolicyPerformance[]` sorted by `successCount / impressions` desc
- [ ] `GET /analytics/student/:studentId` — returns `StudentState` + session summary notes
- [ ] `GET /analytics/misconceptions` — returns misconception frequency across all graded events
- [ ] `GET /analytics/sessions` — returns list of `SessionSummaryNote` entries

### Misconception frequency tracking
- [ ] `AnalysisAgent` counts `likelyMisconceptionIds` from `failure_analyzed` events in the session
- [ ] Stores incremental counts in `InMemoryMisconceptionFrequencyRepository` (or a simple counter in the event log)

### FeedbackEvent capture (basic)
- [ ] `POST /feedback` body: `{ studentId, leafTopicId, type: "frustration_signal" | "preference_signal", value }` → logs `feedback_captured` event
- [ ] Frontend can show a simple thumbs up/down or emoji sentiment button after each lesson

---

## Behavioral Acceptance Checklist

- [ ] `POST /tutor/end-session` with a valid session completes without error and logs `session_analyzed` event
- [ ] `GET /analytics/topics` returns all leaf topics with `successRate` and `averageAttempts` (0 if no data)
- [ ] After 5 sessions where `example_first` style consistently outperforms `definition_first`, `GET /analytics/policies` ranks `example_first` first
- [ ] `SessionSummaryNote.highlights` contains at least 2 non-empty bullet points (LLM generated)
- [ ] With `LLM_PROVIDER=mock`, session analysis completes (mock returns parseable summary)
- [ ] `GET /analytics/misconceptions` lists misconception IDs with their frequency count, sorted descending
- [ ] `GET /analytics/student/alice` shows all topics, mastery states, and the most recent session summary
- [ ] `POST /feedback` with `{ type: "frustration_signal", value: 1 }` appears in the event log as a `feedback_captured` event
- [ ] `AnalysisAgent` handles empty event list gracefully (returns zeroed `SessionAnalysisResult`)
- [ ] `StudentProfileUpdate.preferredStyleIndicators` shows higher scores for lesson styles that co-occurred with correct answers this session
