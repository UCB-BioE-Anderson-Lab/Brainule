import { LlmClient } from '@brainule/llm';
import { generateId } from '@brainule/shared';
import { logger } from '@brainule/shared';
import { AssessmentItem } from '../types/course';
import { GradingResult } from '../types/assessment';
import { PromptRepository } from '../services/promptRepository';

export class GradingAgent {
  constructor(
    private readonly llm: LlmClient,
    private readonly promptRepo: PromptRepository,
  ) {}

  async grade(question: AssessmentItem, studentAnswer: string): Promise<GradingResult> {
    switch (question.questionType) {
      case 'multiple_choice':
        return this.gradeMC(question, studentAnswer);
      case 'numeric':
        return this.gradeNumeric(question, studentAnswer);
      case 'short_text':
      case 'conceptual_explanation':
        return this.gradeLlm(question, studentAnswer);
      default:
        return this.gradeLlm(question, studentAnswer);
    }
  }

  private gradeMC(question: AssessmentItem, studentAnswer: string): GradingResult {
    const key = String(question.answerKey ?? '').trim().toUpperCase();
    const answer = studentAnswer.trim().toUpperCase();
    const correct = key === answer;
    return {
      gradingResultId: generateId(),
      questionId: question.questionId,
      correct,
      score: correct ? 1.0 : 0,
      rubricResult: { expected: key, received: answer },
      graderConfidence: 1.0,
      gradingNotes: correct ? 'Correct answer.' : `Expected ${key}, got ${answer}.`,
    };
  }

  private gradeNumeric(question: AssessmentItem, studentAnswer: string): GradingResult {
    const studentVal = parseFloat(studentAnswer);
    const answerKey = question.answerKey as { value?: number; tolerance?: number } | null ?? {};
    const expected = answerKey.value ?? 0;
    const tolerance = answerKey.tolerance ?? 0;
    const correct = !isNaN(studentVal) && Math.abs(studentVal - expected) <= tolerance;
    return {
      gradingResultId: generateId(),
      questionId: question.questionId,
      correct,
      score: correct ? 1.0 : 0,
      rubricResult: { expected, tolerance, received: studentVal },
      graderConfidence: 1.0,
      gradingNotes: correct ? 'Within tolerance.' : `Expected ${expected} ± ${tolerance}, got ${studentVal}.`,
    };
  }

  private async gradeLlm(question: AssessmentItem, studentAnswer: string): Promise<GradingResult> {
    const variables = {
      QUESTION_PROMPT: question.prompt,
      ANSWER_KEY: JSON.stringify(question.answerKey),
      RUBRIC: JSON.stringify(question.rubric ?? {}),
      STUDENT_ANSWER: studentAnswer,
    };
    const prompt = await this.promptRepo.getPrompt('grading/grade', variables);
    const response = await this.llm.generate({
      systemPrompt: prompt,
      userPrompt: `Grade this answer: ${studentAnswer}`,
      responseFormat: 'json',
    });

    let parsed: { correct?: boolean; score?: number; notes?: string } = {};
    try {
      parsed = (response.structured as typeof parsed) ?? JSON.parse(response.text);
    } catch {
      logger.warn('Failed to parse LLM grading response', { questionId: question.questionId });
    }

    const correct = parsed.correct ?? false;
    return {
      gradingResultId: generateId(),
      questionId: question.questionId,
      correct,
      score: parsed.score ?? (correct ? 1.0 : 0),
      rubricResult: parsed,
      graderConfidence: 0.85,
      gradingNotes: parsed.notes ?? '',
    };
  }
}
