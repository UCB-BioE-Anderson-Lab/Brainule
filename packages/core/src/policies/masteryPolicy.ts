import { StudentTopicState } from '../types/student';

export interface MasteryPolicyConfig {
  policyId: string;
  type: string;
  minimumCorrect: number;
  requiredQuestionTypes?: string[];
  requiredDelayCheck?: boolean;
}

export const defaultMasteryPolicyConfig: MasteryPolicyConfig = {
  policyId: 'default',
  type: 'threshold',
  minimumCorrect: 1,
};

export class MasteryPolicy {
  isMastered(topicState: StudentTopicState, config: MasteryPolicyConfig): boolean {
    if (topicState.correctCount < config.minimumCorrect) return false;
    if (config.requiredQuestionTypes && config.requiredQuestionTypes.length > 0) {
      // Future: check that required question types have been answered correctly
    }
    return true;
  }
}
