import { AssessmentItem } from '../types/course';
import { QuestionSelectionInput, NoQuestionsAvailableError } from '../types/assessment';

export interface QuestionRepository {
  getRandomQuestion(input: QuestionSelectionInput): Promise<AssessmentItem>;
  getQuestion(questionId: string): Promise<AssessmentItem | null>;
  getQuestionsForTopic(leafTopicId: string): Promise<AssessmentItem[]>;
}

export class AssessmentAgent {
  constructor(private readonly questionRepo: QuestionRepository) {}

  async selectQuestion(input: QuestionSelectionInput): Promise<AssessmentItem> {
    const question = await this.questionRepo.getRandomQuestion(input);
    if (!question) throw new NoQuestionsAvailableError(input.leafTopicId);
    return question;
  }

  async getQuestion(questionId: string): Promise<AssessmentItem | null> {
    return this.questionRepo.getQuestion(questionId);
  }
}
