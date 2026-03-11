import { AssessmentItem, CoursePackage, LeafTopic, Misconception, LearningObjective } from '../types/course';
import { GeneratedLesson, TutorResponse, DefaultTeachingParameters, TeachingParameters } from '../types/lesson';
import { AnswerResult } from '../types/remediation';
import { StudentTopicState } from '../types/student';
import { TutorAgent } from '../agents/tutorAgent';
import { FailureAnalysisAgent } from '../agents/failureAnalysisAgent';
import { CorpusRetrievalAgent } from '../agents/corpusRetrievalAgent';
import { ExperimentAgent } from '../agents/experimentAgent';
import { AssessmentService } from '../services/assessmentService';
import { StudentModelService } from '../services/studentModelService';
import { getOrCreateTopicState } from '../services/studentModel';
import { EventLogger } from '../services/eventLogger';

export interface CourseDataSource {
  getCoursePackage(): Promise<CoursePackage>;
}

export class TutoringOrchestrator {
  constructor(
    private readonly courseDataSource: CourseDataSource,
    private readonly corpusRetrievalAgent: CorpusRetrievalAgent,
    private readonly tutorAgent: TutorAgent,
    private readonly failureAnalysisAgent: FailureAnalysisAgent,
    private readonly assessmentService: AssessmentService,
    private readonly studentModelService: StudentModelService,
    private readonly experimentAgent?: ExperimentAgent,
  ) {}

  private async getLeafTopic(leafTopicId: string): Promise<LeafTopic> {
    const pkg = await this.courseDataSource.getCoursePackage();
    const topic = pkg.leafTopics.find((t) => t.leafTopicId === leafTopicId);
    if (!topic) throw new Error(`LeafTopic not found: ${leafTopicId}`);
    return topic;
  }

  private async getMisconceptions(leafTopicId: string): Promise<Misconception[]> {
    const pkg = await this.courseDataSource.getCoursePackage();
    return pkg.misconceptions.filter((m) => m.leafTopicId === leafTopicId);
  }

  private async getLearningObjectives(leafTopicId: string): Promise<LearningObjective[]> {
    const pkg = await this.courseDataSource.getCoursePackage();
    return pkg.learningObjectives.filter((o) => o.leafTopicId === leafTopicId);
  }

  async startTopicLesson(
    studentId: string,
    courseId: string,
    leafTopicId: string,
    parameters?: Partial<TeachingParameters>,
    logger?: EventLogger,
  ): Promise<GeneratedLesson> {
    const [leafTopic, learningObjectives, state] = await Promise.all([
      this.getLeafTopic(leafTopicId),
      this.getLearningObjectives(leafTopicId),
      this.studentModelService.getStudentState(studentId, courseId),
    ]);

    const topicState = getOrCreateTopicState(state, leafTopicId);
    const contentPack = await this.corpusRetrievalAgent.retrieve(
      leafTopic,
      leafTopic.prerequisiteLeafTopicIds,
    );

    // Use ExperimentAgent to select teaching parameters (epsilon-greedy).
    // If no experimentAgent or caller supplied explicit parameters, fall back to defaults.
    let effectiveParams: TeachingParameters;
    let policyAssignmentId: string | undefined;

    if (this.experimentAgent && !parameters) {
      const assignment = await this.experimentAgent.assignPolicy({
        studentId,
        leafTopicId,
        studentTopicState: topicState,
      });
      policyAssignmentId = assignment.policyAssignmentId;
      effectiveParams = {
        lessonStyle: assignment.lessonStyle,
        explanationDepth: assignment.explanationDepth,
        tone: assignment.tone,
        exampleCount: assignment.exampleCount,
        socraticRatio: assignment.socraticRatio,
        visualizationRatio: assignment.visualizationRatio,
        prerequisiteRefresh: assignment.prerequisiteRefresh,
        stepGranularity: 'medium',
      };
      logger?.log('policy_assigned', studentId, leafTopicId, {
        policyAssignmentId,
        parameters: effectiveParams,
      });
    } else {
      effectiveParams = { ...DefaultTeachingParameters, ...parameters };
    }

    const lesson = await this.tutorAgent.generateLesson({
      leafTopic,
      contentPack,
      parameters: effectiveParams,
      studentTopicState: topicState,
      learningObjectives,
    });

    // Attach policyAssignmentId to the lesson so the client can round-trip it
    if (policyAssignmentId) {
      lesson.policyAssignmentId = policyAssignmentId;
    }

    logger?.log('lesson_generated', studentId, leafTopicId, {
      parameters: effectiveParams,
      policyAssignmentId,
    }, {
      promptName: lesson.promptName,
      promptHash: lesson.promptHash,
      llmProvider: lesson.llmProvider,
      llmModel: lesson.llmModel,
      policyAssignmentId,
    });

    return lesson;
  }

