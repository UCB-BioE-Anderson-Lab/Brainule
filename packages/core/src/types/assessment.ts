import { AssessmentItem } from './course';
import { StudentTopicState } from './student';

/**
 * An AssessmentItem as served to a student: everything needed to render and
 * answer the question, with the grading key removed. `answerKey` and `rubric`
 * must never reach the browser before the answer is submitted — the correct
 * answer comes back in `GradingResult.rubricResult` afterwards.
 */
export type ServedAssessmentItem = Omit<AssessmentItem, 'answerKey' | 'rubric'>;

export function toServedItem(item: AssessmentItem): ServedAssessmentItem {
  const served = { ...item } as AssessmentItem & { answerKey?: unknown; rubric?: unknown };
  delete served.answerKey;
  delete served.rubric;
  return served;
}

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
