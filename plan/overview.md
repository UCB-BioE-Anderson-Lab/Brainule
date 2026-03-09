# Brainule 2.0 — Architecture Overview

## Vision

Brainule 2.0 is a curriculum-bounded, multi-agent, self-improving STEM tutoring platform.
Instructors define the approved knowledge universe and assessment scope. LLM-driven lesson
generation, remediation, experimentation, and analysis continuously improve how each leaf
topic is taught — without routine instructor intervention.

---

## Architecture Decision: Node.js + Google Cloud Run

**Why not Apps Script:**
- Apps Script cannot run persistent server logic or background workers
- Apps Script cannot host multi-agent orchestration cleanly
- Node.js is the natural home for LLM API calls, streaming, and TypeScript

**Why Google Cloud Run:**
- Stateless container, scales to zero (free tier when idle)
- Application Default Credentials (ADC) — no key files needed for Sheets/Drive auth
- Just grant the Cloud Run service account access to the spreadsheet
- Easy Dockerfile-based deploy from existing TypeScript code

**Why Google Sheets (initially):**
- Already in use for Brainule v1 event logging
- Zero infrastructure to set up
- Can migrate to Postgres on Cloud Run later without changing repository interfaces

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Language | TypeScript (strict) |
| Web framework | Express |
| Schema validation | zod |
| Package manager | pnpm workspaces (monorepo) |
| LLM | Anthropic Claude (primary), with provider abstraction |
| Storage (initial) | In-memory + JSON files (dev), Google Sheets (prod) |
| Storage (later) | Postgres on Cloud Run |
| Deploy | Google Cloud Run via Docker |
| Auth (Sheets) | Application Default Credentials (ADC) |

---

## Monorepo Structure

```
/apps
  /node-server          — Express HTTP server, API routes, worker wiring
    /src
      /api              — route handlers
      /workers          — background/async workers
      /adapters         — runtime adapters (env, logging)
      app.ts
/packages
  /core                 — domain logic, agents, orchestration (runtime-agnostic)
    /src
      /agents           — TutorAgent, AssessmentAgent, GradingAgent, etc.
      /domain           — pure types and interfaces
      /orchestration    — TutoringOrchestrator, main loop
      /policies         — mastery policy, experiment policy
      /schemas          — zod schemas for all domain types
      /services         — application service facades
      /types            — TypeScript interface definitions
      index.ts
  /llm                  — LlmClient interface + provider adapters
    /src
      /clients
        anthropic.ts
        openai.ts
        gemini.ts
        mock.ts
      index.ts
  /prompts              — prompt markdown files
    tutor/
      lesson.md
      remediation.md
      qa.md
    grading/
      grade.md
      failure-analysis.md
    analysis/
      session-review.md
    experiment/
      policy-selection.md
  /retrieval            — CorpusRetrievalAgent, chunking, tag filtering
  /storage              — repository interfaces + adapters
    /src
      /memory           — in-memory implementations
      /sheets           — Google Sheets implementations
      /postgres         — (future)
      index.ts
  /shared               — config, logging, utils
/course                 — course content package (first course: BioE 134/234)
  course.yaml
  /modules
  /units
  /topics
  /leaf-topics
  /misconceptions
  /question-banks
  /corpus
  corpus-manifest.yaml
  /visualization-guides
/plan                   — this folder
```

---

## Agent Map

| Agent / Service | Role |
|---|---|
| TutorAgent | Generates lessons, answers student Qs, generates remediation |
| AssessmentAgent | Selects quiz questions (avoids repeats, honors constraints) |
| GradingAgent | Grades answers (deterministic MC, LLM rubric, numeric) |
| FailureAnalysisAgent | Diagnoses failed answers → structured FailureAnalysis |
| ExperimentAgent | Assigns teaching parameter policy (epsilon-greedy) |
| AnalysisAgent | Post-session analysis, updates policy performance, student profile |
| CorpusRetrievalAgent | Retrieves approved content for a leaf topic |
| StudentModelService | Loads/saves StudentState, computes mastery |
| PromptRepository | Loads prompt markdown files with template variable substitution |
| LlmGateway | Routes LLM requests to the chosen provider adapter |

---

## Milestone Roadmap

| Milestone | Name | Phase |
|---|---|---|
| M0 | Monorepo Scaffold | 0 |
| M1 | Course Schemas & Loader | 1 |
| M2 | Student State & Mastery | 1 |
| M3 | LLM Layer & Prompt Repository | 1 |
| M4 | Corpus Retrieval | 1 |
| M5 | Lesson Generation | 1 |
| M6 | Assessment & Grading | 1 |
| M7 | Remediation Loop (MVP Complete) | 1 |
| M8 | Three-Panel Web UI | 1 |
| M9 | Event Logging | 1 |
| M10 | Experimentation | 2 |
| M11 | Analysis & Analytics | 2 |
| M12 | Cloud Run Deployment | 2 |

---

## Key Design Rules

1. Core domain code in `/packages/core` must have **zero** dependencies on Express, Apps Script, or any specific LLM SDK.
2. All LLM calls go through `LlmClient` interface — never import Anthropic SDK in core agents.
3. All storage access goes through repository interfaces — never import Sheets/Postgres clients in agents.
4. All prompts live in `/packages/prompts` as markdown files — never hardcode prompts in agent code.
5. The TutorAgent must **not** receive future assessment questions.
6. Mastery policy must be configurable without code changes.