  async getNextQuestion(
    studentId: string,
    courseId: string,
    leafTopicId: string,
    logger?: EventLogger,
  ): Promise<AssessmentItem> {
    const question = await this.assessmentService.getNextQuestion(studentId, courseId, leafTopicId);

    logger?.log('question_served', studentId, leafTopicId, {
      questionId: question.questionId,
      questionType: question.questionType,
      difficulty: question.difficulty,
    });

    return question;
  }

  async submitAnswer(
    studentId: string,
    courseId: string,
    leafTopicId: string,
    questionId: string,
    answer: string,
    latencyMs: number,
    logger?: EventLogger,
    policyAssignmentId?: string,
  ): Promise<AnswerResult> {
    const { gradingResult, updatedState } = await this.assessmentService.submitAnswer(
      studentId,
      courseId,
      leafTopicId,
      questionId,
      answer,
      latencyMs,
    );

    const updatedTopicState: StudentTopicState = getOrCreateTopicState(updatedState, leafTopicId);
    const mastered = updatedTopicState.mastered;

    // Log answer submission + grading
    logger?.log('answer_submitted', studentId, leafTopicId, { questionId, answer, latencyMs });
    logger?.log('answer_graded', studentId, leafTopicId, {
      questionId,
      correct: gradingResult.correct,
      score: gradingResult.score,
      graderConfidence: gradingResult.graderConfidence,
    });

    if (gradingResult.correct) {
      if (mastered) {
        logger?.log('topic_mastered', studentId, leafTopicId, {
          correctCount: updatedTopicState.correctCount,
          attemptCount: updatedTopicState.attemptCount,
        });
        // Record outcome for policy learning
        if (this.experimentAgent && policyAssignmentId) {
          this.experimentAgent.recordOutcome(policyAssignmentId, leafTopicId, {
            correct: true,
            attemptsToMastery: updatedTopicState.attemptCount,
          });
        }
      }
      return { gradingResult, mastered, updatedTopicState };
    }

    // Failure path: analyze and generate remediation
    const [leafTopic, misconceptions, contentPack] = await Promise.all([
      this.getLeafTopic(leafTopicId),
      this.getMisconceptions(leafTopicId),
      this.corpusRetrievalAgent.retrieve({ leafTopicId } as LeafTopic, []),
    ]);

    const pkg = await this.courseDataSource.getCoursePackage();
    const question = pkg.assessmentItems.find((q) => q.questionId === questionId);
    if (!question) {
      return { gradingResult, mastered: false, updatedTopicState };
    }

    const failureAnalysis = await this.failureAnalysisAgent.analyze({
      studentId,
      question,
      studentAnswer: answer,
      gradingResult,
      leafTopic,
      topicMisconceptions: misconceptions,
    });

    logger?.log('failure_analyzed', studentId, leafTopicId, {
      failureType: failureAnalysis.failureType,
      likelyMisconceptionIds: failureAnalysis.likelyMisconceptionIds,
      summary: failureAnalysis.summary,
    });

    const remediation = await this.tutorAgent.generateRemediation({
      leafTopic,
      contentPack,
      failureAnalysis,
      studentTopicState: updatedTopicState,
      parameters: DefaultTeachingParameters,
    });

    logger?.log('remediation_generated', studentId, leafTopicId,
      { failureType: failureAnalysis.failureType },
      {
        promptName: remediation.promptName,
        promptHash: remediation.promptHash,
        llmProvider: remediation.llmProvider,
        llmModel: remediation.llmModel,
      },
    );

    // Record failure outcome for policy learning
    if (this.experimentAgent && policyAssignmentId) {
      this.experimentAgent.recordOutcome(policyAssignmentId, leafTopicId, {
        correct: false,
        attemptsToMastery: updatedTopicState.attemptCount,
      });
    }

    return { gradingResult, mastered: false, remediation, updatedTopicState };
  }

  async answerStudentQuestion(
    studentId: string,
    leafTopicId: string,
    studentQuestion: string,
    lessonContent: string,
    logger?: EventLogger,
  ): Promise<TutorResponse> {
    const leafTopic = await this.getLeafTopic(leafTopicId);

    logger?.log('student_question', studentId, leafTopicId, { question: studentQuestion });

    const response = await this.tutorAgent.answerStudentQuestion({
      leafTopic,
      lessonContent,
      studentQuestion,
      studentTopicState: undefined as unknown as StudentTopicState,
    });

    logger?.log('tutor_response', studentId, leafTopicId, { responseId: response.responseId });

    return response;
  }
}
