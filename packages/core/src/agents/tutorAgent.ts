import { LlmClient } from '@brainule/llm';
import { sha256, generateId } from '@brainule/shared';
import { LeafTopic, LearningObjective, StudentTopicState, RetrievedContentPack, GeneratedLesson, TutorResponse, TeachingParameters, FailureAnalysis } from '../types/index';
import { PromptRepository } from '../services/promptRepository';

export interface LessonInput {
  leafTopic: LeafTopic;
  contentPack: RetrievedContentPack;
  parameters: TeachingParameters;
  studentTopicState: StudentTopicState;
  learningObjectives?: LearningObjective[];
  priorFailureEvidence?: FailureAnalysis;
}

export interface QAInput {
  leafTopic: LeafTopic;
  lessonContent: string;
  studentQuestion: string;
  studentTopicState: StudentTopicState;
}

export class TutorAgent {
  constructor(
    private readonly llm: LlmClient,
    private readonly promptRepo: PromptRepository,
  ) {}

  async generateLesson(input: LessonInput): Promise<GeneratedLesson> {
    const { leafTopic, contentPack, parameters, learningObjectives = [] } = input;

    const objectivesList = learningObjectives.map((o) => `- ${o.statement}`).join('\n') ||
      '- Understand the core concepts of this topic';

    const corpusText = contentPack.chunks.map((c) => c.content).join('\n\n---\n\n') ||
      '(No corpus content available for this topic.)';

    const prereqRefreshInstruction: Record<string, string> = {
      none: 'Do not reference prerequisites.',
      light: 'Briefly mention any prerequisite concepts in one sentence.',
      moderate: 'Spend a short paragraph refreshing key prerequisites.',
      heavy: 'Begin with a thorough prerequisite review before introducing the new topic.',
    };

    const variables: Record<string, string> = {
      LEAF_TOPIC_TITLE: leafTopic.title,
      LEAF_TOPIC_DESCRIPTION: leafTopic.description,
      LEARNING_OBJECTIVES: objectivesList,
      CORPUS_CHUNKS: corpusText,
      LESSON_STYLE: parameters.lessonStyle,
      EXPLANATION_DEPTH: parameters.explanationDepth,
      TONE: parameters.tone,
      PREREQUISITE_REFRESH: prereqRefreshInstruction[parameters.prerequisiteRefresh] ?? '',
    };

    const renderedPrompt = await this.promptRepo.getPrompt('tutor/lesson', variables);
    const response = await this.llm.generate({
      systemPrompt: renderedPrompt,
      userPrompt: `Generate the lesson for: ${leafTopic.title}`,
      responseFormat: 'text',
    });

    return {
      lessonId: generateId(),
      leafTopicId: leafTopic.leafTopicId,
      content: response.text,
      parameters,
      promptName: 'tutor/lesson',
      promptHash: sha256(renderedPrompt),
      llmProvider: response.provider,
      llmModel: response.model,
      generatedAt: new Date().toISOString(),
    };
  }

  async answerStudentQuestion(input: QAInput): Promise<TutorResponse> {
    const { leafTopic, lessonContent, studentQuestion } = input;

    const variables: Record<string, string> = {
      LEAF_TOPIC_TITLE: leafTopic.title,
      LESSON_CONTEXT: lessonContent,
      STUDENT_QUESTION: studentQuestion,
    };

    const renderedPrompt = await this.promptRepo.getPrompt('tutor/qa', variables);
    const response = await this.llm.generate({
      systemPrompt: renderedPrompt,
      userPrompt: studentQuestion,
      responseFormat: 'text',
    });

    return {
      responseId: generateId(),
      leafTopicId: leafTopic.leafTopicId,
      content: response.text,
      generatedAt: new Date().toISOString(),
    };
  }
}
