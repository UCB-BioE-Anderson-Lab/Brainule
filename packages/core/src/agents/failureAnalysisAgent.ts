import { LlmClient } from '@brainule/llm';
import { generateId } from '@brainule/shared';
import { logger } from '@brainule/shared';
import { AssessmentItem, Misconception } from '../types/course';
import { GradingResult } from '../types/assessment';
import { FailureAnalysis, FailureType } from '../types/remediation';
import { LeafTopic } from '../types/course';
import { PromptRepository } from '../services/promptRepository';

export interface FailureAnalysisInput {
  studentId: string;
  question: AssessmentItem;
  studentAnswer: string;
  gradingResult: GradingResult;
  leafTopic: LeafTopic;
  topicMisconceptions: Misconception[];
}

const VALID_FAILURE_TYPES: FailureType[] = ['conceptual', 'procedural', 'careless', 'language', 'unknown'];

export class FailureAnalysisAgent {
  constructor(
    private readonly llm: LlmClient,
    private readonly promptRepo: PromptRepository,
  ) {}

  async analyze(input: FailureAnalysisInput): Promise<FailureAnalysis> {
    const { studentId, question, studentAnswer, gradingResult, topicMisconceptions } = input;

    const misconceptionsList = topicMisconceptions.map(
      (m) => `- ${m.misconceptionId}: ${m.label} — ${m.description}`,
    ).join('\n') || '(No misconceptions defined for this topic.)';

    const variables = {
      QUESTION_PROMPT: question.prompt,
      STUDENT_ANSWER: studentAnswer,
      GRADING_RESULT: gradingResult.gradingNotes,
      MISCONCEPTIONS_LIST: misconceptionsList,
    };

    const prompt = await this.promptRepo.getPrompt('grading/failure-analysis', variables);
    const response = await this.llm.generate({
      systemPrompt: prompt,
      userPrompt: `Analyze this failure for student: ${studentId}`,
      responseFormat: 'json',
    });

    type LlmFailureResponse = {
      failureType?: string;
      summary?: string;
      likelyMisconceptionLabels?: string[];
      remediationHints?: string[];
    };

    let parsed: LlmFailureResponse = {};
    try {
      parsed = (response.structured as LlmFailureResponse) ?? JSON.parse(response.text);
    } catch {
      logger.warn('Failed to parse failure analysis response', { questionId: question.questionId });
    }

    // Match misconception labels to IDs
    const likelyLabels = parsed.likelyMisconceptionLabels ?? [];
    const likelyIds = topicMisconceptions
      .filter((m) => likelyLabels.some((label) =>
        m.label.toLowerCase().includes(label.toLowerCase()) ||
        m.misconceptionId === label,
      ))
      .map((m) => m.misconceptionId);

    const failureType = VALID_FAILURE_TYPES.includes(parsed.failureType as FailureType)
      ? (parsed.failureType as FailureType)
      : 'unknown';

    return {
      failureAnalysisId: generateId(),
      studentId,
      leafTopicId: input.leafTopic.leafTopicId,
      questionId: question.questionId,
      likelyMisconceptionIds: likelyIds,
      failureType,
      summary: parsed.summary ?? 'Unable to determine failure reason.',
      remediationHints: parsed.remediationHints ?? [],
    };
  }
}
