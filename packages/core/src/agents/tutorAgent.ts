import { LlmClient } from '@brainule/llm';
import { sha256, generateId } from '@brainule/shared';
import { LeafTopic, LearningObjective, Misconception, AssessmentItem, StudentTopicState, RetrievedContentPack, GeneratedLesson, TutorResponse, TeachingParameters } from '../types/index';
import { GradingResult } from '../types/assessment';
import { FailureAnalysis } from '../types/remediation';
import { PromptRepository } from '../services/promptRepository';

export interface LessonInput {
  leafTopic: LeafTopic;
  contentPack: RetrievedContentPack;
  parameters: TeachingParameters;
  studentTopicState: StudentTopicState;
  learningObjectives?: LearningObjective[];
  priorFailureEvidence?: FailureAnalysis;
}

export interface RemediationInput {
  leafTopic: LeafTopic;
  contentPack: RetrievedContentPack;
  failureAnalysis: FailureAnalysis;
  /** The failed item — used as evidence only; its answer must not be revealed. */
  failedQuestion: AssessmentItem;
  studentAnswer: string;
  gradingResult: GradingResult;
  /** Misconception library for the topic, used to name the likely misconceptions. */
  topicMisconceptions?: Misconception[];
  studentTopicState: StudentTopicState;
  parameters: TeachingParameters;
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
      EXAMPLE_COUNT: String(parameters.exampleCount),
      STEP_GRANULARITY: parameters.stepGranularity,
      SOCRATIC_RATIO: parameters.socraticRatio.toFixed(1),
      VISUALIZATION_RATIO: parameters.visualizationRatio.toFixed(1),
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

  async generateRemediation(input: RemediationInput): Promise<GeneratedLesson> {
    const {
      leafTopic,
      contentPack,
      failureAnalysis,
      failedQuestion,
      studentAnswer,
      gradingResult,
      topicMisconceptions = [],
      parameters,
    } = input;

    const corpusText = contentPack.chunks.map((c) => c.content).join('\n\n---\n\n') ||
      '(No corpus content available for this topic.)';

    // The failed item is evidence for the tutor. The answer key is deliberately
    // withheld: the prompt forbids revealing it, and the next question will be
    // a different item from the same leaf-topic bank (spec §35).
    const failedQuestionText = [
      failedQuestion.prompt,
      failedQuestion.choices
        ? Object.entries(failedQuestion.choices).map(([k, v]) => `  ${k}. ${v}`).join('\n')
        : '',
    ].filter(Boolean).join('\n');

    const misconceptionsById = new Map(topicMisconceptions.map((m) => [m.misconceptionId, m]));
    const likelyMisconceptions = failureAnalysis.likelyMisconceptionIds
      .map((id) => misconceptionsById.get(id))
      .filter((m): m is Misconception => m !== undefined)
      .map((m) => `- ${m.label}: ${m.description}\n  Correction strategy: ${m.correctionStrategy}`)
      .join('\n') || `- (No specific misconception identified.) ${failureAnalysis.summary}`;

    const variables: Record<string, string> = {
      LEAF_TOPIC_TITLE: leafTopic.title,
      LEAF_TOPIC_DESCRIPTION: leafTopic.description,
      FAILED_QUESTION: failedQuestionText,
      STUDENT_ANSWER: studentAnswer,
      GRADING_NOTES: gradingResult.gradingNotes,
      LIKELY_MISCONCEPTIONS: likelyMisconceptions,
      CORPUS_CHUNKS: corpusText,
      FAILURE_SUMMARY: failureAnalysis.summary,
      FAILURE_TYPE: failureAnalysis.failureType,
      REMEDIATION_HINTS: failureAnalysis.remediationHints.map((h) => `- ${h}`).join('\n') ||
        '- Review the core concepts carefully.',
      LESSON_STYLE: parameters.lessonStyle,
      TONE: parameters.tone,
    };

    const renderedPrompt = await this.promptRepo.getPrompt('tutor/remediation', variables);
    const response = await this.llm.generate({
      systemPrompt: renderedPrompt,
      userPrompt: `Generate remediation lesson for: ${leafTopic.title}`,
      responseFormat: 'text',
    });

    return {
      lessonId: generateId(),
      leafTopicId: leafTopic.leafTopicId,
      content: response.text,
      parameters,
      promptName: 'tutor/remediation',
      promptHash: sha256(renderedPrompt),
      llmProvider: response.provider,
      llmModel: response.model,
      generatedAt: new Date().toISOString(),
    };
  }
}
