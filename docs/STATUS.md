# Implementation status

Where the code stands against [`brainule_2.0.txt`](../brainule_2.0.txt) and the
milestone plans in [`plan/`](../plan). The spec and plans are the reference; this file
records what is actually built, and where the code deliberately departs from them.

Last reviewed: 2026-08-16.

---

## Milestones

| Milestone | Status | Notes |
|---|---|---|
| M0 — monorepo scaffold | Complete | Departs from plan: `tsx watch` instead of `nodemon` + `ts-node`; `moduleResolution: "node"` with CommonJS rather than `"bundler"` (required for the CommonJS output the server uses). |
| M1 — course schemas & loader | Complete | `VisualizationGuide`, `AssessmentBank`, and `ParametricQuestionTemplate` are defined as types and zod schemas but nothing loads or consumes them. Record-level validation failures are logged and skipped rather than thrown, matching the plan's acceptance checklist. |
| M2 — student state & mastery | Complete | In-memory repository only; state is lost on restart. |
| M3 — LLM layer & prompts | Complete | OpenAI, Gemini, and Mock adapters. No Anthropic adapter — superseded by the M3 provider decision (see below). |
| M4 — corpus retrieval | Complete | Tag-based retrieval; leaf-topic tags score 1.0, prerequisite tags 0.5. No embeddings. |
| M5 — lesson generation | Complete | `LessonInput.priorFailureEvidence` is accepted but unused — the initial lesson does not yet fold in prior failures. |
| M6 — assessment & grading | Complete | Multiple-choice and numeric grade deterministically; other types route to LLM rubric grading. Selection never re-serves the item just answered, including after a pool reset (spec §33) — covered by `tests/assessment-selection.test.ts`. |
| M7 — remediation loop | Complete | Full lesson → quiz → grade → diagnose → re-teach loop, verified end to end on `LLM_PROVIDER=mock`. |
| M8 — three-panel web UI | Complete | Markdown rendering depends on a CDN copy of `marked.js`; degrades to plain text offline. |
| M9 — event logging | **Not built** | No `EventLogRepository`, no event schema, none of the spec §38 event types recorded. |
| M10 — experimentation | **Not built** | No `ExperimentAgent`. Every lesson uses `DefaultTeachingParameters`; `EXPERIMENT_EPSILON` is read into config but unused. |
| M11 — analysis & analytics | **Not built** | No `AnalysisAgent`, no `PolicyPerformance`, no analytics endpoints. |
| M12 — Cloud Run deployment | **Not built** | No Dockerfile, no Sheets adapters, no ADC wiring. |

---

## Intentional departures from the plans

These are places where the code does not match a plan document and the code is
considered correct. Recorded here so they are not "fixed" back.

- **No Anthropic adapter.** Spec §26 and `plan/overview.md` list one, but the M3 plan
  supersedes both: OpenAI and Gemini are the supported providers, and any other
  provider is one adapter file away. `plan/overview.md` has been corrected to match.
- **`TutoringOrchestrator` takes `AssessmentService`,** not the separate
  `assessmentAgent` + `gradingAgent` pair the M7 plan lists. The service already
  composes those two with the student model; injecting it avoids duplicating the
  grade-then-record sequence in the orchestrator.
- **Course-facing service methods take `courseId`.** The spec §41 signatures omit it
  (`getNextQuestion(studentId, leafTopicId)`); the implementation threads `courseId`
  through so a student's state is created against the right course.
- **`AssessmentItemSchema` accepts all nine question types** from spec §11, not the
  four listed in the M1 plan.
- **`tutor/lesson.md` and `tutor/remediation.md` carry more variables** than the M3
  plan enumerates — the remaining teaching parameters for the lesson, and the approved
  corpus for remediation. Spec §13/§14 require lessons to vary with all eight teaching
  parameters, and spec §35 requires remediation to stay inside approved content.
- **`InMemoryQuestionRepository` lives in `memory/questionRepository.ts`,** where the
  M6 plan says `memory/questions.ts`. Naming only.

---

## Known gaps

Beyond the unbuilt milestones:

| Gap | Impact |
|---|---|
| Thin test coverage | Spec §43 lists eight required test types. `tests/` now covers assessment selection and tutor isolation; schema, prompt-rendering, mastery, and logging tests are still missing. |
| Student state is in-memory | Progress is lost on every restart. Blocks any real student trial. |
| LLM-graded items always fail on the mock provider | `MockLlmClient` returns a fixed JSON payload with no `correct` field, so short-text and conceptual items grade as incorrect offline. Deterministic types are unaffected. |
| Visualization guides unimplemented | Type exists per spec §9.9; no loader, no consumer, no `visualization-guides/` directory. |
| Parametric question templates unimplemented | Type exists per spec §9.12; no generator. |
| Prompt hashes are logged but not persisted | Spec §27 asks for prompt name and hash on every LLM-mediated output. `GeneratedLesson` carries both; without M9 there is nowhere durable to put them. |
| `LlmGateway.defaultModel` is unused | The per-request model falls back to `config.llmModel` inside each adapter, so the gateway's copy never applies. |
| `sentiment` / `frustrationScore` never updated | Fields exist on `StudentTopicState` per spec §16; nothing writes them pending M9/M11. |

---

## Verifying the loop

With no API key configured:

```bash
pnpm install && pnpm dev
```

```bash
S=demo
curl "localhost:3000/course"
curl -X POST localhost:3000/tutor/start -H 'content-type: application/json' \
  -d "{\"studentId\":\"$S\",\"leafTopicId\":\"python_primitive_types\"}"
curl "localhost:3000/tutor/next-question?studentId=$S&leafTopicId=python_primitive_types"
curl -X POST localhost:3000/tutor/answer -H 'content-type: application/json' \
  -d "{\"studentId\":\"$S\",\"leafTopicId\":\"python_primitive_types\",\"questionId\":\"pt_001\",\"answer\":\"A\"}"
curl "localhost:3000/students/$S/progress"
```

A wrong answer returns a `remediation` lesson; the correct answer (`B` for `pt_001`)
returns `mastered: true`, and it shows up in `/progress`.
