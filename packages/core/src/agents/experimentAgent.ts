import * as crypto from 'crypto';
import { TeachingParameters } from '../types/lesson';
import {
  LessonPolicyAssignment,
  PolicyPerformance,
  ExperimentConfig,
  TeachingParameterSpace,
} from '../types/experiment';
import { StudentTopicState } from '../types/student';

// ── PolicyRepository interface ──────────────────────────────────────────────

export interface PolicyRepository {
  getPolicyPerformance(policyId: string, leafTopicId: string): Promise<PolicyPerformance | null>;
  savePolicyPerformance(perf: PolicyPerformance): Promise<void>;
  getAllPerformances(leafTopicId: string): Promise<PolicyPerformance[]>;
}

// ── Input / Outcome types ───────────────────────────────────────────────────

export interface PolicyAssignmentInput {
  studentId: string;
  leafTopicId: string;
  studentTopicState: StudentTopicState;
}

export interface PolicyOutcome {
  correct: boolean;
  attemptsToMastery: number;
  sentimentDelta?: number;
}

// ── Default parameter space ─────────────────────────────────────────────────

export const DefaultTeachingParameterSpace: TeachingParameterSpace = {
  lessonStyle: [
    'definition_first',
    'example_first',
    'analogy_first',
    'misconception_first',
    'procedural_first',
  ],
  explanationDepth: ['short', 'medium', 'deep'],
  tone: ['neutral', 'encouraging', 'direct'],
  exampleCount: [1, 2, 3],
  socraticRatio: [0.0, 0.3, 0.7],
  visualizationRatio: [0.0, 0.5, 1.0],
  prerequisiteRefresh: ['none', 'light', 'moderate'],
};

// ── Utility: deterministic policy ID ───────────────────────────────────────

export function getPolicyId(params: TeachingParameters): string {
  const sorted = JSON.stringify(
    Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b))),
  );
  return crypto.createHash('sha256').update(sorted).digest('hex').slice(0, 16);
}

// ── ExperimentAgent ─────────────────────────────────────────────────────────

export class ExperimentAgent {
  /** In-memory map: policyAssignmentId → { policyId, leafTopicId, parameters } */
  private readonly assignments = new Map<
    string,
    { policyId: string; leafTopicId: string; parameters: TeachingParameters }
  >();

  constructor(
    private readonly policyRepo: PolicyRepository,
    private readonly config: ExperimentConfig,
  ) {}

  async assignPolicy(input: PolicyAssignmentInput): Promise<LessonPolicyAssignment> {
    const { studentId, leafTopicId } = input;
    const { explorationRate, parameterSpace } = this.config;

    const shouldExplore = Math.random() < explorationRate;
    let params: TeachingParameters;

    if (!shouldExplore) {
      const allPerfs = await this.policyRepo.getAllPerformances(leafTopicId);
      if (allPerfs.length > 0) {
        // Exploit: pick policy with highest success rate
        const best = allPerfs.reduce((a, b) => {
          const rateA = a.impressions > 0 ? a.successCount / a.impressions : 0;
          const rateB = b.impressions > 0 ? b.successCount / b.impressions : 0;
          return rateA >= rateB ? a : b;
        });
        params = best.parameters;
      } else {
        // No history: fall back to explore
        params = this.randomSample(parameterSpace);
      }
    } else {
      params = this.randomSample(parameterSpace);
    }

    const policyId = getPolicyId(params);
    const policyAssignmentId = crypto.randomUUID();

    this.assignments.set(policyAssignmentId, { policyId, leafTopicId, parameters: params });

    return {
      policyAssignmentId,
      leafTopicId,
      studentId,
      lessonStyle: params.lessonStyle,
      explanationDepth: params.explanationDepth,
      tone: params.tone,
      exampleCount: params.exampleCount,
      socraticRatio: params.socraticRatio,
      visualizationRatio: params.visualizationRatio,
      prerequisiteRefresh: params.prerequisiteRefresh,
      assignedAt: new Date().toISOString(),
    };
  }

  async recordOutcome(
    policyAssignmentId: string,
    leafTopicId: string,
    outcome: PolicyOutcome,
  ): Promise<void> {
    const assignment = this.assignments.get(policyAssignmentId);
    if (!assignment) return;

    const { policyId, parameters } = assignment;
    const existing = await this.policyRepo.getPolicyPerformance(policyId, leafTopicId);
    const now = new Date().toISOString();

    if (!existing) {
      await this.policyRepo.savePolicyPerformance({
        policyId,
        leafTopicId,
        parameters,
        impressions: 1,
        successCount: outcome.correct ? 1 : 0,
        failureCount: outcome.correct ? 0 : 1,
        averageAttemptsToMastery: outcome.correct ? outcome.attemptsToMastery : 0,
        averageSentimentDelta: outcome.sentimentDelta ?? 0,
        updatedAt: now,
      });
      return;
    }

    const newImpressions = existing.impressions + 1;
    const newSuccessCount = existing.successCount + (outcome.correct ? 1 : 0);
    const newFailureCount = existing.failureCount + (outcome.correct ? 0 : 1);

    // Rolling average for attemptsToMastery (only updated on correct answers)
    let newAvgAttempts = existing.averageAttemptsToMastery;
    if (outcome.correct && newSuccessCount > 0) {
      newAvgAttempts =
        (existing.averageAttemptsToMastery * existing.successCount + outcome.attemptsToMastery) /
        newSuccessCount;
    }

    // Rolling average for sentimentDelta
    const sentDelta = outcome.sentimentDelta ?? 0;
    const newAvgSentiment =
      (existing.averageSentimentDelta * existing.impressions + sentDelta) / newImpressions;

    await this.policyRepo.savePolicyPerformance({
      policyId,
      leafTopicId,
      parameters,
      impressions: newImpressions,
      successCount: newSuccessCount,
      failureCount: newFailureCount,
      averageAttemptsToMastery: newAvgAttempts,
      averageSentimentDelta: newAvgSentiment,
      updatedAt: now,
    });
  }

  private randomSample(space: TeachingParameterSpace): TeachingParameters {
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    return {
      lessonStyle: pick(space.lessonStyle),
      explanationDepth: pick(space.explanationDepth),
      tone: pick(space.tone),
      exampleCount: pick(space.exampleCount),
      socraticRatio: pick(space.socraticRatio),
      visualizationRatio: pick(space.visualizationRatio),
      prerequisiteRefresh: pick(space.prerequisiteRefresh),
      stepGranularity: 'medium', // not part of experiment space
    };
  }
}
