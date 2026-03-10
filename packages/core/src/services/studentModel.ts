import { StudentState, StudentTopicState, StudentInteractionProfile } from '../types/student';
import { MasteryPolicyConfig, MasteryPolicy } from '../policies/masteryPolicy';

const RECENT_WINDOW = 20; // keep last N question ids

function freshInteractionProfile(): StudentInteractionProfile {
  return {
    preferredStyleIndicators: {},
    preferredToneIndicators: {},
    sentimentTrend: 0,
    persistenceTrend: 0,
    verbosityTolerance: 0.5,
    visualizationAffinity: 0.5,
  };
}

function freshTopicState(studentId: string, leafTopicId: string): StudentTopicState {
  return {
    studentId,
    leafTopicId,
    mastered: false,
    masteryScore: 0,
    attemptCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    recentQuestionIds: [],
    recentMisconceptionIds: [],
    frustrationScore: 0,
    averageResponseLatencyMs: 0,
  };
}

export function createFreshStudentState(studentId: string, courseId: string): StudentState {
  const now = new Date().toISOString();
  return {
    studentId,
    activeCourseId: courseId,
    topicStates: [],
    globalInteractionProfile: freshInteractionProfile(),
    createdAt: now,
    updatedAt: now,
  };
}

export function getOrCreateTopicState(
  state: StudentState,
  leafTopicId: string,
): StudentTopicState {
  return (
    state.topicStates.find((ts) => ts.leafTopicId === leafTopicId) ??
    freshTopicState(state.studentId, leafTopicId)
  );
}

function updateTopicState(state: StudentState, updated: StudentTopicState): StudentState {
  const exists = state.topicStates.some((ts) => ts.leafTopicId === updated.leafTopicId);
  const topicStates = exists
    ? state.topicStates.map((ts) => (ts.leafTopicId === updated.leafTopicId ? updated : ts))
    : [...state.topicStates, updated];
  return { ...state, topicStates, updatedAt: new Date().toISOString() };
}

function updatedAverageLatency(current: number, count: number, newLatency: number): number {
  return (current * count + newLatency) / (count + 1);
}

export function recordCorrectAnswer(
  state: StudentState,
  leafTopicId: string,
  questionId: string,
  latencyMs: number,
): StudentState {
  const ts = getOrCreateTopicState(state, leafTopicId);
  const updated: StudentTopicState = {
    ...ts,
    attemptCount: ts.attemptCount + 1,
    correctCount: ts.correctCount + 1,
    recentQuestionIds: [...ts.recentQuestionIds, questionId].slice(-RECENT_WINDOW),
    averageResponseLatencyMs: updatedAverageLatency(ts.averageResponseLatencyMs, ts.attemptCount, latencyMs),
    lastSeenAt: new Date().toISOString(),
  };
  return updateTopicState(state, updated);
}

export function recordIncorrectAnswer(
  state: StudentState,
  leafTopicId: string,
  questionId: string,
  latencyMs: number,
  misconceptionIds: string[] = [],
): StudentState {
  const ts = getOrCreateTopicState(state, leafTopicId);
  const updated: StudentTopicState = {
    ...ts,
    attemptCount: ts.attemptCount + 1,
    incorrectCount: ts.incorrectCount + 1,
    recentQuestionIds: [...ts.recentQuestionIds, questionId].slice(-RECENT_WINDOW),
    recentMisconceptionIds: [...ts.recentMisconceptionIds, ...misconceptionIds].slice(-RECENT_WINDOW),
    averageResponseLatencyMs: updatedAverageLatency(ts.averageResponseLatencyMs, ts.attemptCount, latencyMs),
    lastSeenAt: new Date().toISOString(),
  };
  return updateTopicState(state, updated);
}

export function applyMasteryCheck(
  state: StudentState,
  leafTopicId: string,
  policy: MasteryPolicyConfig,
): StudentState {
  const ts = getOrCreateTopicState(state, leafTopicId);
  const mastered = new MasteryPolicy().isMastered(ts, policy);
  if (ts.mastered === mastered) return state; // no change
  const updated: StudentTopicState = {
    ...ts,
    mastered,
    masteryScore: mastered ? 1 : ts.masteryScore,
    lastLessonPolicyId: policy.policyId,
  };
  return updateTopicState(state, updated);
}
