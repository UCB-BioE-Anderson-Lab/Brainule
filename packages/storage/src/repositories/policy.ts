import { PolicyPerformance } from '@brainule/core';

export interface PolicyRepository {
  getPolicyPerformance(policyId: string, leafTopicId: string): Promise<PolicyPerformance | null>;
  savePolicyPerformance(perf: PolicyPerformance): Promise<void>;
  getAllPerformances(leafTopicId: string): Promise<PolicyPerformance[]>;
}
