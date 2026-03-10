import { AssessmentItem } from '../types/course';
import { GradingResult } from '../types/assessment';
import { StudentState } from '../types/student';
import { AssessmentAgent } from '../agents/assessmentAgent';
import { GradingAgent } from '../agents/gradingAgent';
import { StudentModelService } from './studentModelService';
import { getOrCreateTopicState } from './studentModel';

export class AssessmentService {
  constructor(
    private readonly assessmentAgent: AssessmentAgent,
    private readonly gradingAgent: GradingAgent,
    private readonly studentModelService: StudentModelService,
  ) {}

  async getNextQuestion(studentId: string, courseId: string, leafTopicId: string): Promise<AssessmentItem> {
    const state = await this.studentModelService.getStudentState(studentId, courseId);
    const topicState = getOrCreateTopicState(state, leafTopicId);
    return this.assessmentAgent.selectQuestion({ leafTopicId, studentTopicState: topicState });
  }

  async submitAnswer(
    studentId: string,
    courseId: string,
    leafTopicId: string,
    questionId: string,
    answer: string,
    latencyMs: number,
  ): Promise<{ gradingResult: GradingResult; updatedState: StudentState }> {
    const question = await this.assessmentAgent.getQuestion(questionId);
    if (!question) throw new Error(`Question not found: ${questionId}`);

    const gradingResult = await this.gradingAgent.grade(question, answer);
    const updatedState = await this.studentModelService.markAnswerAndCheckMastery(
      studentId,
      courseId,
      leafTopicId,
      questionId,
      gradingResult.correct,
      latencyMs,
    );

    return { gradingResult, updatedState };
  }
}
