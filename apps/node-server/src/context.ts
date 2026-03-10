import * as path from 'path';
import { config } from '@brainule/shared';
import { FilesystemCourseRepository } from '@brainule/storage';

const courseDir = path.resolve(process.cwd(), config.courseDir);

export const courseRepo = new FilesystemCourseRepository(courseDir);
