import { Router, Request, Response } from 'express';
import { CorpusRetrievalAgent } from '@brainule/core';
import { CourseRepository } from '@brainule/storage';
import { asyncHandler } from './asyncHandler';

export function createCorpusRouter(
  corpusAgent: CorpusRetrievalAgent,
  courseRepo: CourseRepository,
): Router {
  const router = Router();

  // GET /corpus/:leafTopicId — dev endpoint for retrieval inspection
  router.get('/:leafTopicId', asyncHandler(async (req: Request, res: Response) => {
    const { leafTopicId } = req.params;
    const pkg = await courseRepo.getCoursePackage();
    const leafTopic = pkg.leafTopics.find((lt) => lt.leafTopicId === leafTopicId);
    if (!leafTopic) {
      res.status(404).json({ error: `Leaf topic not found: ${leafTopicId}` });
      return;
    }
    const pack = await corpusAgent.retrieve(leafTopic, leafTopic.prerequisiteLeafTopicIds);
    res.json(pack);
  }));

  return router;
}
