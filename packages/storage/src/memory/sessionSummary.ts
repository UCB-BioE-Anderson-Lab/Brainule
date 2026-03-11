import { SessionSummaryNote } from '@brainule/core';

export class InMemorySessionSummaryRepository {
  private readonly store: SessionSummaryNote[] = [];

  async save(summary: SessionSummaryNote): Promise<void> {
    this.store.push(summary);
  }

  async getAll(): Promise<SessionSummaryNote[]> {
    return [...this.store];
  }

  async getByStudent(studentId: string): Promise<SessionSummaryNote[]> {
    return this.store.filter((s) => s.studentId === studentId);
  }
}
