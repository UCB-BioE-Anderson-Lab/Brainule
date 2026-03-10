import { z } from 'zod';

export const CourseMetadataSchema = z.object({
  courseId: z.string(),
  title: z.string(),
  subject: z.string(),
  levelRange: z.string(),
  version: z.string(),
  authors: z.array(z.string()).default([]),
  description: z.string(),
  prerequisites: z.array(z.string()).default([]),
});

export const ModuleSchema = z.object({
  moduleId: z.string(),
  title: z.string(),
  description: z.string().default(''),
  unitIds: z.array(z.string()).default([]),
});

export const UnitSchema = z.object({
  unitId: z.string(),
  moduleId: z.string(),
  title: z.string(),
  description: z.string().default(''),
  topicIds: z.array(z.string()).default([]),
});

export const TopicSchema = z.object({
  topicId: z.string(),
  unitId: z.string(),
  title: z.string(),
  description: z.string().default(''),
  leafTopicIds: z.array(z.string()).default([]),
  prerequisiteTopicIds: z.array(z.string()).default([]),
});

export const LearningObjectiveSchema = z.object({
  learningObjectiveId: z.string(),
  leafTopicId: z.string(),
  statement: z.string(),
  skillType: z.string().default('comprehension'),
});

export const MisconceptionSchema = z.object({
  misconceptionId: z.string(),
  leafTopicId: z.string(),
  label: z.string(),
  description: z.string(),
  exampleWrongReasoning: z.string().default(''),
  correctionStrategy: z.string().default(''),
});

export const LeafTopicSchema = z.object({
  leafTopicId: z.string(),
  parentTopicId: z.string(),
  title: z.string(),
  description: z.string(),
  learningObjectiveIds: z.array(z.string()).default([]),
  prerequisiteLeafTopicIds: z.array(z.string()).default([]),
  misconceptionIds: z.array(z.string()).default([]),
  allowedKnowledgeTags: z.array(z.string()).default([]),
  assessmentBankIds: z.array(z.string()).default([]),
  visualizationGuideIds: z.array(z.string()).default([]),
  defaultDifficultyExpectation: z.string().default('medium'),
  active: z.boolean().default(true),
});

export const QuestionTypeSchema = z.enum([
  'multiple_choice',
  'numeric',
  'symbolic',
  'short_text',
  'conceptual_explanation',
  'diagram_interpretation',
  'code_execution',
  'graph_interpretation',
  'table_interpretation',
]);

export const AssessmentItemSchema = z.object({
  questionId: z.string(),
  leafTopicId: z.string(),
  questionType: QuestionTypeSchema,
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  prompt: z.string(),
  choices: z.record(z.string()).optional(),
  answerKey: z.unknown(),
  rubric: z.unknown().optional(),
  visualizationGuideId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export const CorpusDocumentSchema = z.object({
  docId: z.string(),
  title: z.string(),
  source: z.string().default(''),
  topicTags: z.array(z.string()).default([]),
  leafTopicTags: z.array(z.string()).default([]),
  contentPath: z.string(),
  chunkingStrategy: z.string().default('paragraph'),
  difficulty: z.string().default('medium'),
  visualizationHints: z.array(z.string()).default([]),
});
