import { StudentState } from '../types/student';
import { MasteryPolicyConfig, defaultMasteryPolicyConfig } from '../policies/masteryPolicy';
import {
  createFreshStudentState,
  recordCorrectAnswer,
  recordIncorrectAnswer,
  applyMasteryCheck,
} from './studentModel';

export interface StudentStateRepository {
  getStudentState(studentId: string): Promise<StudentState | null>;
  saveStudentState(state: StudentState): Promise<void>;
}

export class StudentModelService {
  constructor(
    private readonly repo: StudentStateRepository,
    private readonly masteryPolicy: MasteryPolicyConfig = defaultMasteryPolicyConfig,
  ) {}

  async getStudentState(studentId: string, courseId: string): Promise<StudentState> {
    const existing = await this.repo.getStudentState(studentId);
    if (existing) return existing;
    const fresh = createFreshStudentState(studentId, courseId);
    await this.repo.saveStudentState(fresh);
    return fresh;
  }

  async saveStudentState(state: StudentState): Promise<void> {
    return this.repo.saveStudentState(state);
  }

  async markAnswerAndCheckMastery(
    studentId: string,
    courseId: string,
    leafTopicId: string,
    questionId: string,
    correct: boolean,
    latencyMs: number,
    misconceptionIds?: string[],
  ): Promise<StudentState> {
    let state = await this.getStudentState(studentId, courseId);
    if (correct) {
      state = recordCorrectAnswer(state, leafTopicId, questionId, latencyMs);
    } else {
      state = recordIncorrectAnswer(state, leafTopicId, questionId, latencyMs, misconceptionIds);
    }
    state = applyMasteryCheck(state, leafTopicId, this.masteryPolicy);
    await this.repo.saveStudentState(state);
    return state;
  }
}
