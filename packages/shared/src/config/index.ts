export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  llmProvider: process.env.LLM_PROVIDER ?? 'mock',
  llmModel: process.env.LLM_MODEL,
  openaiApiKey: process.env.OPENAI_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  storageBackend: process.env.STORAGE_BACKEND ?? 'memory',
  googleSpreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
  courseDir: process.env.COURSE_DIR ?? 'course',
  promptsDir: process.env.PROMPTS_DIR ?? 'packages/prompts',
  experimentEpsilon: parseFloat(process.env.EXPERIMENT_EPSILON ?? '0.3'),
};
