# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /repo

# Enable corepack for pnpm
RUN corepack enable

# Copy manifests first to cache dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/node-server/package.json ./apps/node-server/
COPY packages/core/package.json ./packages/core/
COPY packages/llm/package.json ./packages/llm/
COPY packages/retrieval/package.json ./packages/retrieval/
COPY packages/shared/package.json ./packages/shared/
COPY packages/storage/package.json ./packages/storage/

# Install all dependencies (including devDeps needed for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps ./apps
COPY packages ./packages

# Build all packages, then the server
RUN pnpm run build

# Create a self-contained deployment artifact using pnpm deploy
RUN pnpm --filter node-server deploy /deploy --prod --legacy

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy the self-contained deployment from builder
COPY --from=builder /deploy .

# Bundle the course package and prompt templates into the image
COPY --from=builder /repo/course ./course
COPY --from=builder /repo/packages/prompts ./packages/prompts

EXPOSE 8080

CMD ["node", "dist/server.js"]
