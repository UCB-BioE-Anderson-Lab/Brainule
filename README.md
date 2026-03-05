# Brainule

A Google Apps Script web app for interactive multiple-choice study review. Students select a topic, read its scope, answer questions with immediate feedback, and can copy an LLM prompt for deeper explanation.

Access requires a Google account. No custom login UI — access control is handled entirely by Apps Script deployment settings.

---

## Table of contents

- [Architecture overview](#architecture-overview)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Installation and first-time setup](#installation-and-first-time-setup)
- [Development workflow](#development-workflow)
- [Course sheet format](#course-sheet-format)
- [Creating a new course](#creating-a-new-course)
- [Data collection (future)](#data-collection-future)
- [Question schema reference](#question-schema-reference)

---

## Architecture overview

Brainule separates the **app** (this repository, deployed as an Apps Script web app) from the **content** (Google Sheets stored in a Drive folder). The app never needs to be modified to add or change course content.

```
Browser
  ↕
Google Apps Script  (doGet: reads ?course= parameter)
  ↕
Google Drive folder  ("Brainule Courses")
  ↕
Course spreadsheet   (one per course, named by slug)
  ↕
  ├── Overview tab   → topic list + course metadata
  └── <topic_slug> tabs  → questions for each topic
```

**Request flow:**
1. Student visits `<web-app-url>?course=bioe_234_midterm`
2. `doGet()` looks for a spreadsheet named `bioe_234_midterm` in the Brainule Courses folder
3. Reads the Overview tab (topics) and all topic tabs (questions)
4. Injects everything as `window.BRAINULE_BOOTSTRAP` and serves the page
5. Front-end JS renders the three-panel study UI

The front end is plain HTML, CSS, and JavaScript — no framework, no module bundler. It is entirely agnostic to where the content came from.

---

## Repository layout

```
Brainule/
├── .clasp.json               — clasp config: links this repo to the Apps Script project
├── README.md
└── src/                      — everything pushed to Apps Script (clasp rootDir)
    ├── appsscript.json       — Apps Script manifest (timezone, runtime)
    ├── Code.gs               — server-side: doGet(), sheet readers, setup functions
    ├── Index.html            — root HTML template; injects bootstrap data and includes all JS
    ├── Styles.html           — all CSS
    ├── App.html              — reference only: lists JS include order (not in include chain)
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

## Installation and first-time setup

### 1. Clone and push to Apps Script

```bash
git clone <repo-url>
cd Brainule
clasp push --force
```

The `.clasp.json` is already linked to the existing Apps Script project. To start a completely fresh project instead:

```bash
rm .clasp.json
clasp create --title "Brainule" --type standalone --rootDir src
clasp push --force
```

### 2. Deploy as a web app

Do this in the browser — **never use `clasp deploy`**, which resets access settings.

1. Open the Apps Script editor: `https://script.google.com/d/<scriptId>/edit`
2. **Deploy → New deployment**
3. Gear icon → **Web app**
4. **Execute as**: Me
5. **Who has access**: Anyone with a Google account
6. Click **Deploy** — save the web app URL

### 3. Run first-time setup

This creates the Drive folder and a seed course sheet.

1. In the Apps Script editor, select `firstTimeSetup` from the function dropdown
2. Click **Run**
3. Grant Drive permissions when prompted
4. Open **View → Executions** to see the folder URL and sheet URL in the log output

`firstTimeSetup()` is safe to re-run — it does nothing if the folder is already configured.

After running, your Drive will contain:
- A folder called **Brainule Courses**
- A spreadsheet named **bioe_234_midterm_sample** in that folder

Test it: `<web-app-url>?course=bioe_234_midterm_sample`

---

## Development workflow

```bash
# 1. Edit files in src/
# 2. Push to Apps Script
clasp push --force

# 3. Update the deployment in the browser:
#    Apps Script editor → Deploy → Manage deployments
#    → pencil icon → "New version" → Deploy
```

The web app URL stays the same across version updates; only the version number increments.

```bash
clasp open    # opens the Apps Script editor in your browser
```

Server-side errors appear in the editor under **Executions** (left sidebar). If the web app shows a Drive error page instead of loading, that's a `doGet()` exception — check Executions for the message.

---

## Course sheet format

Each course is a single Google Spreadsheet in the Brainule Courses folder. The filename is the course slug (e.g. `bioe_234_midterm`) and is used directly in the URL.

### Overview tab

The first tab must be named **Overview**. It has two sections separated by a blank row.

**Section 1 — course metadata** (key/value pairs):

| field | value |
|---|---|
| title | BioE 134/234 Midterm Prep |

**Section 2 — topic list** (one row per topic):

| topic_slug | title | scope | path[0] | path[1] | path[2] |
|---|---|---|---|---|---|
| data_types_containers_and_sequence_operations | Data types, containers... | Variables as names... | cs | python_literacy | subtopics |

`topic_slug` is the stable identifier used to name topic tabs and look up questions. It must be unique within the course.

### Topic tabs

Each topic that has questions gets its own tab, named exactly as the `topic_slug`. Topics with no tab show an empty-state message in the UI.

Header row followed by one question per row:

| slug | question_format | difficulty | topic | question | answer | explanation | choice[A] | choice[B] | choice[C] | choice[D] |
|---|---|---|---|---|---|---|---|---|---|---|
| name-binding | multiple_choice | easy | Variable references... | How many elements... | B | Assignment binds... | 3, because... | 4, because... | 4, because... | Error... |

- `answer` is the key of the correct choice (e.g. `B`)
- `choice[X]` columns are collected into a `choices` object: `{ A: "...", B: "...", ... }`
- Any number of choices is supported; add more `choice[X]` columns as needed
- Blank `choice[X]` cells are ignored

### Text formatting in question and explanation cells

| Markup | Renders as |
|---|---|
| `<python>x = 1</python>` | Inline code |
| `<python>` + newline + code + newline + `</python>` | Code block |
| `<pre>ATGCATGC</pre>` | Inline monospace (for sequences, literals) |

---

## Creating a new course

### Option A: use the built-in seed sheet as a template

1. Open the **bioe_234_midterm_sample** sheet in Drive
2. **File → Make a copy** — name the copy your new course slug (e.g. `my_course_fall_2026`)
3. Move the copy to the **Brainule Courses** folder
4. Edit the Overview tab and topic tabs with your content
5. Visit `<web-app-url>?course=my_course_fall_2026`

### Option B: create a blank sheet from the Apps Script editor

In the Apps Script editor, run:
```javascript
createBlankCourseSheet('my_course_fall_2026', 'My Course — Fall 2026')
```

This creates a sheet with correct headers but no content rows.

### Option C: create and populate from seed data

```javascript
createCourseSheet('my_course_slug', 'My Course Title')
```

Creates a sheet pre-populated with the built-in sample content.

---

## Data collection (future)

Every user interaction (question presented, answer submitted, Gemini prompt copied) is sent to `EventLogger` in `js/event_logger.js.html`. Currently a no-op — events are received but nothing is stored.

The interface:

```javascript
EventLogger.logQuestionPresented({ topicSlug, questionSlug, questionFormat, presentedAt })
EventLogger.logAnswerSubmitted({ topicSlug, questionSlug, questionFormat, submittedAnswer, canonicalAnswer, isCorrect, scoreValue, submittedAt })
EventLogger.logGeminiPromptCopied({ topicSlug, questionSlug, questionFormat, copiedAt })
```

To activate logging, replace `NoOpEventLogger` with a class that calls `google.script.run` to invoke a server-side write to a Google Sheet. Planned structure: one responses spreadsheet per course, one tab per topic, one row per event. No front-end changes needed.

---

## Question schema reference

### Base fields (all question types)

| Field | Type | Required | Notes |
|---|---|---|---|
| `slug` | string | yes | Stable identifier within the topic |
| `question_format` | string | yes | `"multiple_choice"` is the only supported value in v1 |
| `difficulty` | string | yes | `"easy"`, `"medium"`, or `"hard"` |
| `topic` | string | yes | Short descriptor shown beneath the difficulty label |
| `question` | string | yes | Full question text; supports `<python>` and `<pre>` markup |
| `explanation` | string | yes | Shown after the student submits an answer |

### Multiple choice additional fields

| Field | Type | Notes |
|---|---|---|
| `choices` | object | `{ A: "text", B: "text", ... }` — any number of keys, order preserved |
| `answer` | string | The key of the correct choice |

### Future-safe optional fields (tolerated, not displayed)

`tags`, `source_refs`, `author_notes`, `version`, `learning_objective`, `lesson_prompt`
