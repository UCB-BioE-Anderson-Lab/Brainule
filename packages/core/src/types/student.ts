export interface StudentInteractionProfile {
  preferredStyleIndicators: Record<string, number>;
  preferredToneIndicators: Record<string, number>;
  sentimentTrend: number;
  persistenceTrend: number;
  verbosityTolerance: number;
  visualizationAffinity: number;
}

export interface StudentTopicState {
  studentId: string;
  leafTopicId: string;
  mastered: boolean;
  masteryScore: number;
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  recentQuestionIds: string[];
  recentMisconceptionIds: string[];
  frustrationScore: number;
  averageResponseLatencyMs: number;
  lastLessonPolicyId?: string;
  lastSeenAt?: string;
}

export interface StudentState {
  studentId: string;
  activeCourseId: string;
  topicStates: StudentTopicState[];
  globalInteractionProfile: StudentInteractionProfile;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackEvent {
  eventId: string;
  studentId: string;
  leafTopicId: string;
  type: string;
  value: unknown;
  capturedAt: string;
}
