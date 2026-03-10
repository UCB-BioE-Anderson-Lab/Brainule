import { GradingResult } from './assessment';
import { GeneratedLesson } from './lesson';
import { StudentTopicState } from './student';

export type FailureType = 'conceptual' | 'procedural' | 'careless' | 'language' | 'unknown';

export interface FailureAnalysis {
  failureAnalysisId: string;
  studentId: string;
  leafTopicId: string;
  questionId: string;
  likelyMisconceptionIds: string[];
  failureType: FailureType;
  summary: string;
  remediationHints: string[];
}

export interface AnswerResult {
  gradingResult: GradingResult;
  mastered: boolean;
  remediation?: GeneratedLesson;
  updatedTopicState: StudentTopicState;
}
