import { CoursePackage } from '@brainule/core';

export interface CourseRepository {
  getCoursePackage(): Promise<CoursePackage>;
}
