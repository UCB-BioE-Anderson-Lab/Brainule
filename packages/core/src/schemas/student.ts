import { z } from 'zod';

export const StudentInteractionProfileSchema = z.object({
  preferredStyleIndicators: z.record(z.number()).default({}),
  preferredToneIndicators: z.record(z.number()).default({}),
  sentimentTrend: z.number().default(0),
  persistenceTrend: z.number().default(0),
  verbosityTolerance: z.number().default(0.5),
  visualizationAffinity: z.number().default(0.5),
});

export const StudentTopicStateSchema = z.object({
  studentId: z.string(),
  leafTopicId: z.string(),
  mastered: z.boolean().default(false),
  masteryScore: z.number().default(0),
  attemptCount: z.number().default(0),
  correctCount: z.number().default(0),
  incorrectCount: z.number().default(0),
  recentQuestionIds: z.array(z.string()).default([]),
  recentMisconceptionIds: z.array(z.string()).default([]),
  frustrationScore: z.number().default(0),
  averageResponseLatencyMs: z.number().default(0),
  lastLessonPolicyId: z.string().optional(),
  lastSeenAt: z.string().optional(),
});

export const StudentStateSchema = z.object({
  studentId: z.string(),
  activeCourseId: z.string(),
  topicStates: z.array(StudentTopicStateSchema).default([]),
  globalInteractionProfile: StudentInteractionProfileSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const FeedbackEventSchema = z.object({
  eventId: z.string(),
  studentId: z.string(),
  leafTopicId: z.string(),
  type: z.string(),
  value: z.unknown(),
  capturedAt: z.string(),
});
