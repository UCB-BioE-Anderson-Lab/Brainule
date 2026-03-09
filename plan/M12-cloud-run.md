# M12 — Google Cloud Run Deployment

**Goal:** Package the Node.js server as a Docker container, configure Google Cloud Run
with Application Default Credentials (ADC), implement Google Sheets storage adapters for
`StudentStateRepository` and `EventLogRepository`, and deploy the full application to a
live Cloud Run service URL.

**Depends on:** M9 (EventLogRepository interface), M2 (StudentStateRepository interface), M11 (full system functional)

---

## Implementation Tasks

### Docker (`apps/node-server/Dockerfile`)
- [ ] Base image: `node:20-slim`
- [ ] Multi-stage build: `builder` stage compiles TypeScript → `runner` stage copies `dist/`
- [ ] `COPY package*.json pnpm-lock.yaml ./` before `COPY src` (layer caching)
- [ ] Install production dependencies only in runner stage (`pnpm install --prod`)
- [ ] Set `ENV NODE_ENV=production`
- [ ] Expose port from `$PORT` env var (Cloud Run sets `PORT=8080`)
- [ ] `CMD ["node", "dist/server.js"]`
- [ ] `.dockerignore`: `node_modules`, `*.test.ts`, `.env`, `plan/`, `src/`

### Google Cloud Setup (manual steps — documented in `plan/M12-cloud-run.md`)
- [ ] Enable APIs: `run.googleapis.com`, `sheets.googleapis.com`, `iam.googleapis.com`
- [ ] Create a service account: `brainule-server@PROJECT_ID.iam.gserviceaccount.com`
- [ ] Grant service account `roles/run.invoker` (for Cloud Run)
- [ ] Share the Brainule responses spreadsheet with the service account email (Editor role)
- [ ] Do NOT download a key file — ADC uses the service account identity automatically

### Cloud Run deploy script (`deploy.sh` or `Makefile` target)
- [ ] `docker build -t gcr.io/PROJECT_ID/brainule-server .`
- [ ] `docker push gcr.io/PROJECT_ID/brainule-server`
- [ ] `gcloud run deploy brainule-server --image gcr.io/PROJECT_ID/brainule-server --region us-central1 --service-account brainule-server@PROJECT_ID.iam.gserviceaccount.com --set-env-vars LLM_PROVIDER=anthropic,ANTHROPIC_API_KEY=... --allow-unauthenticated`

### Google Sheets StudentStateRepository (`packages/storage/src/sheets/studentState.ts`)
- [ ] Install `googleapis` package in `packages/storage`
- [ ] `SheetsStudentStateRepository` implementing `StudentStateRepository`:
  - Constructor: `(sheetsClient: sheets_v4.Sheets, spreadsheetId: string, sheetName: string)`
  - `getStudentState(studentId: string)`: reads row where column A = studentId, parses JSON from column B
  - `saveStudentState(state: StudentState)`: upserts — finds existing row and overwrites, or appends new row
  - Serializes full `StudentState` as JSON in a single cell (simple enough for MVP)
- [ ] Auth via ADC: `const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets'] })`
- [ ] ADC works automatically on Cloud Run (no `GOOGLE_APPLICATION_CREDENTIALS` env var needed)
- [ ] For local dev: `gcloud auth application-default login` once, then ADC works transparently

### Google Sheets EventLogRepository (`packages/storage/src/sheets/eventLog.ts`)
- [ ] `SheetsEventLogRepository` implementing `EventLogRepository`:
  - `logEvent(event: EventLog)`: appends a row with flattened fields
  - Columns: `eventId | eventType | studentId | courseId | leafTopicId | sessionId | promptName | llmProvider | llmModel | payload (JSON) | createdAt`
  - One sheet tab per `courseId` (creates tab if missing)
  - `getEvents(filter)`: reads all rows and filters in memory (acceptable for small scale)

### Storage factory (`packages/storage/src/index.ts`)
- [ ] `createStudentStateRepository(config): StudentStateRepository` — returns `InMemory...` when `STORAGE_BACKEND=memory`, `Sheets...` when `STORAGE_BACKEND=sheets`
- [ ] `createEventLogRepository(config): EventLogRepository` — same pattern
- [ ] Config reads `STORAGE_BACKEND`, `GOOGLE_SPREADSHEET_ID` from env

### Environment variables (production)
- [ ] `PORT=8080`
- [ ] `NODE_ENV=production`
- [ ] `LLM_PROVIDER=anthropic`
- [ ] `ANTHROPIC_API_KEY=<secret>` (use Cloud Run secret manager or env var)
- [ ] `STORAGE_BACKEND=sheets`
- [ ] `GOOGLE_SPREADSHEET_ID=<id>`
- [ ] `COURSE_DIR=/app/course` (course package bundled into Docker image)

### Health check
- [ ] Cloud Run health check: `GET /health` returns 200 within 5s
- [ ] Configure startup probe: 10 initial delay, 30s timeout

---

## Behavioral Acceptance Checklist

- [ ] `docker build` completes without errors
- [ ] `docker run -p 8080:8080 --env-file .env brainule-server` starts the server locally in the container
- [ ] `curl http://localhost:8080/health` returns `{"status":"ok"}` from inside the container
- [ ] `gcloud run deploy` succeeds and prints a live `https://*.run.app` URL
- [ ] The live Cloud Run URL serves the three-panel UI
- [ ] Creating a student and starting a lesson from the live URL writes a row to the Google Sheets spreadsheet (verify in Sheets)
- [ ] Submitting an answer from the live URL logs an `answer_submitted` event to Sheets
- [ ] Reloading the page (same `studentId` from localStorage) restores mastery state from Sheets
- [ ] `SheetsStudentStateRepository.getStudentState` returns the exact same `StudentState` that was previously saved (round-trip integrity)
- [ ] Service account has no downloaded key file; auth works entirely via ADC on Cloud Run
- [ ] `.env` file with `ANTHROPIC_API_KEY` is NOT bundled into the Docker image (verify with `docker inspect`)
- [ ] Cloud Run scales to zero after 15 minutes of inactivity; first request after cold start completes within 10 seconds
- [ ] `STORAGE_BACKEND=memory` (local dev) requires no Google auth and works offline

---

## Post-Deploy Checklist

- [ ] Set up basic Cloud Run monitoring alert (error rate > 5%)
- [ ] Enable Cloud Logging for the service
- [ ] Share the live URL with test students
- [ ] Verify event logs are accumulating in Sheets after real student sessions
- [ ] Tag the git commit as `v2.0.0-mvp`
