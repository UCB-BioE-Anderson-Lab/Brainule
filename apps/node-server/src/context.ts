import * as path from 'path';
import { config } from '@brainule/shared';
import {
  StudentModelService, CorpusRetrievalAgent, TutorAgent, FilePromptRepository,
  AssessmentAgent, GradingAgent, AssessmentService, FailureAnalysisAgent, TutoringOrchestrator,
  ExperimentAgent, DefaultTeachingParameterSpace, AnalysisAgent,
} from '@brainule/core';
import {
  FilesystemCourseRepository, InMemoryStudentStateRepository, InMemoryQuestionRepository,
  InMemoryEventLogRepository, GoogleSheetsEventLogRepository, InMemoryPolicyRepository,
  InMemorySessionSummaryRepository,
} from '@brainule/storage';
import { TagRetriever, TagRetrieverRepository } from '@brainule/retrieval';
import { llmGateway } from './adapters/llm';

const courseDir = path.resolve(process.cwd(), config.courseDir);

export const courseRepo = new FilesystemCourseRepository(courseDir);

const studentRepo = new InMemoryStudentStateRepository();
export const studentService = new StudentModelService(studentRepo);

export const tagRetriever = new TagRetriever(async () => {
  const pkg = await courseRepo.getCoursePackage();
  return { manifest: pkg.corpusDocuments, corpusDir: courseDir };
});
export const retrievalRepo = new TagRetrieverRepository(tagRetriever);
export const corpusRetrievalAgent = new CorpusRetrievalAgent(retrievalRepo);

const promptsDir = path.resolve(process.cwd(), config.promptsDir);
const promptRepo = new FilePromptRepository(promptsDir);
export const tutorAgent = new TutorAgent(llmGateway, promptRepo);

// Assessment & Grading — lazy-initialized from course package
const questionRepo = new InMemoryQuestionRepository(async () => {
  const pkg = await courseRepo.getCoursePackage();
  return pkg.assessmentItems;
});
export const assessmentAgent = new AssessmentAgent(questionRepo);
export const gradingAgent = new GradingAgent(llmGateway, promptRepo);
export const assessmentService = new AssessmentService(assessmentAgent, gradingAgent, studentService);

export const failureAnalysisAgent = new FailureAnalysisAgent(llmGateway, promptRepo);

// Experimentation — epsilon-greedy policy selection
export const policyRepo = new InMemoryPolicyRepository();
export const experimentAgent = new ExperimentAgent(policyRepo, {
  explorationRate: config.experimentEpsilon,
  optimizationTarget: 'quiz_success',
  parameterSpace: DefaultTeachingParameterSpace,
});

export const tutoringOrchestrator = new TutoringOrchestrator(
  courseRepo,
  corpusRetrievalAgent,
  tutorAgent,
  failureAnalysisAgent,
  assessmentService,
  studentService,
  experimentAgent,
);

// Event logging — Google Sheets when credentials are configured, otherwise in-memory
const hasGoogleCredentials = Boolean(
  process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
);

export const eventLogRepo = hasGoogleCredentials
  ? new GoogleSheetsEventLogRepository({
      spreadsheetId: config.googleSpreadsheetId,
      shareWithEmail: config.googleShareEmail,
      courseTitle: async () => {
        const pkg = await courseRepo.getCoursePackage();
        return pkg.metadata.title;
      },
    })
  : new InMemoryEventLogRepository();

// Analysis & session summaries
export const sessionSummaryRepo = new InMemorySessionSummaryRepository();
export const analysisAgent = new AnalysisAgent(llmGateway, promptRepo, policyRepo);
