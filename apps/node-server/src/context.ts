import * as path from 'path';
import { config } from '@brainule/shared';
import { StudentModelService, CorpusRetrievalAgent } from '@brainule/core';
import { FilesystemCourseRepository, InMemoryStudentStateRepository } from '@brainule/storage';
import { TagRetriever, TagRetrieverRepository } from '@brainule/retrieval';

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
