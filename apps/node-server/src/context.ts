import * as path from 'path';
import { config } from '@brainule/shared';
import { StudentModelService } from '@brainule/core';
import { FilesystemCourseRepository, InMemoryStudentStateRepository } from '@brainule/storage';

const courseDir = path.resolve(process.cwd(), config.courseDir);

export const courseRepo = new FilesystemCourseRepository(courseDir);

const studentRepo = new InMemoryStudentStateRepository();
export const studentService = new StudentModelService(studentRepo);
