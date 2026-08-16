# M8 — Three-Panel Web UI

**Goal:** Implement the three-panel HTML/CSS/JS frontend served by Express. Students can
navigate topics, read generated lessons, ask questions in the lesson panel, and take quizzes
in the right panel. This milestone wires the existing Brainule v1 visual design to the new
Node.js backend.

**Depends on:** M7 (all server endpoints must exist)

---

## Implementation Tasks

### Static file serving (`apps/node-server`)
- [ ] `express.static('public')` serving `apps/node-server/public/`
- [ ] `GET /` serves `public/index.html`
- [ ] All frontend assets (CSS, JS) served from `public/`

### HTML Shell (`apps/node-server/public/index.html`)
- [ ] Three-panel layout matching Brainule v1 design:
  - **Left panel** (`#panel-topics`): topic list with mastery indicators
  - **Center panel** (`#panel-lesson`): generated lesson content + conversation thread
  - **Right panel** (`#panel-quiz`): quiz question + answer choices + next-question button
- [ ] Header with Brainule logo (reuse `brainule_glyph.png` from v1)
- [ ] Progress bar or mastery count in header
- [ ] Responsive enough to work at 1280px+ width (no mobile requirement yet)

### CSS (`apps/node-server/public/styles.css`)
- [ ] Port v1 `Styles.html` CSS (already polished) to standalone CSS file
- [ ] Left panel: topic list with `border-left` active state, mastery badges (✓ or colored dot)
- [ ] Center panel: lesson content rendered as markdown (use `marked.js` or similar)
- [ ] Right panel: quiz card with difficulty badge, choice buttons (A/B/C/D circles), submit button
- [ ] Explanation area (correct/incorrect feedback + explanation text) below quiz card
- [ ] Conversation thread (scrollable message list) below lesson content

### Frontend JavaScript (`apps/node-server/public/app.js`)
- [ ] `StudentSession` — stores `studentId` (UUID generated on first load, stored in `localStorage`), `courseId`
- [ ] On load: `GET /course` → populate left panel with topic list
- [ ] On load: `GET /students/:id/progress` → overlay mastery indicators on topics
- [ ] Topic click → `POST /tutor/start` → render lesson markdown in center panel; clear quiz panel
- [ ] "Next Question" button → `GET /tutor/next-question` → render question in right panel
- [ ] Answer choice click → `POST /tutor/answer` → show correct/incorrect feedback
  - If correct: show green highlight, explanation, mastery badge update on left panel
  - If incorrect: show red highlight, explanation, then render remediation in center panel
- [ ] Lesson conversation thread:
  - Text input + send button at bottom of center panel
  - `POST /tutor/question` → append tutor response to thread
- [ ] Markdown rendering: use CDN `marked.js` for lesson/remediation content
- [ ] Code blocks: apply `<pre><code>` styling (port v1 `<python>` tag logic if needed)

### Bootstrap / session init endpoint
- [ ] `GET /app-bootstrap?studentId=` returns `{ courseId, courseTitle, studentId }` for page init (echoes the caller's id, or mints one for a first-time visitor)
- [ ] `POST /students/:id` with `{ courseId }` creates or returns existing student session

### Quiz UI details
- [ ] Difficulty badge (easy/medium/hard pill) above question text
- [ ] For MC: choice buttons A–D with circle key badges
- [ ] "Next Question" button disabled until current question is answered OR first load
- [ ] After remediation loads in center panel, show "Ready for next question →" prompt

---

## Behavioral Acceptance Checklist

- [ ] Loading `http://localhost:3000` shows the three-panel layout with topic list populated from course data
- [ ] Clicking a topic loads a generated lesson in the center panel (markdown rendered, not raw text)
- [ ] Code blocks in lesson content are styled with monospace font and background highlight
- [ ] Clicking "Next Question" shows a quiz question in the right panel
- [ ] Clicking the correct answer (MC) highlights it green and shows explanation text
- [ ] Clicking the wrong answer highlights it red, shows explanation, and within 1–2 seconds displays remediation content in center panel
- [ ] After a correct answer, the topic in the left panel shows a mastery indicator (e.g., checkmark or colored dot)
- [ ] Typing a question in the lesson thread and pressing Send appends the tutor response below the lesson content
- [ ] The conversation thread scrolls to the latest message automatically
- [ ] Refreshing the page restores the same `studentId` from `localStorage` (progress is preserved)
- [ ] A new student (cleared localStorage) starts with all topics unmastered
- [ ] The right panel shows "Click a topic to start" placeholder until a topic is selected
- [ ] No console errors on initial page load
- [ ] The app works in Chrome, Safari, and Firefox without polyfills
