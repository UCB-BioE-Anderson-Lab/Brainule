import { StudentTopicState } from './student';

export interface QuestionSelectionInput {
  leafTopicId: string;
  studentTopicState: StudentTopicState;
  allowedTypes?: string[];
  difficultyHint?: string;
}

export interface GradingResult {
  gradingResultId: string;
  questionId: string;
  correct: boolean;
  score: number;
  rubricResult: object;
  errorCategory?: string;
  graderConfidence: number;
  gradingNotes: string;
}

export class NoQuestionsAvailableError extends Error {
  constructor(leafTopicId: string) {
    super(`No questions available for leaf topic: ${leafTopicId}`);
    this.name = 'NoQuestionsAvailableError';
  }
}
