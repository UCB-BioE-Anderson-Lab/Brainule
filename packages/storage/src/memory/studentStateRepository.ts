import { StudentState } from '@brainule/core';
import { StudentStateRepository } from '../repositories/studentState';

export class InMemoryStudentStateRepository implements StudentStateRepository {
  private store = new Map<string, StudentState>();

  async getStudentState(studentId: string): Promise<StudentState | null> {
    const state = this.store.get(studentId);
    if (!state) return null;
    return JSON.parse(JSON.stringify(state)) as StudentState;
  }

  async saveStudentState(state: StudentState): Promise<void> {
    this.store.set(state.studentId, JSON.parse(JSON.stringify(state)) as StudentState);
  }
}
