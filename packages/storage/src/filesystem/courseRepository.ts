import { loadCoursePackage, CoursePackage } from '@brainule/core';
import { CourseRepository } from '../repositories/course';

export class FilesystemCourseRepository implements CourseRepository {
  private cached: CoursePackage | null = null;

  constructor(private readonly courseDir: string) {}

  async getCoursePackage(): Promise<CoursePackage> {
    if (!this.cached) {
      this.cached = await loadCoursePackage(this.courseDir);
    }
    return this.cached;
  }
}
