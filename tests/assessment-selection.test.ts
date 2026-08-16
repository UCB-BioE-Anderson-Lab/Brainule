/**
 * Question selection rules (spec §33, plan M6): random from the topic bank,
 * avoid recent repeats, and never re-serve the item the student just saw —
 * including after the pool has been exhausted and reset.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AssessmentItem, StudentTopicState, NoQuestionsAvailableError } from '@brainule/core';
import { InMemoryQuestionRepository } from '@brainule/storage';

function item(id: string, leafTopicId = 'topic_a', questionType: AssessmentItem['questionType'] = 'multiple_choice'): AssessmentItem {
  return {
    questionId: id,
    leafTopicId,
    questionType,
    difficulty: 'easy',
    prompt: `Question ${id}`,
    choices: { A: 'a', B: 'b' },
    answerKey: 'A',
    tags: [],
    active: true,
  };
}

function topicState(leafTopicId: string, recentQuestionIds: string[]): StudentTopicState {
  return {
    studentId: 'test-student',
    leafTopicId,
    mastered: false,
    masteryScore: 0,
    attemptCount: recentQuestionIds.length,
    correctCount: 0,
    incorrectCount: recentQuestionIds.length,
    recentQuestionIds,
    recentMisconceptionIds: [],
    frustrationScore: 0,
    averageResponseLatencyMs: 0,
  };
}

const repoOf = (items: AssessmentItem[]) => new InMemoryQuestionRepository(async () => items);

test('never re-serves the question the student just answered, even once the pool resets', async () => {
  // Three questions and a five-deep exclusion window: the pool is exhausted
  // after three answers, which is exactly when the old code could repeat.
  const repo = repoOf([item('q1'), item('q2'), item('q3')]);
  const recent: string[] = [];

  for (let i = 0; i < 300; i++) {
    const selected = await repo.getRandomQuestion({
      leafTopicId: 'topic_a',
      studentTopicState: topicState('topic_a', recent),
    });
    const previous = recent[recent.length - 1];
    assert.notEqual(
      selected.questionId,
      previous,
      `iteration ${i}: re-served ${selected.questionId} immediately after it was answered`,
    );
    recent.push(selected.questionId);
  }

  // And it is still drawing from the whole bank, not just alternating two items.
  assert.equal(new Set(recent).size, 3, 'all three questions should get served over 300 draws');
});

test('a single-question bank still serves that question rather than failing', async () => {
  const repo = repoOf([item('only')]);
  const selected = await repo.getRandomQuestion({
    leafTopicId: 'topic_a',
    studentTopicState: topicState('topic_a', ['only', 'only']),
  });
  assert.equal(selected.questionId, 'only');
});

test('avoids recent questions while the pool has unseen items left', async () => {
  const repo = repoOf([item('q1'), item('q2'), item('q3'), item('q4'), item('q5'), item('q6')]);
  const selected = await repo.getRandomQuestion({
    leafTopicId: 'topic_a',
    studentTopicState: topicState('topic_a', ['q1', 'q2', 'q3']),
  });
  assert.ok(['q4', 'q5', 'q6'].includes(selected.questionId), `unexpected repeat: ${selected.questionId}`);
});

test('honours question-type constraints', async () => {
  const repo = repoOf([item('q1'), item('q2', 'topic_a', 'numeric')]);
  const selected = await repo.getRandomQuestion({
    leafTopicId: 'topic_a',
    studentTopicState: topicState('topic_a', []),
    allowedTypes: ['numeric'],
  });
  assert.equal(selected.questionId, 'q2');
});

test('an empty topic bank raises NoQuestionsAvailableError rather than crashing', async () => {
  const repo = repoOf([item('q1')]);
  await assert.rejects(
    () => repo.getRandomQuestion({
      leafTopicId: 'topic_with_no_questions',
      studentTopicState: topicState('topic_with_no_questions', []),
    }),
    NoQuestionsAvailableError,
  );
});
