export interface CourseMetadata {
  courseId: string;
  title: string;
  subject: string;
  levelRange: string;
  version: string;
  authors: string[];
  description: string;
  prerequisites: string[];
}

export interface Module {
  moduleId: string;
  title: string;
  description: string;
  unitIds: string[];
}

export interface Unit {
  unitId: string;
  moduleId: string;
  title: string;
  description: string;
  topicIds: string[];
}

export interface Topic {
  topicId: string;
  unitId: string;
  title: string;
  description: string;
  leafTopicIds: string[];
  prerequisiteTopicIds: string[];
}

export interface LearningObjective {
  learningObjectiveId: string;
  leafTopicId: string;
  statement: string;
  skillType: string;
}

export interface Misconception {
  misconceptionId: string;
  leafTopicId: string;
  label: string;
  description: string;
  exampleWrongReasoning: string;
  correctionStrategy: string;
}

export interface LeafTopic {
  leafTopicId: string;
  parentTopicId: string;
  title: string;
  description: string;
  learningObjectiveIds: string[];
  prerequisiteLeafTopicIds: string[];
  misconceptionIds: string[];
  allowedKnowledgeTags: string[];
  assessmentBankIds: string[];
  visualizationGuideIds: string[];
  defaultDifficultyExpectation: string;
  active: boolean;
}

export type QuestionType =
  | 'multiple_choice'
  | 'numeric'
  | 'symbolic'
  | 'short_text'
  | 'conceptual_explanation'
  | 'diagram_interpretation'
  | 'code_execution'
  | 'graph_interpretation'
  | 'table_interpretation';

export interface AssessmentItem {
  questionId: string;
  leafTopicId: string;
  questionType: QuestionType;
  difficulty: 'easy' | 'medium' | 'hard';
  prompt: string;
  choices?: Record<string, string>; // for multiple_choice
  answerKey?: unknown;
  rubric?: unknown;
  visualizationGuideId?: string;
  tags: string[];
  active: boolean;
}

export interface CorpusDocument {
  docId: string;
  title: string;
  source: string;
  topicTags: string[];
  leafTopicTags: string[];
  contentPath: string;
  chunkingStrategy: string;
  difficulty: string;
  visualizationHints: string[];
}

export interface CoursePackage {
  metadata: CourseMetadata;
  modules: Module[];
  units: Unit[];
  topics: Topic[];
  leafTopics: LeafTopic[];
  misconceptions: Misconception[];
  learningObjectives: LearningObjective[];
  assessmentItems: AssessmentItem[];
  corpusDocuments: CorpusDocument[];
}
