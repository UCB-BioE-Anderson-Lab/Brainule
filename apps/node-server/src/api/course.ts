import { Router, Request, Response } from 'express';
import { CourseRepository } from '@brainule/storage';
import { asyncHandler } from './asyncHandler';

export function createCourseRouter(courseRepo: CourseRepository): Router {
  const router: Router = Router();

  router.get('/course', asyncHandler(async (_req: Request, res: Response) => {
    const pkg = await courseRepo.getCoursePackage();
    res.json({
      courseId: pkg.metadata.courseId,
      title: pkg.metadata.title,
      subject: pkg.metadata.subject,
      description: pkg.metadata.description,
      leafTopics: pkg.leafTopics.map((lt) => ({
        leafTopicId: lt.leafTopicId,
        title: lt.title,
        description: lt.description,
        parentTopicId: lt.parentTopicId,
        misconceptionIds: lt.misconceptionIds,
        assessmentBankIds: lt.assessmentBankIds,
        active: lt.active,
      })),
      questionCount: pkg.assessmentItems.length,
      topicCount: pkg.topics.length,
    });
  }));

  return router;
}
