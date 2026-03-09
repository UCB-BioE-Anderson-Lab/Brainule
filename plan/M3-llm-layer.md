# M3 — LLM Layer & Prompt Repository

**Goal:** Define the provider-agnostic `LlmClient` interface, implement an Anthropic adapter
and a `MockLlmClient`, implement a file-based `PromptRepository` with template variable
substitution, and verify the full call chain with a smoke test.

**Depends on:** M0

---

## Implementation Tasks

### LLM interface (`packages/llm/src/index.ts`)
- [ ] `LlmRequest` interface:
  - `systemPrompt: string`
  - `userPrompt: string`
  - `model?: string`
  - `temperature?: number`
  - `responseFormat?: 'text' | 'json'`
  - `metadata?: Record<string, unknown>`
- [ ] `LlmResponse` interface:
  - `text: string`
  - `structured?: unknown`
  - `raw?: unknown`
  - `provider: string`
  - `model: string`
  - `requestId?: string`
- [ ] `LlmClient` interface: `generate(request: LlmRequest): Promise<LlmResponse>`
- [ ] Export all from `packages/llm/src/index.ts`

### Anthropic adapter (`packages/llm/src/clients/anthropic.ts`)
- [ ] Install `@anthropic-ai/sdk` in `packages/llm`
- [ ] `AnthropicClient` class implementing `LlmClient`
- [ ] Reads `ANTHROPIC_API_KEY` from env (via `packages/shared` config)
- [ ] Default model: `claude-sonnet-4-6` (configurable via config or `LlmRequest.model`)
- [ ] Maps `LlmRequest` → Anthropic `messages.create` call
- [ ] Maps Anthropic response → `LlmResponse`
- [ ] When `responseFormat === 'json'`: wraps prompt to request JSON, attempts `JSON.parse` on response text, stores result in `structured`
- [ ] Propagates rate limit and API errors as typed `LlmError`

### Mock adapter (`packages/llm/src/clients/mock.ts`)
- [ ] `MockLlmClient` class implementing `LlmClient`
- [ ] Constructor accepts `responses: Record<string, string>` map (keyed by partial prompt match or explicit key)
- [ ] Falls back to a configurable default response string
- [ ] Records all calls in `calls: LlmRequest[]` for test assertion
- [ ] No network calls — fully synchronous under the hood

### LLM Gateway (`packages/llm/src/gateway.ts`)
- [ ] `LlmGateway` class:
  - Constructor: `(client: LlmClient, defaultModel: string)`
  - `generate(request: LlmRequest): Promise<LlmResponse>` — delegates to client, logs provider + model + requestId
- [ ] Factory function `createLlmClient(provider: string): LlmClient` reads `LLM_PROVIDER` env var, returns appropriate adapter
- [ ] Supported providers: `anthropic`, `mock`

### Prompt Repository (`packages/core/src/services/promptRepository.ts`)
- [ ] `PromptRepository` interface: `getPrompt(promptName: string, variables?: Record<string, string>): Promise<string>`
- [ ] `FilePromptRepository` implementation:
  - Reads prompt markdown files from `packages/prompts/` directory (path configurable)
  - Template variable substitution: replaces `{{VARIABLE_NAME}}` placeholders
  - Caches file content in memory after first read
  - Throws descriptive error if prompt file not found

### Initial prompt files (`packages/prompts/`)
- [ ] `tutor/lesson.md` — system prompt for generating a leaf-topic lesson. Variables: `{{LEAF_TOPIC_TITLE}}`, `{{LEAF_TOPIC_DESCRIPTION}}`, `{{LEARNING_OBJECTIVES}}`, `{{CORPUS_CHUNKS}}`, `{{LESSON_STYLE}}`, `{{EXPLANATION_DEPTH}}`, `{{TONE}}`
- [ ] `tutor/remediation.md` — system prompt for remediation after failure. Variables: `{{LEAF_TOPIC_TITLE}}`, `{{FAILED_QUESTION}}`, `{{STUDENT_ANSWER}}`, `{{GRADING_NOTES}}`, `{{LIKELY_MISCONCEPTIONS}}`
- [ ] `tutor/qa.md` — system prompt for answering in-lesson student questions. Variables: `{{LEAF_TOPIC_TITLE}}`, `{{LESSON_CONTEXT}}`
- [ ] `grading/grade.md` — grading prompt for non-MC questions. Variables: `{{QUESTION_PROMPT}}`, `{{ANSWER_KEY}}`, `{{RUBRIC}}`, `{{STUDENT_ANSWER}}`
- [ ] `grading/failure-analysis.md` — failure analysis prompt. Variables: `{{QUESTION_PROMPT}}`, `{{STUDENT_ANSWER}}`, `{{GRADING_RESULT}}`, `{{MISCONCEPTIONS_LIST}}`
- [ ] `analysis/session-review.md` — session analysis prompt
- [ ] `experiment/policy-selection.md` — policy assignment prompt (if using LLM-assisted selection)

### Wire into server
- [ ] `apps/node-server/src/adapters/llm.ts` — creates `LlmGateway` singleton from env config
- [ ] `GET /llm/smoke` — hidden dev endpoint that calls `MockLlmClient` and returns the response (remove in prod)

---

## Behavioral Acceptance Checklist

- [ ] `MockLlmClient.generate({ systemPrompt: "...", userPrompt: "hello" })` returns a `LlmResponse` with `provider: "mock"`
- [ ] After calling `MockLlmClient.generate` twice, `mockClient.calls.length === 2`
- [ ] `AnthropicClient` with a valid `ANTHROPIC_API_KEY` successfully calls the API and returns a non-empty `text` field
- [ ] `AnthropicClient` with an invalid key throws a typed error (not unhandled crash)
- [ ] `FilePromptRepository.getPrompt("tutor/lesson", { LEAF_TOPIC_TITLE: "Mitosis" })` returns the lesson prompt with `{{LEAF_TOPIC_TITLE}}` replaced by `"Mitosis"`
- [ ] Requesting a non-existent prompt name throws a descriptive error naming the missing file
- [ ] `createLlmClient("mock")` returns a `MockLlmClient`
- [ ] `createLlmClient("anthropic")` returns an `AnthropicClient`
- [ ] `createLlmClient("unknown")` throws a clear error
- [ ] Core agents import only `LlmClient` from `packages/llm` — no direct `@anthropic-ai/sdk` imports in `packages/core`
- [ ] Swapping `LLM_PROVIDER=mock` in env makes all agent calls use MockLlmClient without code changes
