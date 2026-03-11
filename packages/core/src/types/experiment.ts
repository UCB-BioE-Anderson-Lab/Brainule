import { TeachingParameters, LessonStyle, ExplanationDepth, LessonTone, PrerequisiteRefresh } from './lesson';

export interface LessonPolicyAssignment {
  policyAssignmentId: string;
  leafTopicId: string;
  studentId: string;
  lessonStyle: LessonStyle;
  explanationDepth: ExplanationDepth;
  tone: LessonTone;
  exampleCount: number;
  socraticRatio: number;
  visualizationRatio: number;
  prerequisiteRefresh: PrerequisiteRefresh;
  assignedAt: string;
}

export interface PolicyPerformance {
  policyId: string;
  leafTopicId: string;
  /** Full parameters stored so we can reconstruct them when exploiting. */
  parameters: TeachingParameters;
  impressions: number;
  successCount: number;
  failureCount: number;
  averageAttemptsToMastery: number;
  averageSentimentDelta: number;
  updatedAt: string;
}

export interface TeachingParameterSpace {
  lessonStyle: LessonStyle[];
  explanationDepth: ExplanationDepth[];
  tone: LessonTone[];
  exampleCount: number[];
  socraticRatio: number[];
  visualizationRatio: number[];
  prerequisiteRefresh: PrerequisiteRefresh[];
}

export interface ExperimentConfig {
  explorationRate: number; // epsilon, 0.0–1.0
  optimizationTarget: 'quiz_success' | 'min_attempts' | 'min_frustration';
  parameterSpace: TeachingParameterSpace;
}
