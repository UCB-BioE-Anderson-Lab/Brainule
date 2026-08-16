import { AssessmentItem, CoursePackage, LeafTopic, Misconception, LearningObjective } from '../types/course';
import { GeneratedLesson, TutorResponse, DefaultTeachingParameters, TeachingParameters } from '../types/lesson';
import { AnswerResult } from '../types/remediation';
import { StudentTopicState } from '../types/student';
import { TutorAgent } from '../agents/tutorAgent';
import { FailureAnalysisAgent } from '../agents/failureAnalysisAgent';
import { CorpusRetrievalAgent } from '../agents/corpusRetrievalAgent';
import { AssessmentService } from '../services/assessmentService';
import { StudentModelService } from '../services/studentModelService';
import { getOrCreateTopicState } from '../services/studentModel';

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

    const effectiveParams: TeachingParameters = {
      ...DefaultTeachingParameters,
      ...parameters,
    };

    return this.tutorAgent.generateLesson({
      leafTopic,
      contentPack,
      parameters: effectiveParams,
      studentTopicState: topicState,
      learningObjectives,
    });
  }

  async getNextQuestion(
    studentId: string,
    courseId: string,
    leafTopicId: string,
  ): Promise<AssessmentItem> {
    return this.assessmentService.getNextQuestion(studentId, courseId, leafTopicId);
  }

  async submitAnswer(
    studentId: string,
    courseId: string,
    leafTopicId: string,
    questionId: string,
    answer: string,
    latencyMs: number,
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

    if (gradingResult.correct) {
      return { gradingResult, mastered, updatedTopicState };
    }

    // Failure path: analyze and generate remediation
    const [leafTopic, misconceptions] = await Promise.all([
      this.getLeafTopic(leafTopicId),
      this.getMisconceptions(leafTopicId),
    ]);

    // Retrieve with the real leaf topic so allowedKnowledgeTags and
    // prerequisites are honoured — remediation must stay inside approved content.
    const contentPack = await this.corpusRetrievalAgent.retrieve(
      leafTopic,
      leafTopic.prerequisiteLeafTopicIds,
    );

    // Get the question to pass to failure analysis
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

    const remediation = await this.tutorAgent.generateRemediation({
      leafTopic,
      contentPack,
      failureAnalysis,
      failedQuestion: question,
      studentAnswer: answer,
      gradingResult,
      topicMisconceptions: misconceptions,
      studentTopicState: updatedTopicState,
      parameters: DefaultTeachingParameters,
    });

    return { gradingResult, mastered: false, remediation, updatedTopicState };
  }

  async answerStudentTopicQuestion(
    studentId: string,
    courseId: string,
    leafTopicId: string,
    message: string,
    lessonContent = '',
  ): Promise<TutorResponse> {
    const [leafTopic, state] = await Promise.all([
      this.getLeafTopic(leafTopicId),
      this.studentModelService.getStudentState(studentId, courseId),
    ]);
    return this.tutorAgent.answerStudentQuestion({
      leafTopic,
      lessonContent,
      studentQuestion: message,
      studentTopicState: getOrCreateTopicState(state, leafTopicId),
    });
  }
}
