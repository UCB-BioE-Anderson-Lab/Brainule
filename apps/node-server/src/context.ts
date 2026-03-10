import * as path from 'path';
import { config } from '@brainule/shared';
import { StudentModelService, CorpusRetrievalAgent, TutorAgent, FilePromptRepository, AssessmentAgent, GradingAgent, AssessmentService, FailureAnalysisAgent, TutoringOrchestrator } from '@brainule/core';
import { FilesystemCourseRepository, InMemoryStudentStateRepository, InMemoryQuestionRepository } from '@brainule/storage';
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
export const tutoringOrchestrator = new TutoringOrchestrator(
  courseRepo,
  corpusRetrievalAgent,
  tutorAgent,
  failureAnalysisAgent,
  assessmentService,
  studentService,
);
