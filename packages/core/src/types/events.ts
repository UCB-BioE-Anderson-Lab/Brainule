export type EventType =
  | 'lesson_generated'
  | 'student_question'
  | 'tutor_response'
  | 'question_served'
  | 'answer_submitted'
  | 'answer_graded'
  | 'failure_analyzed'
  | 'remediation_generated'
  | 'topic_mastered'
  | 'feedback_captured'
  | 'policy_assigned'
  | 'session_analyzed';

export interface EventLog {
  eventId: string;
  eventType: EventType;
  studentId: string;
  courseId: string;
  leafTopicId: string;
  sessionId: string;
  policyAssignmentId?: string;
  promptName?: string;
  promptHash?: string;
  llmProvider?: string;
  llmModel?: string;
  payload: Record<string, unknown>;
  createdAt: string; // ISO 8601
}

export interface EventFilter {
  studentId?: string;
  leafTopicId?: string;
  eventType?: EventType;
  fromDate?: string;
  limit?: number;
}
