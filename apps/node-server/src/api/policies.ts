import { Router, Request, Response } from 'express';
import { PolicyRepository } from '@brainule/storage';

export function createPoliciesRouter(policyRepo: PolicyRepository): Router {
  const router = Router();

  // GET /policies/performance?leafTopicId=X
  router.get('/performance', async (req: Request, res: Response) => {
    const { leafTopicId } = req.query as { leafTopicId?: string };
    if (!leafTopicId) {
      res.status(400).json({ error: 'leafTopicId is required' });
      return;
    }
    const performances = await policyRepo.getAllPerformances(leafTopicId);
    const sorted = performances.sort((a, b) => {
      const rateA = a.impressions > 0 ? a.successCount / a.impressions : 0;
      const rateB = b.impressions > 0 ? b.successCount / b.impressions : 0;
      return rateB - rateA;
    });
    res.json({ count: sorted.length, performances: sorted });
  });

  return router;
}
