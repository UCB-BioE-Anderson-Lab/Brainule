#!/usr/bin/env bash
# Brainule Cloud Run deployment script
# Usage: PROJECT_ID=my-project ANTHROPIC_API_KEY=sk-... ./deploy.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID must be set}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY must be set}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-brainule-server}"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-brainule-server@${PROJECT_ID}.iam.gserviceaccount.com}"

echo "Building Docker image: ${IMAGE}"
docker build \
  -f apps/node-server/Dockerfile \
  -t "${IMAGE}" \
  .

echo "Pushing image to GCR..."
docker push "${IMAGE}"

echo "Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --service-account "${SERVICE_ACCOUNT}" \
  --set-env-vars "LLM_PROVIDER=anthropic,LLM_MODEL=claude-sonnet-4-6,STORAGE_BACKEND=sheets,COURSE_DIR=/app/course,PROMPTS_DIR=/app/packages/prompts,NODE_ENV=production" \
  --set-secrets "ANTHROPIC_API_KEY=anthropic-api-key:latest" \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1

echo "Deployment complete."
gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format "value(status.url)"
