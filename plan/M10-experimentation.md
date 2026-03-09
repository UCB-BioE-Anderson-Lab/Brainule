# M10 — Experimentation (Teaching Parameter Optimization)

**Goal:** Implement `ExperimentAgent` with epsilon-greedy policy selection, persist
`PolicyPerformance` data, and wire it into lesson generation so teaching parameters
are assigned per-session based on historical effectiveness rather than hardcoded defaults.

**Depends on:** M7 (tutoring loop complete), M9 (events to measure performance)

---

## Implementation Tasks

### Type definitions (`packages/core/src/types/experiment.ts`)
- [ ] `LessonPolicyAssignment` interface:
  - `policyAssignmentId: string`
  - `leafTopicId: string`
  - `studentId: string`
  - `lessonStyle: string`
  - `explanationDepth: string`
  - `tone: string`
  - `exampleCount: number`
  - `socraticRatio: number`
  - `visualizationRatio: number`
  - `prerequisiteRefresh: string`
  - `assignedAt: string`
- [ ] `PolicyPerformance` interface:
  - `policyId: string` (hash of parameter combination)
  - `leafTopicId: string`
  - `impressions: number`
  - `successCount: number`
  - `failureCount: number`
  - `averageAttemptsToMastery: number`
  - `averageSentimentDelta: number`
  - `updatedAt: string`
- [ ] `ExperimentConfig` interface:
  - `explorationRate: number` (epsilon, 0.0–1.0; default 0.3)
  - `optimizationTarget: 'quiz_success' | 'min_attempts' | 'min_frustration'`
  - `parameterSpace: TeachingParameterSpace`
- [ ] `TeachingParameterSpace` — defines allowed values for each teaching parameter dimension

### Policy ID generation
- [ ] `getPolicyId(params: TeachingParameters): string` — SHA-256 of sorted parameter JSON
- [ ] Same parameter combination always produces the same `policyId`

### PolicyRepository interface (`packages/storage/src/index.ts`)
- [ ] `PolicyRepository` interface:
  - `getPolicyPerformance(policyId: string, leafTopicId: string): Promise<PolicyPerformance | null>`
  - `savePolicyPerformance(perf: PolicyPerformance): Promise<void>`
  - `getAllPerformances(leafTopicId: string): Promise<PolicyPerformance[]>`
- [ ] `InMemoryPolicyRepository` in `packages/storage/src/memory/policy.ts`

### ExperimentAgent (`packages/core/src/agents/experimentAgent.ts`)
- [ ] `ExperimentAgent` class:
  - Constructor: `(policyRepo: PolicyRepository, config: ExperimentConfig)`
  - `assignPolicy(input: PolicyAssignmentInput): Promise<LessonPolicyAssignment>`
  - `recordOutcome(policyAssignmentId: string, leafTopicId: string, outcome: PolicyOutcome): Promise<void>`
- [ ] `PolicyAssignmentInput`: `{ studentId, leafTopicId, studentTopicState }`
- [ ] `PolicyOutcome`: `{ correct: boolean, attemptsToMastery: number, sentimentDelta?: number }`
- [ ] `assignPolicy` implementation (epsilon-greedy):
  1. With probability `epsilon`: random sample from `parameterSpace` (explore)
  2. With probability `1 - epsilon`: select `TeachingParameters` from the policy with highest `successCount / impressions` for this `leafTopicId` (exploit)
  3. If no history exists: always explore (pure random)
  4. Build and return `LessonPolicyAssignment`, log `policy_assigned` event
- [ ] `recordOutcome` updates `PolicyPerformance` (upsert):
  - Increment `impressions`
  - If correct: increment `successCount`, update `averageAttemptsToMastery` (rolling avg)
  - If incorrect: increment `failureCount`

### Parameter space configuration (`packages/shared/src/config/index.ts`)
- [ ] Load `EXPERIMENT_EPSILON` from env (default: 0.3)
- [ ] Default `TeachingParameterSpace`:
  - `lessonStyle`: all 5 values
  - `explanationDepth`: short, medium, deep
  - `tone`: neutral, encouraging, direct
  - `exampleCount`: 1, 2, 3
  - `socraticRatio`: 0.0, 0.3, 0.7
  - `visualizationRatio`: 0.0, 0.5, 1.0
  - `prerequisiteRefresh`: none, light, moderate

### Wire into TutoringOrchestrator
- [ ] `startTopicLesson` now calls `experimentAgent.assignPolicy` instead of using `DefaultTeachingParameters`
- [ ] Pass `policyAssignmentId` to `TutorAgent.generateLesson` and to `EventLogger`
- [ ] After `submitAnswer` resolves mastery, call `experimentAgent.recordOutcome`

### Server endpoint
- [ ] `GET /policies/performance?leafTopicId=X` — returns all `PolicyPerformance` entries for a topic (dev/debug)

---

## Behavioral Acceptance Checklist

- [ ] `POST /tutor/start` now returns a `GeneratedLesson` where `policyAssignmentId` is a non-null string
- [ ] Two consecutive `startTopicLesson` calls for the same leaf topic may return lessons with different `parameters` (due to exploration)
- [ ] After 10 interactions with a topic where `example_first` style always leads to correct answers, `GET /policies/performance` shows `example_first` policy with highest `successCount`
- [ ] With `EXPERIMENT_EPSILON=0.0` (pure exploit), the agent always picks the best-known policy (no randomness after first interaction)
- [ ] With `EXPERIMENT_EPSILON=1.0` (pure explore), the agent always picks a random policy
- [ ] `getPolicyId({ lessonStyle: "example_first", ... })` returns the same hash for the same parameters regardless of call order
- [ ] `recordOutcome` increments `impressions` by 1 each call and updates `averageAttemptsToMastery` correctly
- [ ] `lesson_generated` events now include `policyAssignmentId` in the log
- [ ] `policy_assigned` events appear in the event log for every lesson start
- [ ] `ExperimentAgent` does not depend on `TutorAgent`, `GradingAgent`, or any LLM call (pure policy math)
