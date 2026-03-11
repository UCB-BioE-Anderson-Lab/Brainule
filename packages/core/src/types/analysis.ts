export interface PolicyPerformanceUpdate {
  policyId: string;
  leafTopicId: string;
  deltaSuccessCount: number;
  deltaFailureCount: number;
  deltaImpressions: number;
  newAverageAttemptsToMastery: number;
  newAverageSentimentDelta: number;
}

export interface StudentProfileUpdate {
  studentId: string;
  /** Per-style scores normalized from correct-answer events */
  preferredStyleIndicators: Record<string, number>;
  sentimentTrend: number;
  persistenceTrend: number;
}

export interface SessionSummaryNote {
  sessionId: string;
  studentId: string;
  courseId: string;
  topicsCovered: string[];
  masteredThisSession: string[];
  totalCorrect: number;
  totalIncorrect: number;
  totalLessons: number;
  highlights: string[]; // LLM-generated bullet points
  analyzedAt: string;
}

export interface SessionAnalysisInput {
  sessionId: string;
  studentId: string;
  courseId: string;
  events: import('./events').EventLog[];
}

export interface SessionAnalysisResult {
  policyUpdates: PolicyPerformanceUpdate[];
  profileUpdate: StudentProfileUpdate;
  summary: SessionSummaryNote;
}
