import { PolicyPerformance } from '@brainule/core';
import { PolicyRepository } from '../repositories/policy';

export class InMemoryPolicyRepository implements PolicyRepository {
  private readonly store = new Map<string, PolicyPerformance>();

  private key(policyId: string, leafTopicId: string): string {
    return `${leafTopicId}::${policyId}`;
  }

  async getPolicyPerformance(policyId: string, leafTopicId: string): Promise<PolicyPerformance | null> {
    return this.store.get(this.key(policyId, leafTopicId)) ?? null;
  }

  async savePolicyPerformance(perf: PolicyPerformance): Promise<void> {
    this.store.set(this.key(perf.policyId, perf.leafTopicId), perf);
  }

  async getAllPerformances(leafTopicId: string): Promise<PolicyPerformance[]> {
    const results: PolicyPerformance[] = [];
    for (const perf of this.store.values()) {
      if (perf.leafTopicId === leafTopicId) results.push(perf);
    }
    return results;
  }
}
