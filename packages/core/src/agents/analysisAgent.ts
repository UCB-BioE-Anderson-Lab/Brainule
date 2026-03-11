import { LlmClient } from '@brainule/llm';
import { EventLog } from '../types/events';
import { PolicyPerformance } from '../types/experiment';
import {
  SessionAnalysisInput,
  SessionAnalysisResult,
  PolicyPerformanceUpdate,
  StudentProfileUpdate,
  SessionSummaryNote,
} from '../types/analysis';
import { PromptRepository } from '../services/promptRepository';

export interface AnalysisPolicyRepository {
  getPolicyPerformance(policyId: string, leafTopicId: string): Promise<PolicyPerformance | null>;
  savePolicyPerformance(perf: PolicyPerformance): Promise<void>;
  getAllPerformances(leafTopicId: string): Promise<PolicyPerformance[]>;
}

export class AnalysisAgent {
  constructor(
    private readonly llm: LlmClient,
    private readonly promptRepo: PromptRepository,
    private readonly policyRepo: AnalysisPolicyRepository,
  ) {}

  async analyzeSession(input: SessionAnalysisInput): Promise<SessionAnalysisResult> {
    const { sessionId, studentId, courseId, events } = input;

    if (events.length === 0) {
      return this.emptyResult(sessionId, studentId, courseId);
    }

    // ── 1. Group by leafTopicId ──────────────────────────────────────────
    const topicsCovered = [...new Set(events.map((e) => e.leafTopicId))];

    // ── 2. Compute per-topic stats ───────────────────────────────────────
    const answerGradedEvents = events.filter((e) => e.eventType === 'answer_graded');
    const masteredEvents = events.filter((e) => e.eventType === 'topic_mastered');
    const lessonEvents = events.filter((e) => e.eventType === 'lesson_generated');

    const masteredThisSession = [...new Set(masteredEvents.map((e) => e.leafTopicId))];
    const totalCorrect = answerGradedEvents.filter((e) => e.payload?.['correct']).length;
    const totalIncorrect = answerGradedEvents.filter((e) => !e.payload?.['correct']).length;
    const totalLessons = lessonEvents.length;

    // ── 3. Build PolicyPerformanceUpdate list ────────────────────────────
    const policyUpdates: PolicyPerformanceUpdate[] = [];

    // Group answer_graded events by policyAssignmentId
    const byPolicy = new Map<string, { correct: number; incorrect: number; attempts: number; leafTopicId: string }>();
    for (const e of answerGradedEvents) {
      const pid = e.policyAssignmentId;
      if (!pid) continue;
      const existing = byPolicy.get(pid) ?? { correct: 0, incorrect: 0, attempts: 0, leafTopicId: e.leafTopicId };
      existing.attempts += 1;
      if (e.payload?.['correct']) existing.correct += 1;
      else existing.incorrect += 1;
      byPolicy.set(pid, existing);
    }

    for (const [, stats] of byPolicy) {
      const mastered = masteredThisSession.includes(stats.leafTopicId);
      policyUpdates.push({
        policyId: '', // not available from events alone; resolved downstream
        leafTopicId: stats.leafTopicId,
        deltaSuccessCount: mastered ? 1 : 0,
        deltaFailureCount: mastered ? 0 : 1,
        deltaImpressions: 1,
        newAverageAttemptsToMastery: mastered ? stats.attempts : 0,
        newAverageSentimentDelta: 0,
      });
    }

    // ── 4. Build StudentProfileUpdate ────────────────────────────────────
    // Count lessonStyle occurrences from lesson_generated events where mastery followed
    const styleScores: Record<string, number> = {};
    for (const e of lessonEvents) {
      const style = (e.payload?.['parameters'] as Record<string, unknown>)?.['lessonStyle'];
      if (typeof style === 'string') {
        const wasMastered = masteredThisSession.includes(e.leafTopicId);
        styleScores[style] = (styleScores[style] ?? 0) + (wasMastered ? 1 : 0);
      }
    }

    const profileUpdate: StudentProfileUpdate = {
      studentId,
      preferredStyleIndicators: styleScores,
      sentimentTrend: 0,
      persistenceTrend: totalCorrect > 0 ? totalCorrect / (totalCorrect + totalIncorrect) : 0,
    };

    // ── 5. Call LLM for session highlights ───────────────────────────────
    const perfByTopic = topicsCovered.map((tid) => {
      const correct = answerGradedEvents.filter((e) => e.leafTopicId === tid && e.payload?.['correct']).length;
      const incorrect = answerGradedEvents.filter((e) => e.leafTopicId === tid && !e.payload?.['correct']).length;
      const mastered = masteredThisSession.includes(tid) ? 'MASTERED' : 'in-progress';
      return `${tid}: ${correct} correct, ${incorrect} incorrect (${mastered})`;
    });

    const sessionSummaryText = `Student: ${studentId} | Session: ${sessionId} | Topics: ${topicsCovered.length} | Correct: ${totalCorrect} | Incorrect: ${totalIncorrect}`;

    const renderedPrompt = await this.promptRepo.getPrompt('analysis/session-review', {
      SESSION_SUMMARY: sessionSummaryText,
      TOPICS_ATTEMPTED: topicsCovered.join(', ') || 'none',
      PERFORMANCE_BY_TOPIC: perfByTopic.join('\n') || 'no data',
    });

    const llmResponse = await this.llm.generate({
      systemPrompt: renderedPrompt,
      userPrompt: `Summarize the session for student ${studentId}.`,
      responseFormat: 'text',
    });

    // Parse bullet points from LLM response (split on newlines, filter non-empty)
    const highlights = llmResponse.text
      .split('\n')
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter((line) => line.length > 10)
      .slice(0, 4);

    // Ensure at least 2 highlights
    while (highlights.length < 2) {
      highlights.push(`Completed ${totalLessons} lesson(s) in this session.`);
    }

    const summary: SessionSummaryNote = {
      sessionId,
      studentId,
      courseId,
      topicsCovered,
      masteredThisSession,
      totalCorrect,
      totalIncorrect,
      totalLessons,
      highlights,
      analyzedAt: new Date().toISOString(),
    };

    return { policyUpdates, profileUpdate, summary };
  }

  private emptyResult(sessionId: string, studentId: string, courseId: string): SessionAnalysisResult {
    return {
      policyUpdates: [],
      profileUpdate: {
        studentId,
        preferredStyleIndicators: {},
        sentimentTrend: 0,
        persistenceTrend: 0,
      },
      summary: {
        sessionId,
        studentId,
        courseId,
        topicsCovered: [],
        masteredThisSession: [],
        totalCorrect: 0,
        totalIncorrect: 0,
        totalLessons: 0,
        highlights: ['No activity recorded in this session.', 'Start a lesson to begin learning.'],
        analyzedAt: new Date().toISOString(),
      },
    };
  }
}
