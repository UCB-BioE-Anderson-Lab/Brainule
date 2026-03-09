# M1 — Course Schemas & Loader

**Goal:** Define all course data types with zod, implement a YAML/JSON course loader that
validates and hydrates a course package from disk, and create a minimal fixture course
(derived from BioE 134/234 content) that passes validation.

**Depends on:** M0

---

## Implementation Tasks

### Type definitions (`packages/core/src/types/course.ts`)
- [ ] `CourseMetadata` interface (courseId, title, subject, levelRange, version, authors, description, prerequisites)
- [ ] `Module` interface (moduleId, title, description, unitIds)
- [ ] `Unit` interface (unitId, moduleId, title, description, topicIds)
- [ ] `Topic` interface (topicId, unitId, title, description, leafTopicIds, prerequisiteTopicIds)
- [ ] `LeafTopic` interface (leafTopicId, parentTopicId, title, description, learningObjectiveIds, prerequisiteLeafTopicIds, misconceptionIds, allowedKnowledgeTags, assessmentBankIds, visualizationGuideIds, defaultDifficultyExpectation, active)
- [ ] `LearningObjective` interface (learningObjectiveId, leafTopicId, statement, skillType)
- [ ] `Misconception` interface (misconceptionId, leafTopicId, label, description, exampleWrongReasoning, correctionStrategy)
- [ ] `CorpusDocument` interface (docId, title, source, topicTags, leafTopicTags, contentPath, chunkingStrategy, difficulty, visualizationHints)
- [ ] `VisualizationGuide` interface (visualizationGuideId, leafTopicId, label, guidance, preferredQuestionTypes)
- [ ] `AssessmentBank` interface (assessmentBankId, leafTopicId, questionIds, generationPolicy)
- [ ] `AssessmentItem` interface (questionId, leafTopicId, questionType, difficulty, prompt, answerKey, rubric, visualizationGuideId?, tags, active)
- [ ] `ParametricQuestionTemplate` interface
- [ ] Barrel export from `packages/core/src/types/index.ts`

### Zod schemas (`packages/core/src/schemas/`)
- [ ] `courseSchema.ts` — zod schemas matching each type above, with `.parse()` validation
- [ ] Schema for `AssessmentItem` must validate `questionType` as enum (initial set: `multiple_choice | numeric | short_text | conceptual_explanation`)
- [ ] Schema for `LeafTopic.active` defaults to `true` if missing
- [ ] Export `CoursePackage` type = all loaded course data combined

### Course loader (`packages/core/src/services/courseLoader.ts`)
- [ ] `loadCoursePackage(courseDir: string): Promise<CoursePackage>` function
- [ ] Reads `course.yaml` → validates with `CourseMetadataSchema`
- [ ] Reads `modules/*.yaml` → validates each
- [ ] Reads `topics/*.yaml` and `leaf-topics/*.yaml` → validates each
- [ ] Reads `misconceptions/*.yaml` → validates each
- [ ] Reads `question-banks/*.json` → validates each `AssessmentItem`
- [ ] Reads `corpus-manifest.yaml` → validates each `CorpusDocument` entry
- [ ] Throws descriptive errors listing all validation failures (not just the first)
- [ ] Returns fully typed `CoursePackage` object

### YAML parser setup
- [ ] Add `js-yaml` (and `@types/js-yaml`) to `packages/core`
- [ ] Helper `parseYamlFile<T>(path: string, schema: ZodSchema<T>): T`

### Fixture course (`/course/`)
- [ ] `course.yaml` — BioE 134/234 Midterm Prep metadata
- [ ] At least 2 modules, 3 topics, 5 leaf topics as `.yaml` files
- [ ] At least 2 misconceptions per leaf topic
- [ ] At least 3 `AssessmentItem` entries per leaf topic in `question-banks/`
- [ ] `corpus-manifest.yaml` with 2–3 corpus document stubs
- [ ] Questions migrated from existing Brainule v1 Sheets content where available

### CourseRepository interface (`packages/storage/src/index.ts`)
- [ ] Define `CourseRepository` interface with `getCoursePackage(): Promise<CoursePackage>`
- [ ] `FilesystemCourseRepository` implementation that calls `loadCoursePackage`

### Wire into server
- [ ] `apps/node-server/src/api/course.ts` — `GET /course` returns top-level course metadata + topic tree
- [ ] Server initializes `FilesystemCourseRepository` on startup, makes it available to routes

---

## Behavioral Acceptance Checklist

- [ ] `GET /course` returns JSON with `courseId`, `title`, and an array of `leafTopics`
- [ ] Each leaf topic in the response has `leafTopicId`, `title`, `description`, `misconceptionIds`, `assessmentBankIds`
- [ ] Adding a field with a wrong type to `course.yaml` causes the server to throw a descriptive validation error on startup (not a silent failure)
- [ ] Adding a question with a missing required field to a question bank JSON causes the loader to log the specific validation failure
- [ ] A leaf topic with `active: false` is loaded but can be filtered by consumers
- [ ] `loadCoursePackage` works independently of Express (importable as a library function)
- [ ] TypeScript: no `any` types in course schemas or loader — everything is strongly typed
- [ ] `pnpm tsc --noEmit` passes across all packages after M1 changes
