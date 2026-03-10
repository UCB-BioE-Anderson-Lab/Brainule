export type LessonStyle =
  | 'definition_first'
  | 'example_first'
  | 'analogy_first'
  | 'misconception_first'
  | 'procedural_first';

export type ExplanationDepth = 'short' | 'medium' | 'deep';
export type LessonTone = 'neutral' | 'encouraging' | 'direct' | 'energetic';
export type PrerequisiteRefresh = 'none' | 'light' | 'moderate' | 'heavy';
export type StepGranularity = 'low' | 'medium' | 'high';

export interface TeachingParameters {
  lessonStyle: LessonStyle;
  explanationDepth: ExplanationDepth;
  tone: LessonTone;
  exampleCount: number;
  socraticRatio: number;
  visualizationRatio: number;
  stepGranularity: StepGranularity;
  prerequisiteRefresh: PrerequisiteRefresh;
}

export const DefaultTeachingParameters: TeachingParameters = {
  lessonStyle: 'example_first',
  explanationDepth: 'medium',
  tone: 'encouraging',
  exampleCount: 2,
  socraticRatio: 0.2,
  visualizationRatio: 0.2,
  stepGranularity: 'medium',
  prerequisiteRefresh: 'light',
};

export interface GeneratedLesson {
  lessonId: string;
  leafTopicId: string;
  content: string;
  parameters: TeachingParameters;
  policyAssignmentId?: string;
  promptName: string;
  promptHash: string;
  llmProvider: string;
  llmModel: string;
  generatedAt: string;
}

export interface TutorResponse {
  responseId: string;
  leafTopicId: string;
  content: string;
  generatedAt: string;
}

// Stub for FailureAnalysis — fully implemented in M7
export interface FailureAnalysis {
  failureType: string;
  summary: string;
  likelyMisconceptionLabels: string[];
  remediationHints: string[];
}
