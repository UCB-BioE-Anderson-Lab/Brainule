import { Router, Request, Response } from 'express';
import { StudentModelService } from '@brainule/core';
import { CourseRepository } from '@brainule/storage';

export function createStudentRouter(
  studentService: StudentModelService,
  courseRepo: CourseRepository,
): Router {
  const router = Router();

  // POST /students/:studentId — create or retrieve student session
  router.post('/:studentId', async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { courseId } = req.body as { courseId?: string };
    if (!courseId) {
      res.status(400).json({ error: 'courseId is required' });
      return;
    }
    const state = await studentService.getStudentState(studentId, courseId);
    res.json(state);
  });

  // GET /students/:studentId/progress
  router.get('/:studentId/progress', async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const pkg = await courseRepo.getCoursePackage();
    const state = await studentService.getStudentState(studentId, pkg.metadata.courseId);

    // Ensure a topic state entry exists for every leaf topic
    const topicStates = pkg.leafTopics.map((lt) => {
      const ts = state.topicStates.find((s) => s.leafTopicId === lt.leafTopicId);
      return ts ?? {
        leafTopicId: lt.leafTopicId,
        mastered: false,
        attemptCount: 0,
        correctCount: 0,
        incorrectCount: 0,
      };
    });

    res.json({
      studentId: state.studentId,
      activeCourseId: state.activeCourseId,
      topicStates,
    });
  });

  return router;
}
