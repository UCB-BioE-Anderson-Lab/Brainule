# M5 — Lesson Generation

**Goal:** Implement `TutorAgent` with lesson generation capability. Given a `LeafTopic`,
retrieved corpus content, and teaching parameters, it calls the LLM and returns a
`GeneratedLesson`. Wire this to a server endpoint so generated lessons can be rendered
in the browser.

**Depends on:** M1, M2, M3, M4

---

## Implementation Tasks

### Type definitions (`packages/core/src/types/lesson.ts`)
- [ ] `TeachingParameters` interface (mirrors spec section 14):
  - `lessonStyle: 'definition_first' | 'example_first' | 'analogy_first' | 'misconception_first' | 'procedural_first'`
  - `explanationDepth: 'short' | 'medium' | 'deep'`
  - `tone: 'neutral' | 'encouraging' | 'direct' | 'energetic'`
  - `exampleCount: number`
  - `socraticRatio: number` (0.0–1.0)
  - `visualizationRatio: number` (0.0–1.0)
  - `stepGranularity: 'low' | 'medium' | 'high'`
  - `prerequisiteRefresh: 'none' | 'light' | 'moderate' | 'heavy'`
- [ ] `DefaultTeachingParameters` constant (sensible defaults for MVP)
- [ ] `GeneratedLesson` interface:
  - `lessonId: string`
  - `leafTopicId: string`
  - `content: string` (markdown from LLM)
  - `parameters: TeachingParameters`
  - `policyAssignmentId?: string`
  - `promptName: string`
  - `promptHash: string`
  - `llmProvider: string`
  - `llmModel: string`
  - `generatedAt: string`
- [ ] `TutorResponse` interface:
  - `responseId: string`
  - `leafTopicId: string`
  - `content: string`
  - `generatedAt: string`

### TutorAgent — lesson generation (`packages/core/src/agents/tutorAgent.ts`)
- [ ] `TutorAgent` class:
  - Constructor: `(llmGateway: LlmGateway, promptRepo: PromptRepository)`
  - `generateLesson(input: LessonInput): Promise<GeneratedLesson>`
  - `answerStudentQuestion(input: QAInput): Promise<TutorResponse>`
  - `generateRemediation(input: RemediationInput): Promise<GeneratedLesson>` (implemented in M7)
- [ ] `LessonInput` interface:
  - `leafTopic: LeafTopic`
  - `contentPack: RetrievedContentPack`
  - `parameters: TeachingParameters`
  - `studentTopicState: StudentTopicState`
  - `priorFailureEvidence?: FailureAnalysis` (null for initial lesson)
- [ ] `generateLesson` implementation:
  1. Load `tutor/lesson.md` prompt via `promptRepo`
  2. Substitute template variables (topic title, objectives, corpus chunks, style params)
  3. Call `llmGateway.generate` with `responseFormat: 'text'`
  4. Compute `promptHash` from SHA-256 of rendered prompt
  5. Return `GeneratedLesson`
- [ ] `QAInput` interface: `leafTopic`, `lessonContent`, `studentQuestion`, `studentTopicState`
- [ ] `answerStudentQuestion` uses `tutor/qa.md` prompt, returns `TutorResponse`

### Prompt template variables (tutor/lesson.md)
- [ ] Ensure `{{LEAF_TOPIC_TITLE}}` is populated from `leafTopic.title`
- [ ] `{{LEAF_TOPIC_DESCRIPTION}}` from `leafTopic.description`
- [ ] `{{LEARNING_OBJECTIVES}}` — rendered list of objective statements
- [ ] `{{CORPUS_CHUNKS}}` — concatenated chunk content with section separators
- [ ] `{{LESSON_STYLE}}`, `{{EXPLANATION_DEPTH}}`, `{{TONE}}` from `TeachingParameters`
- [ ] `{{PREREQUISITE_REFRESH}}` — instruction level hint

### Crypto utility (`packages/shared/src/utils/hash.ts`)
- [ ] `sha256(input: string): string` — returns hex hash, uses Node.js `crypto` module

### Server endpoint (`apps/node-server/src/api/lesson.ts`)
- [ ] `POST /lessons/generate` body: `{ studentId, leafTopicId }` → generates and returns a lesson
- [ ] Server uses `CorpusRetrievalAgent` → `TutorAgent` → returns `GeneratedLesson`
- [ ] Uses `DefaultTeachingParameters` until M10 ExperimentAgent is wired

### (Optional) Streaming endpoint
- [ ] `POST /lessons/stream` — streams lesson content via Server-Sent Events as LLM generates it
- [ ] Uses Anthropic streaming API: `messages.stream()` instead of `messages.create()`
- [ ] Frontend receives incremental chunks and appends to center panel

---

## Behavioral Acceptance Checklist

- [ ] `POST /lessons/generate` with a valid `{ studentId, leafTopicId }` returns a `GeneratedLesson` with non-empty `content` (markdown)
- [ ] The generated lesson content references concepts from the fixture corpus (not hallucinated content from outside the corpus)
- [ ] Changing `parameters.tone` to `"encouraging"` produces noticeably different lesson prose than `"neutral"`
- [ ] Changing `parameters.lessonStyle` to `"example_first"` produces a lesson that leads with an example rather than a definition
- [ ] `promptHash` differs when the template variables change (different topic → different hash)
- [ ] `answerStudentQuestion` with `"What is a mutable list?"` returns a response that stays within the topic scope
- [ ] `GeneratedLesson` passes zod schema validation
- [ ] With `LLM_PROVIDER=mock`, `POST /lessons/generate` returns a `GeneratedLesson` with the mock's default response text (no API call made)
- [ ] `TutorAgent` does not import `@anthropic-ai/sdk` directly — only uses `LlmGateway`
- [ ] `TutorAgent` does not receive or reference any `AssessmentItem` objects (enforcement of assessment separation)
