import { AssessmentItem, QuestionSelectionInput, NoQuestionsAvailableError } from '@brainule/core';
import { logger } from '@brainule/shared';

export interface QuestionRepository {
  getRandomQuestion(input: QuestionSelectionInput): Promise<AssessmentItem>;
  getQuestion(questionId: string): Promise<AssessmentItem | null>;
  getQuestionsForTopic(leafTopicId: string): Promise<AssessmentItem[]>;
}

/** How many of the student's most recent items to exclude from selection (M6). */
const DEFAULT_RECENT_WINDOW = 5;

export class InMemoryQuestionRepository implements QuestionRepository {
  private byTopic = new Map<string, AssessmentItem[]>();
  private byId = new Map<string, AssessmentItem>();
  private built = false;

  constructor(
    private readonly loader: () => Promise<AssessmentItem[]>,
    private readonly recentWindow: number = DEFAULT_RECENT_WINDOW,
  ) {}

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

    const recent = studentTopicState.recentQuestionIds;
    const lastSeenId = recent[recent.length - 1];
    const recentIds = new Set(recent.slice(-this.recentWindow));
    let eligible = pool.filter((q) => !recentIds.has(q.questionId));

    if (eligible.length === 0) {
      // The pool is exhausted, so recent items become fair game again — but
      // never the one the student just saw. Spec §33 requires the question
      // after a failure to differ from the one that was failed, and re-serving
      // it immediately would also let a student brute-force the same item.
      eligible = pool.filter((q) => q.questionId !== lastSeenId);
      if (eligible.length === 0) eligible = pool; // single-question bank
      logger.warn('Question pool exhausted for topic, resetting', {
        leafTopicId,
        poolSize: pool.length,
        excluded: lastSeenId,
      });
    }

    return eligible[Math.floor(Math.random() * eligible.length)];
  }
}
