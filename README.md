# Brainule

A Google Apps Script web app for interactive multiple-choice study review. Students select a topic, read its scope, answer questions with immediate feedback, and can copy an LLM prompt for deeper explanation.

Access requires a Google account. No custom login UI — access control is handled entirely by Apps Script deployment settings.

---

## Table of contents

- [Architecture overview](#architecture-overview)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development workflow](#development-workflow)
- [Adding questions](#adding-questions)
- [Data collection (future)](#data-collection-future)
- [Question schema reference](#question-schema-reference)

---

## Architecture overview

Brainule runs entirely on Google Apps Script. There is no separate server, database, or build step.

```
Browser  ←→  Google Apps Script (doGet)  ←→  Content (hardcoded in Code.gs for now)
```

- `doGet()` assembles the HTML page server-side and injects all topic and question data as a bootstrap JSON object (`window.BRAINULE_BOOTSTRAP`).
- The front end is plain HTML, CSS, and JavaScript — no framework, no module bundler.
- Content (topics and questions) lives in `Code.gs` until a Sheets-based authoring flow is added.

---

## Repository layout

```
Brainule/
├── .clasp.json               — clasp config: links this repo to the Apps Script project
├── README.md
└── src/                      — everything pushed to Apps Script (clasp rootDir)
    ├── appsscript.json       — Apps Script manifest (timezone, runtime, webapp settings)
    ├── Code.gs               — server-side: doGet(), include(), topic list, question bank
    ├── Index.html            — root HTML template; injects bootstrap data and includes all JS
    ├── Styles.html           — all CSS (included into Index.html at render time)
    ├── App.html              — reference comment listing JS include order (not part of include chain)
    └── js/
        ├── bootstrap.js.html         — validates window.BRAINULE_BOOTSTRAP on load
        ├── content_service.js.html   — normalizes bootstrap data into runtime structures
        ├── question_factory.js.html  — routes question_format to the correct subclass
        ├── event_logger.js.html      — no-op event logger (stub for future analytics)
        ├── renderers.js.html         — pure DOM rendering functions (no state)
        ├── controller.js.html        — all app state, navigation, and event wiring
        └── questions/
            ├── question_base.js.html     — QuestionBase class (abstract interface)
            └── multiple_choice.js.html   — MultipleChoiceQuestion subclass
```

### Why `.js.html` extensions?

Apps Script's `HtmlService` only serves HTML files. JavaScript is wrapped in `<script>` tags inside `.html` files. The `.js.html` double extension is a clasp convention: clasp strips the trailing `.html` when pushing, so `bootstrap.js.html` is stored in Apps Script as `js/bootstrap.js` and included as `include('js/bootstrap.js')`.

---

## Prerequisites

- Node.js (any recent version)
- A Google account with access to Google Apps Script
- `clasp` installed globally:

```bash
sudo npm install -g @google/clasp
```

- clasp authenticated (run once, opens a browser):

```bash
clasp login
```

---

## Installation

### Clone and link to an existing Apps Script project

```bash
git clone <repo-url>
cd Brainule
```

The `.clasp.json` already contains the `scriptId` for the existing project. If you want to create a fresh Apps Script project instead:

```bash
# Remove the existing .clasp.json first
rm .clasp.json
clasp create --title "Brainule" --type standalone --rootDir src
```

### Push code to Apps Script

```bash
clasp push --force
```

### Deploy as a web app (do this in the browser, not via clasp)

1. Open the Apps Script editor:
   `https://script.google.com/d/<your-scriptId>/edit`
2. **Deploy → New deployment**
3. Click the gear icon → **Web app**
4. Set **Execute as**: Me
5. Set **Who has access**: Anyone with a Google account
6. Click **Deploy** — copy the web app URL

> **Important:** Always deploy and update deployments from the Apps Script UI, not via `clasp deploy`. Using `clasp deploy` resets the `Execute as` and access settings, which breaks the app.

---

## Development workflow

Make changes locally, push to Apps Script, then update the deployment:

```bash
# 1. Edit files in src/
# 2. Push to Apps Script
clasp push --force

# 3. Update the deployment in the browser:
#    Apps Script editor → Deploy → Manage deployments
#    → pencil icon on your deployment → "New version" → Deploy
```

The web app URL stays the same across version updates; only the version number increments.

### Opening the Apps Script editor

```bash
clasp open
```

### Viewing server-side logs

Apps Script logs appear in the editor under **Executions** (left sidebar). Server-side errors from `doGet()` will appear there if the web app returns a Drive error page instead of loading.

---

## Adding questions

Questions live in `Code.gs` in the `getQuestionBank_()` function. Topics live in `getTopicsFlat_()`.

### Adding a topic

Add an entry to the array returned by `getTopicsFlat_()`:

```javascript
{
  "topic_slug": "your_topic_slug",
  "title": "Display title for the sidebar",
  "scope": "Paragraph describing what this topic covers.",
  "path": ["category", "subcategory", "subtopics"]
}
```

`topic_slug` must be unique and stable — it is the key used to look up questions.

### Adding questions to a topic

In `getQuestionBank_()`, add or extend the array for your topic slug:

```javascript
"your_topic_slug": [
  {
    "slug": "unique-question-slug",
    "question_format": "multiple_choice",
    "difficulty": "easy",            // "easy" | "medium" | "hard"
    "topic": "Short descriptor shown under the question",
    "question": "Question text. Use <python>code</python> for inline code or multiline blocks, and <pre>sequence</pre> for sequence literals.",
    "choices": {
      "A": "First choice text",
      "B": "Second choice text",
      "C": "Third choice text",
      "D": "Fourth choice text"
    },
    "answer": "B",
    "explanation": "Explanation shown after the student answers."
  }
]
```

### Text formatting in questions and explanations

| Markup | Renders as |
|---|---|
| `<python>x = 1</python>` | Inline code block |
| `<python>\nx = 1\ny = 2\n</python>` | Multiline code block |
| `<pre>ATGCATGC</pre>` | Inline monospace (for sequences, literals) |

### Planned: loading questions from Google Sheets

The runtime UI reads only from `window.BRAINULE_BOOTSTRAP`, which is assembled in `doGet()`. The front end is agnostic to the data source. To switch to Sheets-based content, replace the bodies of `getTopicsFlat_()` and `getQuestionBank_()` in `Code.gs` with Sheets API calls — no front-end changes required.

---

## Data collection (future)

### Event logger seam

Every user interaction (question presented, answer submitted, Gemini prompt copied) is sent to `EventLogger` in `js/event_logger.js.html`. In v1 this is a no-op: events are received but nothing is stored.

The interface is:

```javascript
EventLogger.logQuestionPresented({ topicSlug, questionSlug, questionFormat, presentedAt })
EventLogger.logAnswerSubmitted({ topicSlug, questionSlug, questionFormat, submittedAnswer, canonicalAnswer, isCorrect, scoreValue, submittedAt })
EventLogger.logGeminiPromptCopied({ topicSlug, questionSlug, questionFormat, copiedAt })
```

### Planned: writing to Google Sheets

To activate logging, replace `NoOpEventLogger` in `event_logger.js.html` with a class that calls `google.script.run` to invoke a server-side function, which then writes rows to a Google Sheet. The planned structure is:

- One spreadsheet
- One sheet tab per topic (keyed by `topic_slug`)
- One row per event
- Columns: timestamp, user identity (if available), question slug, submitted answer, canonical answer, is_correct, score_value

No front-end code changes are needed — only `event_logger.js.html` and a new server-side handler in `Code.gs`.

---

## Question schema reference

### Base fields (all question types)

| Field | Type | Required | Notes |
|---|---|---|---|
| `slug` | string | yes | Stable identifier within the topic |
| `question_format` | string | yes | Discriminator for the question factory; currently only `"multiple_choice"` |
| `difficulty` | string | yes | `"easy"`, `"medium"`, or `"hard"` |
| `topic` | string | yes | Short descriptor shown in the UI beneath the difficulty label |
| `question` | string | yes | Full question text; supports `<python>` and `<pre>` markup |
| `explanation` | string | yes | Shown after the student submits an answer |

### Multiple choice additional fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `choices` | object | yes | Map of answer key → answer text; any number of keys |
| `answer` | string | yes | The key of the correct choice |

### Future-safe optional fields (tolerated, not displayed in v1)

`tags`, `source_refs`, `author_notes`, `version`, `learning_objective`, `lesson_prompt`
