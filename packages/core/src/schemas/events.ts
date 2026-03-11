import { z } from 'zod';

export const EventTypeSchema = z.enum([
  'lesson_generated',
  'student_question',
  'tutor_response',
  'question_served',
  'answer_submitted',
  'answer_graded',
  'failure_analyzed',
  'remediation_generated',
  'topic_mastered',
  'feedback_captured',
  'policy_assigned',
  'session_analyzed',
]);

export const EventLogSchema = z.object({
  eventId: z.string().uuid(),
  eventType: EventTypeSchema,
  studentId: z.string(),
  courseId: z.string(),
  leafTopicId: z.string(),
  sessionId: z.string(),
  policyAssignmentId: z.string().optional(),
  promptName: z.string().optional(),
  promptHash: z.string().optional(),
  llmProvider: z.string().optional(),
  llmModel: z.string().optional(),
  payload: z.record(z.unknown()),
  createdAt: z.string().datetime(),
});

export const EventFilterSchema = z.object({
  studentId: z.string().optional(),
  leafTopicId: z.string().optional(),
  eventType: EventTypeSchema.optional(),
  fromDate: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
