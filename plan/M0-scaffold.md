# M0 — Monorepo Scaffold

**Goal:** A runnable Node.js/TypeScript monorepo with an Express server, shared package
wiring, dev tooling, and a health check endpoint. No business logic yet — just the skeleton
everything else will be built into.

**Depends on:** nothing

---

## Implementation Tasks

### Repository & Tooling
- [ ] Initialize git repo (already exists — ensure branch is `main`)
- [ ] Create `pnpm-workspace.yaml` declaring `apps/*` and `packages/*`
- [ ] Root `package.json` with `"private": true`, `engines.node: ">=20"`, dev scripts
- [ ] Root `tsconfig.base.json` with `strict: true`, `moduleResolution: "bundler"`, `target: "ES2022"`
- [ ] `.eslintrc` or `eslint.config.mjs` with TypeScript rules
- [ ] `.prettierrc` for consistent formatting
- [ ] `.gitignore` covering `node_modules`, `dist`, `.env`, `*.local`

### Packages scaffold (empty shells)
- [ ] `packages/shared` — `package.json`, `tsconfig.json`, `src/index.ts` (exports nothing yet)
- [ ] `packages/core` — `package.json`, `tsconfig.json`, `src/index.ts`
- [ ] `packages/llm` — `package.json`, `tsconfig.json`, `src/index.ts`
- [ ] `packages/prompts` — `package.json`, directory only (no TS needed initially)
- [ ] `packages/retrieval` — `package.json`, `tsconfig.json`, `src/index.ts`
- [ ] `packages/storage` — `package.json`, `tsconfig.json`, `src/index.ts`

### Express server (`apps/node-server`)
- [ ] `package.json` with deps: `express`, `@types/express`, `typescript`, `ts-node`, `nodemon`
- [ ] `tsconfig.json` extending base
- [ ] `src/app.ts` — creates Express app, registers routes, exports app
- [ ] `src/server.ts` — entry point, calls `app.listen(PORT)`
- [ ] `src/api/health.ts` — `GET /health` returns `{ status: "ok", version: "2.0.0" }`
- [ ] `src/api/index.ts` — registers all routers on the app
- [ ] Dev script: `nodemon --watch src --exec ts-node src/server.ts`
- [ ] Build script: `tsc --project tsconfig.json`

### Shared package foundations
- [ ] `packages/shared/src/config/index.ts` — reads env vars (`PORT`, `NODE_ENV`, `LLM_PROVIDER`, provider API keys — see M3)
- [ ] `packages/shared/src/logging/index.ts` — simple structured logger (wraps `console` or `pino`)

### Root dev experience
- [ ] `pnpm install` installs all workspaces
- [ ] `pnpm --filter node-server dev` starts the dev server
- [ ] `pnpm --filter node-server build` compiles without errors

---

## Behavioral Acceptance Checklist

When M0 is complete, you should be able to verify all of the following:

- [ ] `pnpm install` completes without errors
- [ ] `pnpm --filter node-server dev` starts the server and prints the port to stdout
- [ ] `curl http://localhost:3000/health` returns `{"status":"ok","version":"2.0.0"}`
- [ ] `pnpm --filter node-server build` produces a `dist/` folder without TypeScript errors
- [ ] Editing a `.ts` file in `apps/node-server/src` causes the dev server to auto-restart
- [ ] `packages/shared` can be imported from `apps/node-server` via workspace reference
- [ ] `packages/core`, `packages/llm`, `packages/storage`, `packages/retrieval` are importable (even if empty)
- [ ] No TypeScript errors in any package (`pnpm tsc --noEmit` passes everywhere)
- [ ] `.env` is not committed (check `.gitignore`)
