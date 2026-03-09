# M6 — Assessment & Grading

**Goal:** Implement `AssessmentAgent` (question selection with repeat avoidance) and
`GradingAgent` (deterministic MC grading + LLM rubric grading for open-ended types).
Expose quiz endpoints so the client can request a question and submit an answer.

**Depends on:** M1 (AssessmentItem), M2 (StudentTopicState), M3 (LlmGateway for rubric grading)

---

## Implementation Tasks

### Type definitions (`packages/core/src/types/assessment.ts`)
- [ ] `QuestionSelectionInput` interface:
  - `leafTopicId: string`
  - `studentTopicState: StudentTopicState`
  - `allowedTypes?: string[]`
  - `difficultyHint?: string`
- [ ] `GradingResult` interface:
  - `gradingResultId: string`
  - `questionId: string`
  - `correct: boolean`
  - `score: number` (0–1)
  - `rubricResult: object`
  - `errorCategory?: string`
  - `graderConfidence: number` (0–1; 1.0 for deterministic)
  - `gradingNotes: string`

### QuestionRepository interface (`packages/storage/src/index.ts`)
- [ ] `QuestionRepository` interface:
  - `getRandomQuestion(input: QuestionSelectionInput): Promise<AssessmentItem>`
  - `getQuestion(questionId: string): Promise<AssessmentItem | null>`
  - `getQuestionsForTopic(leafTopicId: string): Promise<AssessmentItem[]>`
- [ ] `InMemoryQuestionRepository` in `packages/storage/src/memory/questions.ts`:
  - Loaded from `CoursePackage` question banks at startup
  - `getRandomQuestion`: filters by `leafTopicId`, excludes `recentQuestionIds`, picks random; falls back to full pool if all recently seen
  - `getQuestion`: returns by questionId

### AssessmentAgent (`packages/core/src/agents/assessmentAgent.ts`)
- [ ] `AssessmentAgent` class:
  - Constructor: `(questionRepo: QuestionRepository)`
  - `selectQuestion(input: QuestionSelectionInput): Promise<AssessmentItem>`
- [ ] Selection rules:
  1. Get all questions for `leafTopicId`
  2. Filter by `allowedTypes` if specified
  3. Exclude `studentTopicState.recentQuestionIds` (last N, configurable, default 5)
  4. If no eligible questions remain after exclusion, reset and use full pool (with a log warning)
  5. Select uniformly at random from eligible set
- [ ] Throws `NoQuestionsAvailableError` if the topic bank is empty

### GradingAgent (`packages/core/src/agents/gradingAgent.ts`)
- [ ] `GradingAgent` class:
  - Constructor: `(llmGateway: LlmGateway, promptRepo: PromptRepository)`
  - `grade(question: AssessmentItem, studentAnswer: string): Promise<GradingResult>`
- [ ] `grade` routes to internal graders by `question.questionType`:
  - `multiple_choice` → `gradeMC(question, studentAnswer)`
  - `numeric` → `gradeNumeric(question, studentAnswer)`
  - `short_text | conceptual_explanation` → `gradeLlm(question, studentAnswer)`
- [ ] `gradeMC`: normalize both sides to uppercase trimmed string, exact match → correct; returns `graderConfidence: 1.0`
- [ ] `gradeNumeric`: parse student answer as float, compare to `answerKey.value` within `answerKey.tolerance`; returns `graderConfidence: 1.0`
- [ ] `gradeLlm`: loads `grading/grade.md` prompt, calls LLM, expects JSON response `{ correct: bool, score: number, notes: string }`; returns `graderConfidence: 0.85` (LLM grader)
- [ ] Catch JSON parse errors from LLM response, fallback to `correct: false` with a log

### Application service (`packages/core/src/services/assessmentService.ts`)
- [ ] `AssessmentService` class:
  - Constructor: `(assessmentAgent, gradingAgent, studentModelService)`
  - `getNextQuestion(studentId, leafTopicId): Promise<AssessmentItem>`
  - `submitAnswer(studentId, leafTopicId, questionId, answer, latencyMs): Promise<{ gradingResult, updatedState }>`
- [ ] `submitAnswer` flow:
  1. Load question by ID
  2. Call `gradingAgent.grade`
  3. Call `studentModelService.markAnswerAndCheckMastery`
  4. Return both grading result and updated student state

### Server endpoints (`apps/node-server/src/api/assessment.ts`)
- [ ] `GET /students/:studentId/topics/:leafTopicId/question` — returns next `AssessmentItem`
- [ ] `POST /students/:studentId/topics/:leafTopicId/answer` body: `{ questionId, answer, latencyMs }` → returns `{ gradingResult, mastered }`
- [ ] `GET /questions/:questionId` — returns a specific question (for dev/debug)

---

## Behavioral Acceptance Checklist

- [ ] `GET /students/alice/topics/python_data_types/question` returns an `AssessmentItem` with `questionType`, `prompt`, and (for MC) `choices`
- [ ] Calling the question endpoint 5 times in a row never returns the same `questionId` twice (assuming the bank has ≥5 questions)
- [ ] If the topic bank has only 1 question, the 2nd call returns it again (pool reset fallback), with a log warning
- [ ] `POST /answer` with the correct MC option returns `{ correct: true, score: 1.0 }`
- [ ] `POST /answer` with an incorrect MC option returns `{ correct: false, score: 0 }`
- [ ] MC grading is case-insensitive: `"a"` and `"A"` both match answer key `"A"`
- [ ] Numeric grader accepts `"3.14"` when answer key is `{ value: 3.14159, tolerance: 0.01 }`
- [ ] Numeric grader rejects `"3.0"` when answer key is `{ value: 3.14159, tolerance: 0.01 }`
- [ ] After a correct answer, `GET /students/alice/progress` shows `mastered: true` for that leaf topic
- [ ] `AssessmentAgent` does not call the LLM or touch `TutorAgent` — it only reads the question bank
- [ ] `GradingAgent` LLM grader uses `MockLlmClient` in test mode and returns a valid `GradingResult`
- [ ] An empty question bank (0 questions) causes `NoQuestionsAvailableError` (not a server crash)
