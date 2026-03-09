# M3 — LLM Layer & Prompt Repository

**Goal:** Define the provider-agnostic `LlmClient` interface, implement OpenAI and Gemini
adapters as the primary supported providers, implement a `MockLlmClient` for testing, and
implement a file-based `PromptRepository` with template variable substitution. The
abstraction is designed so any additional LLM provider (including Anthropic, if needed
later) can be added by writing a single new adapter file with no changes to agent code.

**Depends on:** M0

---

## Provider Decision

**Primary providers: OpenAI GPT and Google Gemini.**

These are the supported providers for initial deployment. The architecture deliberately
isolates all provider-specific code behind the `LlmClient` interface so the active
provider is controlled entirely by the `LLM_PROVIDER` environment variable. Adding a
new provider in the future means writing one new adapter file — nothing else changes.

Default provider recommendation: **OpenAI GPT-4o** (strong general reasoning, widely
used) with Gemini as the fallback/alternative. Use `LLM_PROVIDER=openai` or
`LLM_PROVIDER=gemini` in `.env`.

---

## Implementation Tasks

### LLM interface (`packages/llm/src/index.ts`)
- [ ] `LlmRequest` interface:
  - `systemPrompt: string`
  - `userPrompt: string`
  - `model?: string` (overrides the adapter's default model)
  - `temperature?: number`
  - `responseFormat?: 'text' | 'json'`
  - `metadata?: Record<string, unknown>`
- [ ] `LlmResponse` interface:
  - `text: string`
  - `structured?: unknown` (populated when `responseFormat === 'json'`)
  - `raw?: unknown` (raw SDK response for debugging)
  - `provider: string`
  - `model: string`
  - `requestId?: string`
- [ ] `LlmClient` interface: `generate(request: LlmRequest): Promise<LlmResponse>`
- [ ] `LlmError` class extending `Error`: adds `provider: string`, `statusCode?: number`, `retryable: boolean`
- [ ] Export all from `packages/llm/src/index.ts`

### OpenAI adapter (`packages/llm/src/clients/openai.ts`)
- [ ] Install `openai` npm package in `packages/llm`
- [ ] `OpenAiClient` class implementing `LlmClient`
- [ ] Reads `OPENAI_API_KEY` from env (via `packages/shared` config)
- [ ] Default model: `gpt-4o` (configurable via `LLM_MODEL` env var or `LlmRequest.model`)
- [ ] Maps `LlmRequest` → OpenAI `chat.completions.create` with `messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }]`
- [ ] When `responseFormat === 'json'`: sets `response_format: { type: "json_object" }` in the request; attempts `JSON.parse` on response text; stores result in `structured`
- [ ] Maps response → `LlmResponse` (extracts `choices[0].message.content`, `model`, `id` as requestId)
- [ ] Wraps API errors as `LlmError` with appropriate `statusCode` and `retryable` flag (429 → retryable: true)

### Gemini adapter (`packages/llm/src/clients/gemini.ts`)
- [ ] Install `@google/generative-ai` npm package in `packages/llm`
- [ ] `GeminiClient` class implementing `LlmClient`
- [ ] Reads `GEMINI_API_KEY` from env
- [ ] Default model: `gemini-1.5-pro` (configurable via `LLM_MODEL` env var or `LlmRequest.model`)
- [ ] Maps `LlmRequest` → Gemini `generateContent` call:
  - `systemInstruction`: maps from `systemPrompt`
  - `contents`: `[{ role: "user", parts: [{ text: userPrompt }] }]`
- [ ] When `responseFormat === 'json'`: sets `responseMimeType: "application/json"` in `generationConfig`; attempts `JSON.parse`; stores in `structured`
- [ ] Maps response → `LlmResponse` (extracts `candidates[0].content.parts[0].text`, model name)
- [ ] Wraps API errors as `LlmError`

### Mock adapter (`packages/llm/src/clients/mock.ts`)
- [ ] `MockLlmClient` class implementing `LlmClient`
- [ ] Constructor: `(options?: { defaultResponse?: string, responses?: Record<string, string> })`
  - `responses` map: keyed by substring match against `userPrompt`; first match wins
  - Falls back to `defaultResponse` (default: `"Mock LLM response."`)
- [ ] Records all calls in `calls: LlmRequest[]` for test assertion
- [ ] When `responseFormat === 'json'`: returns a valid JSON string as `text` and parsed object as `structured`
- [ ] No network calls — synchronous internally, wrapped in `Promise.resolve`

### LLM Gateway (`packages/llm/src/gateway.ts`)
- [ ] `LlmGateway` class:
  - Constructor: `(client: LlmClient, defaultModel: string)`
  - `generate(request: LlmRequest): Promise<LlmResponse>` — delegates to client; logs `provider`, `model`, `requestId`, and prompt hash on every call
- [ ] Factory function `createLlmClient(provider: string): LlmClient`:
  - `"openai"` → `new OpenAiClient()`
  - `"gemini"` → `new GeminiClient()`
  - `"mock"` → `new MockLlmClient()`
  - anything else → throws `Error("Unknown LLM provider: <value>. Supported: openai, gemini, mock")`
- [ ] `createLlmGateway(): LlmGateway` — reads `LLM_PROVIDER` and `LLM_MODEL` from env, calls `createLlmClient`, returns gateway singleton

### Prompt Repository (`packages/core/src/services/promptRepository.ts`)
- [ ] `PromptRepository` interface:
  - `getPrompt(promptName: string, variables?: Record<string, string>): Promise<string>`
- [ ] `FilePromptRepository` class implementing `PromptRepository`:
  - Constructor: `(promptsDir: string)` — path to `packages/prompts/`
  - Reads prompt files as UTF-8 text on first access, caches in `Map<string, string>`
  - Template substitution: replaces all `{{VARIABLE_NAME}}` occurrences with the provided value
  - If a `{{VARIABLE}}` placeholder has no matching key in `variables`, leaves it as-is and logs a warning (does not throw)
  - Throws descriptive `Error("Prompt not found: <promptName> (looked at <path>)")` if file is missing

### Initial prompt files (`packages/prompts/`)
- [ ] `tutor/lesson.md` — system prompt for generating a leaf-topic lesson
  - Variables: `{{LEAF_TOPIC_TITLE}}`, `{{LEAF_TOPIC_DESCRIPTION}}`, `{{LEARNING_OBJECTIVES}}`, `{{CORPUS_CHUNKS}}`, `{{LESSON_STYLE}}`, `{{EXPLANATION_DEPTH}}`, `{{TONE}}`, `{{PREREQUISITE_REFRESH}}`
- [ ] `tutor/remediation.md` — remediation after a failed quiz question
  - Variables: `{{LEAF_TOPIC_TITLE}}`, `{{FAILED_QUESTION}}`, `{{STUDENT_ANSWER}}`, `{{GRADING_NOTES}}`, `{{LIKELY_MISCONCEPTIONS}}`
  - Must include instruction: "Do not reveal the answer to the failed question. The next question will be a different item from the same topic."
- [ ] `tutor/qa.md` — in-lesson student Q&A
  - Variables: `{{LEAF_TOPIC_TITLE}}`, `{{LESSON_CONTEXT}}`, `{{STUDENT_QUESTION}}`
- [ ] `grading/grade.md` — LLM rubric grading for open-ended questions
  - Variables: `{{QUESTION_PROMPT}}`, `{{ANSWER_KEY}}`, `{{RUBRIC}}`, `{{STUDENT_ANSWER}}`
  - Must instruct model to respond with JSON: `{ "correct": bool, "score": number, "notes": string }`
- [ ] `grading/failure-analysis.md` — structured failure diagnosis
  - Variables: `{{QUESTION_PROMPT}}`, `{{STUDENT_ANSWER}}`, `{{GRADING_RESULT}}`, `{{MISCONCEPTIONS_LIST}}`
  - Must instruct model to respond with JSON: `{ "failureType": string, "summary": string, "likelyMisconceptionLabels": string[], "remediationHints": string[] }`
- [ ] `analysis/session-review.md` — end-of-session analysis
- [ ] `experiment/policy-selection.md` — (optional) LLM-assisted policy selection prompt

### Wire into server
- [ ] `apps/node-server/src/adapters/llm.ts` — calls `createLlmGateway()` on startup, exports singleton
- [ ] `GET /llm/smoke` — dev-only endpoint that sends a test prompt through the active provider and returns the response (guarded by `NODE_ENV !== 'production'`)

---

## Adding a New Provider Later

To add a new LLM provider (e.g., Anthropic, Mistral, local Ollama):
1. Create `packages/llm/src/clients/<provider>.ts` implementing `LlmClient`
2. Add a case to `createLlmClient` in `gateway.ts`
3. Set `LLM_PROVIDER=<provider>` in env

No agent code, orchestration code, or prompt code needs to change.

---

## Behavioral Acceptance Checklist

- [ ] `MockLlmClient.generate({ systemPrompt: "sys", userPrompt: "hello" })` returns a `LlmResponse` with `provider: "mock"` and non-empty `text`
- [ ] After two calls to `MockLlmClient.generate`, `mockClient.calls.length === 2`
- [ ] `MockLlmClient` with `responseFormat: 'json'` returns a valid object in `structured` (not null)
- [ ] `OpenAiClient` with a valid `OPENAI_API_KEY` and model `gpt-4o` returns a non-empty `text` field
- [ ] `OpenAiClient` with an invalid key throws `LlmError` with `statusCode: 401` (not an unhandled crash)
- [ ] `OpenAiClient` with `responseFormat: 'json'` returns a populated `structured` field with the parsed object
- [ ] `GeminiClient` with a valid `GEMINI_API_KEY` returns a non-empty `text` field
- [ ] `GeminiClient` with an invalid key throws `LlmError` (not an unhandled crash)
- [ ] `FilePromptRepository.getPrompt("tutor/lesson", { LEAF_TOPIC_TITLE: "Mitosis" })` returns the prompt text with `{{LEAF_TOPIC_TITLE}}` replaced by `"Mitosis"`
- [ ] Requesting a non-existent prompt name throws a descriptive error including the file path that was searched
- [ ] An unresolved `{{VARIABLE}}` in the template logs a warning but does not throw
- [ ] `createLlmClient("openai")` returns an `OpenAiClient`
- [ ] `createLlmClient("gemini")` returns a `GeminiClient`
- [ ] `createLlmClient("mock")` returns a `MockLlmClient`
- [ ] `createLlmClient("unknown")` throws a clear error listing supported providers
- [ ] `LLM_PROVIDER=gemini` in env makes all agent LLM calls use Gemini with no code changes
- [ ] `LLM_PROVIDER=mock` makes all agent calls use MockLlmClient — no network calls made
- [ ] Core agents (`packages/core`) import only `LlmClient`/`LlmGateway` from `packages/llm` — no direct `openai` or `@google/generative-ai` imports anywhere in `packages/core`
- [ ] `GET /llm/smoke` (dev only) returns a successful response from the currently configured provider
