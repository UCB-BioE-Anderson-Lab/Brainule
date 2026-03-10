/* Brainule 2.0 — Frontend app */

// ── Session state ─────────────────────────────────────────────

const session = (() => {
  let studentId = localStorage.getItem('brainule-studentId');
  if (!studentId) {
    studentId = crypto.randomUUID();
    localStorage.setItem('brainule-studentId', studentId);
  }
  return {
    studentId,
    courseId: null,
    currentTopicId: null,
    currentQuestion: null,
    questionAnswered: false,
    questionStartTime: null,
    lessonContent: '',
    masteryMap: new Map(), // leafTopicId → boolean
  };
})();

// ── Markdown helper ───────────────────────────────────────────

function renderMarkdown(text) {
  if (typeof marked !== 'undefined' && marked.parse) return marked.parse(text || '');
  return (text || '').replace(/\n/g, '<br>');
}

// ── API helper ────────────────────────────────────────────────

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${body || res.statusText}`);
  }
  return res.json();
}

// ── Init ──────────────────────────────────────────────────────

async function init() {
  try {
    const course = await apiFetch('/course');
    session.courseId = course.courseId;
    document.title = course.title;
    document.getElementById('app-title').textContent = course.title;

    const progress = await apiFetch(`/students/${session.studentId}/progress`);
    for (const ts of progress.topicStates) {
      session.masteryMap.set(ts.leafTopicId, ts.mastered);
    }

    renderTopicList(course.leafTopics);
    updateProgressHeader();
  } catch (err) {
    document.getElementById('topic-list').innerHTML =
      `<div class="state-error">Failed to load: ${err.message}</div>`;
  }
}

// ── Topic list ────────────────────────────────────────────────

function renderTopicList(leafTopics) {
  const list = document.getElementById('topic-list');
  const active = leafTopics.filter((lt) => lt.active !== false);
  list.innerHTML = active.map((lt) => {
    const mastered = session.masteryMap.get(lt.leafTopicId) === true;
    return `<button class="topic-btn${mastered ? ' mastered' : ''}" data-id="${lt.leafTopicId}" title="${lt.description || ''}">
      <span>${lt.title}</span>
      ${mastered ? '<span class="mastery-dot">✓</span>' : ''}
    </button>`;
  }).join('');

  list.querySelectorAll('.topic-btn').forEach((btn) => {
    btn.addEventListener('click', () => selectTopic(btn.dataset.id));
  });
}

function updateProgressHeader() {
  const total = session.masteryMap.size;
  const mastered = [...session.masteryMap.values()].filter(Boolean).length;
  document.getElementById('app-progress').textContent =
    total > 0 ? `${mastered} / ${total} mastered` : '';
}

function updateTopicMasteryUI(leafTopicId) {
  const btn = document.querySelector(`.topic-btn[data-id="${leafTopicId}"]`);
  if (!btn) return;
  btn.classList.add('mastered');
  if (!btn.querySelector('.mastery-dot')) {
    btn.insertAdjacentHTML('beforeend', '<span class="mastery-dot">✓</span>');
  }
}

// ── Topic selection & lesson loading ─────────────────────────

async function selectTopic(leafTopicId) {
  if (session.currentTopicId === leafTopicId) return;

  session.currentTopicId = leafTopicId;
  session.currentQuestion = null;
  session.questionAnswered = false;
  session.lessonContent = '';

  // Active state on topic list
  document.querySelectorAll('.topic-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.id === leafTopicId);
  });

  // Show lesson panel in loading state
  showLessonPanel();
  document.getElementById('lesson-topic-title').textContent = topicTitle(leafTopicId);
  document.getElementById('lesson-body').innerHTML = '<div class="state-empty">Generating lesson…</div>';
  document.getElementById('lesson-thread').innerHTML = '';

  // Reset quiz panel
  document.getElementById('quiz-content').classList.remove('visible');
  document.getElementById('quiz-placeholder').style.display = 'flex';
  document.getElementById('quiz-placeholder').textContent = 'Loading question…';

  try {
    const lesson = await apiFetch('/tutor/start', {
      method: 'POST',
      body: JSON.stringify({ studentId: session.studentId, leafTopicId }),
    });
    session.lessonContent = lesson.content || '';
    renderLessonBody(lesson.content);
    scrollLessonTop();

    // Auto-load first question
    await fetchAndShowQuestion();
  } catch (err) {
    document.getElementById('lesson-body').innerHTML =
      `<div class="state-error">Error loading lesson: ${err.message}</div>`;
    document.getElementById('quiz-placeholder').textContent = 'Click a topic to start';
  }
}

function topicTitle(leafTopicId) {
  const btn = document.querySelector(`.topic-btn[data-id="${leafTopicId}"]`);
  if (!btn) return leafTopicId;
  return btn.querySelector('span:first-child')?.textContent?.trim() || leafTopicId;
}

function showLessonPanel() {
  document.getElementById('lesson-placeholder').style.display = 'none';
  document.getElementById('lesson-content').classList.add('visible');
}

function renderLessonBody(content) {
  document.getElementById('lesson-body').innerHTML = renderMarkdown(content);
}

function scrollLessonTop() {
  document.getElementById('lesson-scroll').scrollTop = 0;
}

function scrollLessonBottom() {
  const el = document.getElementById('lesson-scroll');
  el.scrollTop = el.scrollHeight;
}

// ── Quiz ──────────────────────────────────────────────────────

async function fetchAndShowQuestion() {
  const quizPlaceholder = document.getElementById('quiz-placeholder');
  const quizContent = document.getElementById('quiz-content');
  const btnNext = document.getElementById('btn-next-question');

  quizPlaceholder.style.display = 'none';
  quizContent.classList.add('visible');
  document.getElementById('q-text').textContent = 'Loading question…';
  document.getElementById('q-choices').innerHTML = '';
  document.getElementById('q-difficulty').innerHTML = '';
  document.getElementById('q-explanation').classList.remove('visible');
  btnNext.disabled = true;

  session.questionAnswered = false;
  session.currentQuestion = null;

  try {
    const q = await apiFetch(
      `/tutor/question?studentId=${encodeURIComponent(session.studentId)}&leafTopicId=${encodeURIComponent(session.currentTopicId)}`,
    );
    session.currentQuestion = q;
    session.questionStartTime = Date.now();
    renderQuestion(q);
  } catch (err) {
    document.getElementById('q-text').textContent = `Error: ${err.message}`;
  }
}

function renderQuestion(q) {
  const diff = q.difficulty || 'medium';
  document.getElementById('q-difficulty').innerHTML =
    `<span class="badge-difficulty badge-${diff}">${diff}</span>`;

  document.getElementById('q-text').textContent = q.prompt;

  const choicesEl = document.getElementById('q-choices');
  choicesEl.innerHTML = '';

  if (q.questionType === 'multiple_choice' && q.choices) {
    Object.entries(q.choices).forEach(([key, value]) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.dataset.key = key;
      btn.innerHTML = `<span class="choice-key">${key}</span><span class="choice-text">${value}</span>`;
      btn.addEventListener('click', () => submitAnswer(key));
      choicesEl.appendChild(btn);
    });
  } else {
    // Free-text answer for non-MC
    const row = document.createElement('div');
    row.className = 'free-answer-row';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = 'Your answer…';
    inp.id = 'free-answer-input';
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAnswer(inp.value.trim()); });
    const btn = document.createElement('button');
    btn.className = 'ctrl-btn';
    btn.textContent = 'Submit';
    btn.addEventListener('click', () => submitAnswer(inp.value.trim()));
    row.appendChild(inp);
    row.appendChild(btn);
    choicesEl.appendChild(row);
  }

  document.getElementById('q-explanation').classList.remove('visible');
  document.getElementById('btn-next-question').disabled = true;

  const topicName = topicTitle(session.currentTopicId);
  document.getElementById('q-progress').textContent = topicName;
}

async function submitAnswer(answer) {
  if (session.questionAnswered || !session.currentQuestion) return;
  session.questionAnswered = true;

  const latencyMs = session.questionStartTime ? Date.now() - session.questionStartTime : 0;

  // Disable all choice buttons
  document.querySelectorAll('.choice-btn').forEach((btn) => { btn.disabled = true; });

  try {
    const result = await apiFetch('/tutor/answer', {
      method: 'POST',
      body: JSON.stringify({
        studentId: session.studentId,
        leafTopicId: session.currentTopicId,
        questionId: session.currentQuestion.questionId,
        answer,
        latencyMs,
      }),
    });

    showAnswerResult(result, answer);

    if (result.mastered) {
      session.masteryMap.set(session.currentTopicId, true);
      updateTopicMasteryUI(session.currentTopicId);
      updateProgressHeader();
    }

    if (!result.gradingResult.correct && result.remediation) {
      // Show remediation in lesson panel
      session.lessonContent = result.remediation.content || '';
      renderLessonBody(result.remediation.content);
      scrollLessonTop();
      appendThreadMessage('tutor', 'Remediation lesson loaded above. Review it, then click **Next Question →** when ready.');
    }

    document.getElementById('btn-next-question').disabled = false;
  } catch (err) {
    document.getElementById('q-explanation-text').textContent = `Error: ${err.message}`;
    document.getElementById('q-explanation').classList.add('visible');
    document.getElementById('btn-next-question').disabled = false;
  }
}

function showAnswerResult(result, chosenKey) {
  const correct = result.gradingResult.correct;
  const answerKey = String(result.updatedTopicState?.leafTopicId ? (session.currentQuestion?.answerKey ?? '') : (session.currentQuestion?.answerKey ?? ''));

  // Highlight choice buttons
  document.querySelectorAll('.choice-btn').forEach((btn) => {
    const key = btn.dataset.key;
    if (key === chosenKey && correct) btn.classList.add('correct');
    else if (key === chosenKey && !correct) btn.classList.add('incorrect');
    else if (!correct && key === String(session.currentQuestion?.answerKey)) btn.classList.add('correct');
  });

  const resultLabel = document.getElementById('q-result-label');
  resultLabel.textContent = correct ? '✓ Correct!' : '✗ Incorrect';
  resultLabel.className = correct ? 'correct' : 'incorrect';

  const answerLine = document.getElementById('q-answer-line');
  if (!correct && session.currentQuestion?.answerKey) {
    answerLine.textContent = `Correct answer: ${session.currentQuestion.answerKey}`;
  } else {
    answerLine.textContent = '';
  }

  const notesText = result.gradingResult?.gradingNotes || '';
  document.getElementById('q-explanation-text').textContent = notesText;
  document.getElementById('q-explanation').classList.add('visible');
}

// ── Conversation thread ───────────────────────────────────────

async function sendStudentQuestion() {
  const input = document.getElementById('lesson-input');
  const text = input.value.trim();
  if (!text || !session.currentTopicId) return;

  input.value = '';
  appendThreadMessage('student', text);

  try {
    const response = await apiFetch('/tutor/question', {
      method: 'POST',
      body: JSON.stringify({
        leafTopicId: session.currentTopicId,
        studentQuestion: text,
        lessonContent: session.lessonContent,
      }),
    });
    appendThreadMessage('tutor', response.content || '(no response)');
  } catch (err) {
    appendThreadMessage('tutor', `Error: ${err.message}`);
  }
}

function appendThreadMessage(role, text) {
  const thread = document.getElementById('lesson-thread');
  const div = document.createElement('div');
  div.className = `thread-msg thread-${role}`;
  div.innerHTML = `<span class="thread-role">${role === 'student' ? 'You' : 'Tutor'}</span>` +
    `<div class="thread-text">${renderMarkdown(text)}</div>`;
  thread.appendChild(div);
  scrollLessonBottom();
}

// ── Event wiring ──────────────────────────────────────────────

document.getElementById('btn-next-question').addEventListener('click', () => {
  if (session.currentTopicId) fetchAndShowQuestion();
});

document.getElementById('lesson-send').addEventListener('click', sendStudentQuestion);

document.getElementById('lesson-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendStudentQuestion();
});

// ── Start ─────────────────────────────────────────────────────

init();
