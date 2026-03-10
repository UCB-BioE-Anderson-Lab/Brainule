import { StudentState } from '@brainule/core';

export interface StudentStateRepository {
  getStudentState(studentId: string): Promise<StudentState | null>;
  saveStudentState(state: StudentState): Promise<void>;
}
