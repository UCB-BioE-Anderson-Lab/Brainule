/**
 * The load-bearing security property: the tutor never sees a question the
 * student has not already answered.
 *
 * This runs the real tutoring loop against MockLlmClient, which records every
 * request it receives, then inspects those requests for any trace of the
 * questions still waiting in the bank. If a future refactor ever hands the
 * question bank to the TutorAgent, this test fails.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  loadCoursePackage,
  StudentModelService,
  CorpusRetrievalAgent,
  TutorAgent,
  FilePromptRepository,
  AssessmentAgent,
  GradingAgent,
  AssessmentService,
  FailureAnalysisAgent,
  TutoringOrchestrator,
  toServedItem,
  AssessmentItem,
} from '@brainule/core';
import {
  FilesystemCourseRepository,
  InMemoryStudentStateRepository,
  InMemoryQuestionRepository,
} from '@brainule/storage';
import { TagRetriever, TagRetrieverRepository } from '@brainule/retrieval';
import { MockLlmClient } from '@brainule/llm';
import { config } from '@brainule/shared';

const TOPIC = 'python_primitive_types';

function correctAnswerFor(item: AssessmentItem): string {
  if (typeof item.answerKey === 'string') return item.answerKey;
  const key = item.answerKey as { value?: number } | null;
  if (key && typeof key.value === 'number') return String(key.value);
  throw new Error(`No deterministic answer for ${item.questionId}`);
}

function wrongAnswerFor(item: AssessmentItem): string {
  return correctAnswerFor(item) === 'ZZZ_NOT_AN_ANSWER' ? 'X' : 'ZZZ_NOT_AN_ANSWER';
}

async function buildStack() {
  const llm = new MockLlmClient();
  const courseRepo = new FilesystemCourseRepository(config.courseDir);
  const promptRepo = new FilePromptRepository(config.promptsDir);

  const studentService = new StudentModelService(new InMemoryStudentStateRepository());

  const retriever = new TagRetriever(async () => {
    const pkg = await courseRepo.getCoursePackage();
    return { manifest: pkg.corpusDocuments, corpusDir: config.courseDir };
  });
  const corpusAgent = new CorpusRetrievalAgent(new TagRetrieverRepository(retriever));

  const questionRepo = new InMemoryQuestionRepository(async () => {
    const pkg = await courseRepo.getCoursePackage();
    return pkg.assessmentItems;
  });

  const assessmentService = new AssessmentService(
    new AssessmentAgent(questionRepo),
    new GradingAgent(llm, promptRepo),
    studentService,
  );

  const orchestrator = new TutoringOrchestrator(
    courseRepo,
    corpusAgent,
    new TutorAgent(llm, promptRepo),
    new FailureAnalysisAgent(llm, promptRepo),
    assessmentService,
    studentService,
  );

  const pkg = await courseRepo.getCoursePackage();
  return { llm, orchestrator, pkg, courseId: pkg.metadata.courseId };
}

test('the tutor never receives a question the student has not answered', async () => {
  const { llm, orchestrator, pkg, courseId } = await buildStack();
  const studentId = 'isolation-test-student';
  const answered = new Set<string>();

  // 1. Lesson for the topic — before any question has been served at all.
  const lesson = await orchestrator.startTopicLesson(studentId, courseId, TOPIC);
  assert.ok(lesson.content.length > 0, 'lesson should have content');

  // 2. Serve a question and answer it wrong, which triggers failure analysis
  //    and remediation — the one path where the tutor legitimately sees an item.
  const q1 = await orchestrator.getNextQuestion(studentId, courseId, TOPIC);
  answered.add(q1.questionId);
  const wrong = await orchestrator.submitAnswer(
    studentId, courseId, TOPIC, q1.questionId, wrongAnswerFor(q1), 1000,
  );
  assert.equal(wrong.gradingResult.correct, false);
  assert.ok(wrong.remediation, 'a wrong answer should produce remediation');

  // 3. A different question, answered correctly.
  const q2 = await orchestrator.getNextQuestion(studentId, courseId, TOPIC);
  assert.notEqual(q2.questionId, q1.questionId, 'next question must differ from the failed one');
  answered.add(q2.questionId);
  const right = await orchestrator.submitAnswer(
    studentId, courseId, TOPIC, q2.questionId, correctAnswerFor(q2), 800,
  );
  assert.equal(right.gradingResult.correct, true);
  assert.equal(right.mastered, true);

  // 4. Ask an in-lesson question, which also reaches the tutor.
  await orchestrator.answerStudentTopicQuestion(
    studentId, courseId, TOPIC, 'Can you give me another example?', lesson.content,
  );

  // Everything the LLM was ever shown during that session:
  const seenByLlm = llm.calls.map((c) => `${c.systemPrompt}\n${c.userPrompt}`).join('\n\n');
  assert.ok(llm.calls.length >= 4, 'expected lesson, failure analysis, remediation, and QA calls');

  const topicItems = pkg.assessmentItems.filter((q) => q.leafTopicId === TOPIC);
  const unseen = topicItems.filter((q) => !answered.has(q.questionId));
  assert.ok(unseen.length >= 2, 'the bank should still hold unanswered questions');

  for (const item of unseen) {
    assert.ok(
      !seenByLlm.includes(item.prompt),
      `LLM context leaked the text of unanswered question ${item.questionId}`,
    );
    assert.ok(
      !seenByLlm.includes(item.questionId),
      `LLM context leaked the id of unanswered question ${item.questionId}`,
    );
  }

  // Sensitivity check: the failed question *is* expected in context (spec §2.2),
  // so a passing test above is not merely an empty-context artifact.
  assert.ok(
    seenByLlm.includes(q1.prompt),
    'the failed question should reach the tutor as evidence',
  );
});

test('questions served to a student carry no answer key or rubric', async () => {
  const { pkg } = await buildStack();
  const item = pkg.assessmentItems.find((q) => q.leafTopicId === TOPIC);
  assert.ok(item, 'fixture course should have questions for the topic');
  assert.notEqual(item.answerKey, undefined, 'the stored item has an answer key');

  const served = toServedItem(item) as Record<string, unknown>;
  assert.equal('answerKey' in served, false, 'served item must not carry answerKey');
  assert.equal('rubric' in served, false, 'served item must not carry rubric');
  assert.equal(served.questionId, item.questionId);
  assert.equal(served.prompt, item.prompt);
});
