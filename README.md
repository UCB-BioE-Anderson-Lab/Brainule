# Brainule 2.0

A curriculum-bounded, multi-agent STEM tutoring platform. Instructors author a course
package that defines the approved knowledge universe and assessment scope; the system
generates lessons with an LLM, quizzes the student from the topic's question bank,
diagnoses wrong answers, and re-teaches until the topic is mastered.

The instructor defines *what* may be taught. The system learns *how* to teach it.

- Full product/technical specification: [`brainule_2.0.txt`](brainule_2.0.txt)
- Architecture and milestone plans: [`plan/`](plan/) (start with [`plan/overview.md`](plan/overview.md))
- Implementation status against those plans: [`docs/STATUS.md`](docs/STATUS.md)
- The original Apps Script app (v1, legacy): [`legacy/apps-script/`](legacy/apps-script/)

---

## Table of contents

- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [Repository layout](#repository-layout)
- [Configuration](#configuration)
- [API reference](#api-reference)
- [Authoring a course](#authoring-a-course)
- [Prompts](#prompts)
- [Development](#development)
- [What is not built yet](#what-is-not-built-yet)

---

## Quick start

Requires **Node.js ≥ 20** and **pnpm**.

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. With no configuration the server runs on the **mock LLM
provider**, so the whole loop — topics, lessons, quizzes, grading, remediation — works
end to end with no API key and no network calls. Lesson text will read
`Mock LLM response.` until a real provider is configured.

To use a real provider:

```bash
cp .env.example .env      # then edit it
export LLM_PROVIDER=openai OPENAI_API_KEY=sk-...
pnpm dev
```

The server can be started from any working directory — the course package and prompt
files are resolved against the workspace root, not the current directory.

```bash
pnpm build && pnpm start  # production build, serves the same app from dist/
```

---

## How it works

```
Browser (three-panel UI)
   │
   ├── GET  /course                 topic tree
   ├── GET  /students/:id/progress  mastery per leaf topic
   ├── POST /tutor/start            ── TutoringOrchestrator ──┐
   ├── GET  /tutor/next-question                              │
   ├── POST /tutor/answer                                     │
   └── POST /tutor/question                                   │
                                                              ▼
   CorpusRetrievalAgent ──→ approved chunks for the leaf topic
   TutorAgent           ──→ lesson / remediation / Q&A   ─┐
   AssessmentAgent      ──→ unseen question from the bank │ all LLM calls go
   GradingAgent         ──→ GradingResult                 │ through LlmClient
   FailureAnalysisAgent ──→ FailureAnalysis               ─┘
   StudentModelService  ──→ StudentState + mastery policy
```

The loop for one leaf topic:

1. The student picks a topic. `CorpusRetrievalAgent` gathers only the corpus chunks
   tagged for that topic (and its prerequisites).
2. `TutorAgent` generates a lesson from those chunks under the current teaching
   parameters. It is never shown future quiz questions.
3. `AssessmentAgent` serves a random question from the topic's bank, avoiding the
   student's five most recent items.
4. `GradingAgent` grades it — deterministically for multiple-choice and numeric,
   via an LLM rubric for open-ended types.
5. Correct → the mastery policy marks the topic mastered (default: one correct answer).
6. Incorrect → `FailureAnalysisAgent` diagnoses the misconception, `TutorAgent`
   generates remediation from the failed item as *evidence* without revealing its
   answer, and the next question is a different item from the same bank.

---

## Repository layout

```
/apps
  /node-server         Express server, API routes, static three-panel UI
    /public            index.html, app.js, styles.css — no framework, no bundler
    /src/api           route handlers
    /src/adapters      runtime adapters (LLM gateway wiring)
    /src/context.ts    dependency injection: builds every agent and repository
/packages
  /core                domain logic — runtime-agnostic, no Express, no LLM SDKs
    /src/agents        TutorAgent, AssessmentAgent, GradingAgent, FailureAnalysisAgent,
                       CorpusRetrievalAgent
    /src/orchestration TutoringOrchestrator — the main loop
    /src/policies      mastery policy
    /src/schemas       zod schemas for course and student data
    /src/services      course loader, prompt repository, student model, assessment service
    /src/types         TypeScript interfaces for every domain object
  /llm                 LlmClient interface + OpenAI, Gemini, and Mock adapters
  /prompts             prompt markdown files — the only place prompt text lives
  /retrieval           corpus chunking and tag-based retrieval
  /storage             repository interfaces + filesystem/in-memory implementations
  /shared              config, structured logger, id and hash utilities
/course                the course package (BioE 134/234 Midterm Prep)
/plan                  milestone specifications M0–M12
/docs                  implementation status
/legacy/apps-script    Brainule v1 — the original Apps Script app (still deployable)
```

Two rules hold this together and are worth preserving:

- `packages/core` imports no Express, no Apps Script globals, and no provider SDK.
  Agents depend on the `LlmClient` interface and on repository interfaces only.
- Prompt text lives in `packages/prompts/*.md`, never inline in agent code.

---

## Configuration

All configuration is environment variables, read once in `packages/shared/src/config`.
See [`.env.example`](.env.example).

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | `production` disables the dev-only endpoints |
| `LLM_PROVIDER` | `mock` | `openai`, `gemini`, or `mock` |
| `LLM_MODEL` | `gpt-4o` / `gemini-1.5-pro` | Model override for the active provider |
| `OPENAI_API_KEY` | — | Required when `LLM_PROVIDER=openai` |
| `GEMINI_API_KEY` | — | Required when `LLM_PROVIDER=gemini` |
| `COURSE_DIR` | `course` | Course package directory (relative to workspace root, or absolute) |
| `PROMPTS_DIR` | `packages/prompts` | Prompt directory (relative to workspace root, or absolute) |
| `STORAGE_BACKEND` | `memory` | Only `memory` is implemented; student state is lost on restart |
| `EXPERIMENT_EPSILON` | `0.3` | Reserved for M10 experimentation; unused today |

Adding a provider means writing one adapter in `packages/llm/src/clients/` and adding
one case to `createLlmClient`. No agent, orchestration, or prompt code changes.

---

## API reference

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness — `{ status, version }` |
| `GET` | `/app-bootstrap?studentId=` | Page init: course id, title, and the student id (minted if absent) |
| `GET` | `/course` | Course metadata and the leaf-topic list |
| `POST` | `/students/:studentId` | Create or fetch a student session — body `{ courseId }` |
| `GET` | `/students/:studentId/progress` | Mastery and attempt counts for every leaf topic |
| `POST` | `/tutor/start` | Generate a lesson — body `{ studentId, leafTopicId, parameters? }` |
| `GET` | `/tutor/next-question` | Next question — query `studentId`, `leafTopicId` |
| `POST` | `/tutor/answer` | Grade an answer, returning remediation when wrong — body `{ studentId, leafTopicId, questionId, answer, latencyMs? }` |
| `POST` | `/tutor/question` | In-lesson Q&A — body `{ studentId, leafTopicId, message, lessonContent? }` |
| `GET` | `/students/:id/topics/:leafTopicId/question` | Question without the orchestrator (M6 contract) |
| `POST` | `/students/:id/topics/:leafTopicId/answer` | Grade without the orchestrator (M6 contract) |
| `POST` | `/lessons/generate` | Lesson generation without the orchestrator (M5 contract) |
| `GET` | `/corpus/:leafTopicId` | Inspect what retrieval returns for a topic — dev aid |
| `GET` | `/questions/:questionId` | Full item **including the answer key** — dev only, 404s in production |
| `GET` | `/llm/smoke` | Round-trip the configured provider — dev only, 404s in production |

Questions served to a student never include `answerKey` or `rubric`. The expected
answer comes back in `gradingResult.rubricResult.expected` after the answer is
submitted, which is what the UI uses to reveal the correct choice.

---

## Authoring a course

A course is a directory of YAML and JSON files, validated with zod at load time. The
shipped course is `course/`:

```
course/
├── course.yaml               course metadata
├── modules/*.yaml            Module     → unitIds
├── units/*.yaml              Unit       → topicIds
├── topics/*.yaml             Topic      → leafTopicIds
├── leaf-topics/*.yaml        LeafTopic  → the unit of mastery and assessment
├── learning-objectives/*.yaml LearningObjective, referenced by leaf topics
├── misconceptions/*.yaml     Misconception library, keyed by leaf topic
├── question-banks/*.json     AssessmentItem arrays, one file per bank
├── corpus/*.md               the approved knowledge universe
└── corpus-manifest.yaml      CorpusDocument metadata: tags, chunking strategy
```

Only leaf topics are assessed. Each leaf topic names its `allowedKnowledgeTags` — the
retriever will surface only corpus documents carrying those tags, which is what keeps
generated lessons inside the approved boundary. A leaf topic with no matching corpus
document will still generate a lesson, but an ungrounded one; give every leaf topic at
least one document.

Each `.yaml` file may hold a single object or an array of them. Validation failures on
individual records are logged and skipped, so one malformed question does not take down
the course; a malformed `course.yaml` throws on startup.

To point the server at a different course package:

```bash
COURSE_DIR=/path/to/other-course pnpm dev
```

---

## Prompts

Every LLM instruction is a markdown file in `packages/prompts/`, with `{{VARIABLE}}`
placeholders substituted at call time:

| File | Used by |
|---|---|
| `tutor/lesson.md` | `TutorAgent.generateLesson` |
| `tutor/remediation.md` | `TutorAgent.generateRemediation` |
| `tutor/qa.md` | `TutorAgent.answerStudentQuestion` |
| `grading/grade.md` | `GradingAgent` — open-ended grading |
| `grading/failure-analysis.md` | `FailureAnalysisAgent` |
| `analysis/session-review.md` | reserved for M11 |
| `experiment/policy-selection.md` | reserved for M10 |

An unresolved placeholder logs a warning and is left in the prompt text rather than
throwing — watch the logs for `Prompt variable not provided` after editing a prompt.

---

## Development

```bash
pnpm dev          # tsx watch — restarts on change
pnpm build        # build all packages, then the server
pnpm start        # run the built server
pnpm typecheck    # tsc --noEmit across every package
pnpm lint         # eslint over apps/ and packages/
pnpm format       # prettier --write
```

Packages are built in dependency order (`shared → llm → core → retrieval/storage →
node-server`). After changing a package's public types, rebuild before typechecking
the server, since it consumes the emitted `.d.ts` files.

There is no automated test suite yet — see below.

---

## What is not built yet

Milestones **M0–M8** are implemented. The remainder of the roadmap in `plan/` is not:

| Milestone | Status |
|---|---|
| M9 — event logging | **Not built.** No `EventLogRepository`; the events listed in spec §38 are not recorded. Only ad-hoc structured logs exist. |
| M10 — experimentation | **Not built.** `ExperimentAgent` does not exist. Every lesson uses `DefaultTeachingParameters`; `EXPERIMENT_EPSILON` is unused. |
| M11 — analysis & analytics | **Not built.** No `AnalysisAgent`, no policy performance tracking, no analytics endpoints. |
| M12 — Cloud Run deployment | **Not built.** No Dockerfile, no Sheets storage adapter. `STORAGE_BACKEND=memory` is the only working option. |

Also outstanding, and worth knowing before a live trial:

- **Student state is in memory only.** Restarting the server clears all progress.
- **No automated tests.** Spec §43 calls for schema, repository, prompt, mock-LLM,
  orchestration, selection, mastery, and logging tests; none exist. `MockLlmClient` is
  in place, so the fixtures for writing them are ready.
- **Question banks are multiple-choice only.** The schema and `GradingAgent` support
  numeric, short-text, and conceptual items; the shipped course does not use them.
- **Visualization guides are unimplemented.** `VisualizationGuide` is defined as a type
  per spec §9.9, but the loader does not read a `visualization-guides/` directory and
  nothing consumes the guides.
- **The lesson UI loads `marked.js` from a CDN.** With no network the lesson renders as
  plain text with line breaks rather than formatted markdown.
