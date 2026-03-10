import { AssessmentItem, QuestionSelectionInput, NoQuestionsAvailableError } from '@brainule/core';
import { logger } from '@brainule/shared';

export interface QuestionRepository {
  getRandomQuestion(input: QuestionSelectionInput): Promise<AssessmentItem>;
  getQuestion(questionId: string): Promise<AssessmentItem | null>;
  getQuestionsForTopic(leafTopicId: string): Promise<AssessmentItem[]>;
}

export class InMemoryQuestionRepository implements QuestionRepository {
  private byTopic = new Map<string, AssessmentItem[]>();
  private byId = new Map<string, AssessmentItem>();
  private built = false;

  constructor(private readonly loader: () => Promise<AssessmentItem[]>) {}

  private async ensureBuilt(): Promise<void> {
    if (this.built) return;
    const items = await this.loader();
    for (const item of items) {
      this.byId.set(item.questionId, item);
      const existing = this.byTopic.get(item.leafTopicId) ?? [];
      this.byTopic.set(item.leafTopicId, [...existing, item]);
    }
    this.built = true;
  }

  async getQuestionsForTopic(leafTopicId: string): Promise<AssessmentItem[]> {
    await this.ensureBuilt();
    return this.byTopic.get(leafTopicId) ?? [];
  }

  async getQuestion(questionId: string): Promise<AssessmentItem | null> {
    await this.ensureBuilt();
    return this.byId.get(questionId) ?? null;
  }

  async getRandomQuestion(input: QuestionSelectionInput): Promise<AssessmentItem> {
    await this.ensureBuilt();
    const { leafTopicId, studentTopicState, allowedTypes } = input;
    let pool = this.byTopic.get(leafTopicId) ?? [];
    if (pool.length === 0) throw new NoQuestionsAvailableError(leafTopicId);

    if (allowedTypes && allowedTypes.length > 0) {
      pool = pool.filter((q) => allowedTypes.includes(q.questionType));
      if (pool.length === 0) throw new NoQuestionsAvailableError(leafTopicId);
    }

    const recentIds = new Set(studentTopicState.recentQuestionIds.slice(-5));
    let eligible = pool.filter((q) => !recentIds.has(q.questionId));
    if (eligible.length === 0) {
      logger.warn('Question pool exhausted for topic, resetting', { leafTopicId });
      eligible = pool;
    }

    return eligible[Math.floor(Math.random() * eligible.length)];
  }
}
