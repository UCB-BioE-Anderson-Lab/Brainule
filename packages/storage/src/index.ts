export { CourseRepository } from './repositories/course';
export { FilesystemCourseRepository } from './filesystem/courseRepository';
export { StudentStateRepository } from './repositories/studentState';
export { InMemoryStudentStateRepository } from './memory/studentStateRepository';
export { SheetsStudentStateRepository } from './sheets/studentStateRepository';
export type { QuestionRepository } from './memory/questionRepository';
export { InMemoryQuestionRepository } from './memory/questionRepository';
export type { EventLogRepository } from './repositories/eventLog';
export { InMemoryEventLogRepository } from './memory/eventLog';
export { GoogleSheetsEventLogRepository } from './sheets/eventLogRepository';
export type { GoogleSheetsConfig } from './sheets/eventLogRepository';
export type { PolicyRepository } from './repositories/policy';
export { InMemoryPolicyRepository } from './memory/policy';
export { InMemorySessionSummaryRepository } from './memory/sessionSummary';

// ── Storage factories ────────────────────────────────────────────────────────

import { StudentStateRepository } from './repositories/studentState';
import { EventLogRepository } from './repositories/eventLog';
import { InMemoryStudentStateRepository } from './memory/studentStateRepository';
import { InMemoryEventLogRepository } from './memory/eventLog';
import { SheetsStudentStateRepository } from './sheets/studentStateRepository';
import { GoogleSheetsEventLogRepository } from './sheets/eventLogRepository';

export interface StorageConfig {
  storageBackend: string; // 'memory' | 'sheets'
  googleSpreadsheetId?: string;
  googleShareEmail?: string;
  courseTitle?: string | (() => Promise<string>);
}

export function createStudentStateRepository(cfg: StorageConfig): StudentStateRepository {
  if (cfg.storageBackend === 'sheets' && cfg.googleSpreadsheetId) {
    return new SheetsStudentStateRepository(cfg.googleSpreadsheetId);
  }
  return new InMemoryStudentStateRepository();
}

export function createEventLogRepository(cfg: StorageConfig): EventLogRepository {
  const hasCredentials = Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
  );
  if ((cfg.storageBackend === 'sheets' || hasCredentials) && cfg.googleSpreadsheetId !== undefined) {
    return new GoogleSheetsEventLogRepository({
      spreadsheetId: cfg.googleSpreadsheetId,
      shareWithEmail: cfg.googleShareEmail,
      courseTitle: cfg.courseTitle,
    });
  }
  return new InMemoryEventLogRepository();
}
