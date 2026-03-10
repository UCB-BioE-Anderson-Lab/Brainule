import { Router, Request, Response } from 'express';
import {
  TutorAgent,
  CorpusRetrievalAgent,
  StudentModelService,
  DefaultTeachingParameters,
  getOrCreateTopicState,
} from '@brainule/core';
import { CourseRepository } from '@brainule/storage';

export function createLessonRouter(
  tutorAgent: TutorAgent,
  corpusAgent: CorpusRetrievalAgent,
  studentService: StudentModelService,
  courseRepo: CourseRepository,
): Router {
  const router = Router();

  // POST /lessons/generate — body: { studentId, leafTopicId }
  router.post('/generate', async (req: Request, res: Response) => {
    const { studentId, leafTopicId } = req.body as { studentId?: string; leafTopicId?: string };
    if (!studentId || !leafTopicId) {
      res.status(400).json({ error: 'studentId and leafTopicId are required' });
      return;
    }

    const pkg = await courseRepo.getCoursePackage();
    const leafTopic = pkg.leafTopics.find((lt) => lt.leafTopicId === leafTopicId);
    if (!leafTopic) {
      res.status(404).json({ error: `Leaf topic not found: ${leafTopicId}` });
      return;
    }

    const studentState = await studentService.getStudentState(studentId, pkg.metadata.courseId);
    const studentTopicState = getOrCreateTopicState(studentState, leafTopicId);
    const contentPack = await corpusAgent.retrieve(leafTopic, leafTopic.prerequisiteLeafTopicIds);

    const lesson = await tutorAgent.generateLesson({
      leafTopic,
      contentPack,
      parameters: DefaultTeachingParameters,
      studentTopicState,
    });

    res.json(lesson);
  });

  return router;
}
