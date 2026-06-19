# Design Document — To-Do List Life Dashboard

## Overview

The To-Do List Life Dashboard is a purely client-side, single-page productivity application delivered as three static files: `index.html`, `css/style.css`, and `js/app.js`. No build step, no framework, no CDN dependency. The application runs under both the `file://` protocol and any static HTTP host.

Four independent widgets share a single page:

| Widget | Primary responsibility |
|---|---|
| **Greeting** | Live clock (HH:MM:SS), date, and time-of-day greeting |
| **Focus Timer** | 25-minute Pomodoro-style countdown with start / stop / reset |
| **To-Do List** | Add, edit, complete, and delete tasks |
| **Quick Links** | User-defined URL shortcut buttons |

All mutable state is persisted to `localStorage` under two fixed keys: `tdld_tasks` and `tdld_links`. There is no server, no authentication, and no network I/O.

---

## Architecture

### High-Level Structure

```
index.html          — Markup skeleton, links css/style.css and js/app.js
css/
  style.css         — All visual styling, responsive grid, theming
js/
  app.js            — All application logic (four widget modules + storage layer)
```

### Module Decomposition (inside `app.js`)

The single JS file is organised into five logical sections, each introduced with a section comment:

```
/* ─── STORAGE ──────────────────────────────────────────────────────────── */
/* ─── GREETING WIDGET ──────────────────────────────────────────────────── */
/* ─── FOCUS TIMER WIDGET ───────────────────────────────────────────────── */
/* ─── TODO LIST WIDGET ─────────────────────────────────────────────────── */
/* ─── QUICK LINKS WIDGET ───────────────────────────────────────────────── */
```

Each widget section owns its own DOM queries, event listeners, and render functions. Widgets communicate only through the shared Storage module — they do not call each other directly, keeping coupling minimal.

### Execution Flow

```
DOMContentLoaded
  │
  ├─► Storage.init()          — test localStorage availability
  ├─► Greeting.init()         — start clock interval
  ├─► FocusTimer.init()       — render 25:00
  ├─► TodoList.init()         — load + render tasks
  └─► QuickLinks.init()       — load + render links
```

### Concurrency Model

The application is entirely single-threaded (browser main thread). All `localStorage` calls are synchronous. Timers use `setInterval` / `setTimeout`. There is no Web Worker, no `async`/`await`, and no Promise chain.

---

## Components and Interfaces

### 1. Storage Module

Encapsulates all `localStorage` access. Every other module calls Storage rather than `localStorage` directly, so error handling and the key constants live in one place.

```js
const Storage = (() => {
  const TASKS_KEY = 'tdld_tasks';
  const LINKS_KEY = 'tdld_links';
  let available = true;

  function init() { /* test availability via try/catch */ }

  /** @returns {Task[]} */
  function loadTasks() { /* JSON.parse, fallback to [] */ }

  /** @param {Task[]} tasks @returns {boolean} success */
  function saveTasks(tasks) { /* JSON.stringify, returns false on QuotaExceeded */ }

  /** @returns {Link[]} */
  function loadLinks() { /* JSON.parse, fallback to [] */ }

  /** @param {Link[]} links @returns {boolean} success */
  function saveLinks(links) { /* JSON.stringify, returns false on QuotaExceeded */ }

  return { init, loadTasks, saveTasks, loadLinks, saveLinks, isAvailable: () => available };
})();
```

**Error contract**: `saveTasks` and `saveLinks` return `true` on success, `false` on any error (quota exceeded, private-browsing block). Callers are responsible for reverting UI and surfacing inline error messages.

---

### 2. Greeting Widget

**DOM targets**: `#greeting-time`, `#greeting-date`, `#greeting-message`

**Interface**:
```js
const Greeting = (() => {
  function init() { tick(); setInterval(tick, 1000); }
  function tick() { /* update time, date, greeting message */ }
  function formatTime(date) { /* returns locale-aware HH:MM:SS [AM/PM] string */ }
  function formatDate(date) { /* returns "Weekday, DD Month YYYY" */ }
  function getGreeting(hour) { /* returns greeting string for given hour */ }
  return { init };
})();
```

`formatTime` uses `Intl.DateTimeFormat` with `hour12` detection to choose 12- or 24-hour output, then zero-pads manually for the `HH:MM:SS` template.

`getGreeting` is a pure function of `hour` (0–23) — this is important for testability.

---

### 3. Focus Timer Widget

**DOM targets**: `#timer-display`, `#timer-start`, `#timer-stop`, `#timer-reset`, `#timer-complete-msg`

**State** (local variables, not persisted):
```
remainingSeconds : number   (starts at 1500)
intervalId       : number | null
timerState       : 'stopped' | 'running' | 'paused' | 'complete'
```

**Interface**:
```js
const FocusTimer = (() => {
  function init()   { /* render initial display */ }
  function start()  { /* ignored when state === 'complete' */ }
  function stop()   { /* pause; retain remainingSeconds */ }
  function reset()  { /* stop interval, restore 1500, state → 'stopped' */ }
  function tick()   { /* decrement; if 0 → complete */ }
  function render() { /* update #timer-display with MM:SS */ }
  return { init };
})();
```

**State machine**:

```
stopped ──start──► running ──tick to 0──► complete
running ──stop───► paused
paused  ──start──► running
any     ──reset──► stopped
complete──start──► (ignored)
complete──reset──► stopped
```

---

### 4. To-Do List Widget

**DOM targets**: `#todo-input`, `#todo-add-btn`, `#todo-list`

**Interface**:
```js
const TodoList = (() => {
  let tasks = [];   // in-memory copy, source of truth

  function init()               { /* load from Storage, render */ }
  function addTask(title)       { /* validate, push, save, render */ }
  function editTask(id, title)  { /* validate, update, save, render */ }
  function toggleTask(id)       { /* flip state, save, render; revert on fail */ }
  function deleteTask(id)       { /* splice, save, render; restore on fail */ }
  function render()             { /* clear #todo-list, rebuild DOM */ }
  function generateId()         { /* returns crypto.randomUUID() or Date.now().toString() */ }
  return { init };
})();
```

**Rendering approach**: Full re-render on every mutation. With ≤500 tasks this is fast enough to stay within the 100 ms UI-response budget.

Each rendered task item contains:
- A checkbox (`<input type="checkbox">`) for completion toggle
- A `<span>` or `<label>` for the title
- An **Edit** button that swaps the span for an `<input>` in-place
- A **Delete** button

---

### 5. Quick Links Widget

**DOM targets**: `#links-label-input`, `#links-url-input`, `#links-add-btn`, `#links-list`, `#links-error`

**Interface**:
```js
const QuickLinks = (() => {
  let links = [];

  function init()             { /* load from Storage, render */ }
  function addLink(label, url){ /* validate, push, save, render; revert on fail */ }
  function deleteLink(id)     { /* splice, save, render; restore on fail */ }
  function render()           { /* rebuild #links-list */ }
  function validateLink(label, url) { /* returns { valid, field, message } */ }
  return { init };
})();
```

`validateLink` is a pure function — it receives label and url strings, returns a result object. This makes it independently testable.

Each rendered link is a `<button>` with `data-url` and a nested delete icon/button.

---

## Data Models

### Task

```js
/**
 * @typedef {Object} Task
 * @property {string}  id        — Unique identifier (UUID or timestamp string)
 * @property {string}  title     — Trimmed task title, 1–255 characters
 * @property {boolean} completed — false = incomplete, true = complete
 */
```

Serialised form (JSON, stored under `tdld_tasks`):
```json
[
  { "id": "1718784000000", "title": "Buy groceries", "completed": false },
  { "id": "1718784001234", "title": "Write design doc", "completed": true }
]
```

### Link

```js
/**
 * @typedef {Object} Link
 * @property {string} id    — Unique identifier
 * @property {string} label — Display label, 1–50 characters
 * @property {string} url   — Absolute URL beginning with http:// or https://, 1–2048 characters
 */
```

Serialised form (JSON, stored under `tdld_links`):
```json
[
  { "id": "1718784002000", "label": "GitHub", "url": "https://github.com" }
]
```

### Storage Schema Summary

| Key | Value type | Max items | Notes |
|---|---|---|---|
| `tdld_tasks` | JSON array of Task | 500 (performance bound) | No hard cap enforced by app |
| `tdld_links` | JSON array of Link | 20 (hard cap enforced) | |

**Invariants**:
- Both values are always valid JSON arrays (or absent). Never objects, numbers, or `null`.
- On read error or absent key, the module falls back to `[]` silently (per Req 10.2).
- The application never writes any key other than `tdld_tasks` and `tdld_links` (per Req 10.3).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Greeting message covers all 24 hours exactly once

*For any* integer hour value in [0, 23], `getGreeting(hour)` SHALL return exactly one of {"Good Morning", "Good Afternoon", "Good Evening", "Good Night"}, and the four ranges [5–11], [12–17], [18–20], [21–23] ∪ [0–4] are mutually exclusive and collectively exhaustive over [0, 23].

**Validates: Requirements 2.4, 2.5, 2.6, 2.7**

---

### Property 2: Task serialisation round-trip identity

*For any* valid array of Task objects, serialising it to JSON via `JSON.stringify` and then deserialising via `JSON.parse` SHALL produce an array with the same length, the same item order, and the same field values (`id`, `title`, `completed`) for every item.

**Validates: Requirements 7.5, 10.1**

---

### Property 3: Adding a valid task grows the list by exactly one

*For any* in-memory task array and any non-empty, non-whitespace-only string of 1–255 trimmed characters, calling `addTask` SHALL increase the task array length by exactly one and the new item SHALL appear as the last element with the supplied trimmed title and `completed: false`.

**Validates: Requirements 4.2, 4.4**

---

### Property 4: Whitespace-only task submission is always rejected

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), calling `addTask` SHALL leave the task array unchanged (same length, same items).

**Validates: Requirements 4.3**

---

### Property 5: Task edit round-trip preserves identity of other tasks

*For any* task array with at least one item, editing the title of task at index `i` to a valid non-empty trimmed string SHALL change only that task's `title` field; all other tasks' `id`, `title`, and `completed` fields SHALL remain identical to their pre-edit values.

**Validates: Requirements 5.3, 5.5**

---

### Property 6: Completion toggle is an involution

*For any* task, calling `toggleTask` twice in succession SHALL return `completed` to its original value, leaving `id` and `title` unchanged.

**Validates: Requirements 6.2**

---

### Property 7: Deleting a task removes exactly that task

*For any* task array containing a task with id `X`, calling `deleteTask(X)` SHALL produce an array that (a) does not contain any item with id `X`, (b) has length exactly one less than before, and (c) preserves the relative order of all remaining items.

**Validates: Requirements 6.5**

---

### Property 8: Quick Links URL validation rejects non-http(s) schemes

*For any* string that does not begin with `http://` or `https://`, `validateLink` SHALL return `{ valid: false }` regardless of the label value.

**Validates: Requirements 8.2, 8.3**

---

### Property 9: Quick Links validation enforces field-length bounds

*For any* label whose trimmed length is 0 or > 50, or any URL whose length is 0 or > 2048, `validateLink` SHALL return `{ valid: false }` and the `field` property SHALL identify the offending field.

**Validates: Requirements 8.1, 8.3**

---

### Property 10: Link serialisation round-trip identity

*For any* valid array of Link objects, serialising then deserialising SHALL produce an array with the same length, item order, and field values (`id`, `label`, `url`) for every item.

**Validates: Requirements 10.1**

---

### Property 11: Focus Timer `formatDisplay` covers all valid remaining seconds

*For any* integer value of `remainingSeconds` in [0, 1500], the formatted display string SHALL match the pattern `^\d{2}:\d{2}$` and the numeric minutes and seconds values encoded in the string SHALL satisfy `minutes * 60 + seconds === remainingSeconds`.

**Validates: Requirements 3.1, 3.8**

---

### Property 12: Max-links guard always rejects when at capacity

*For any* links array already containing exactly 20 items, calling `addLink` with any combination of label and URL (valid or invalid) SHALL leave the links array unchanged and return a rejection result indicating the maximum has been reached.

**Validates: Requirements 8.7**

---

## Error Handling

### localStorage Unavailability

`Storage.init()` wraps a test write/read/delete in a `try/catch`. If it throws (private browsing, quota, permissions), `available` is set to `false`. All `load*` calls return `[]` when unavailable. All `save*` calls return `false` and callers display inline error messages.

### Quota Exceeded

`saveTasks` / `saveLinks` catch `DOMException` (including `QuotaExceededError`). On failure:
- **Toggle**: revert the in-memory `completed` flag and re-render; show inline error.
- **Delete task**: restore the removed item at its original index and re-render; show inline error.
- **Add link**: remove the newly pushed link and re-render; show inline error.
- **Delete link**: restore the link and re-render.

### Corrupt Storage Data

If `JSON.parse` throws or the parsed value is not an array, the module falls back to `[]` without surfacing an error to the user (Req 10.2). Requirements 7.3 calls for a separate error message when data is unreadable at load time — the Todo List widget shows this message; Quick Links falls back silently per Req 10.2.

### Timer Edge Cases

- Start while `state === 'complete'`: no-op (Req 3.7).
- Rapid button clicks: each handler reads `timerState` synchronously before acting; no race conditions are possible in a single-threaded environment.

### Input Validation

All validation is synchronous and immediate:
- Task title: trimmed length must be 1–255.
- Link label: trimmed length must be 1–50.
- Link URL: must begin with `http://` or `https://` and length ≤ 2048.
- Maximum 20 links: checked before `validateLink`; separate inline message if exceeded.

---

## Testing Strategy

### Unit Tests (example-based)

Target: pure functions that can be exercised without a DOM.

| Function | Test cases |
|---|---|
| `getGreeting(hour)` | All 24 hours; boundary values 5, 12, 18, 21, 0, 4 |
| `validateLink(label, url)` | Empty label, 51-char label, empty URL, `ftp://` URL, 2049-char URL, valid inputs |
| `FocusTimer.formatDisplay(seconds)` | 1500→"25:00", 0→"00:00", 90→"01:30", 61→"01:01" |
| Storage fallback on bad JSON | Feed corrupted strings; expect `[]` |
| Task title trimming | Leading/trailing spaces; all-whitespace rejected |

### Property-Based Tests

Use a property-based testing library appropriate for vanilla JavaScript. [fast-check](https://fast-check.io/) runs in-browser and in Node without a build step, making it the natural choice for this project.

Each property test runs a **minimum of 100 iterations**.

Tag format for each test: `// Feature: todo-life-dashboard, Property N: <property text>`

| Property | Generator strategy |
|---|---|
| **P1** Greeting coverage | `fc.integer({ min: 0, max: 23 })` |
| **P2** Task JSON round-trip | `fc.array(fc.record({ id: fc.string(), title: fc.string({minLength:1,maxLength:255}), completed: fc.boolean() }))` |
| **P3** Add valid task | `fc.array(taskArb)` × `fc.string({minLength:1}).map(s=>s.trim()).filter(s=>s.length>0&&s.length<=255)` |
| **P4** Whitespace title rejected | `fc.stringMatching(/^[\s]+$/)` |
| **P5** Edit preserves others | `fc.array(taskArb, {minLength:1})` × valid title arbitrary |
| **P6** Toggle involution | `fc.record({id:fc.string(),title:fc.string(),completed:fc.boolean()})` |
| **P7** Delete removes exactly one | `fc.array(taskArb,{minLength:1})` — pick random index to delete |
| **P8** URL scheme validation | `fc.string().filter(s=>!s.startsWith('http://') && !s.startsWith('https://'))` |
| **P9** Field-length bounds | `fc.oneof(oversizeLabelArb, emptyLabelArb, oversizeUrlArb, emptyUrlArb)` |
| **P10** Link JSON round-trip | `fc.array(linkArb)` |
| **P11** Timer display format | `fc.integer({ min: 0, max: 1500 })` |
| **P12** Max-links guard | `fc.array(linkArb, {minLength:20, maxLength:20})` × `fc.tuple(fc.string(), fc.webUrl())` |

### Integration / Manual Tests

Because this is a zero-build project, UI integration tests are performed manually or with a lightweight test runner (e.g., Playwright with a local `file://` path):

- Responsive layout at 320 px, 600 px, 1280 px viewport widths.
- Full page load with 500 pre-seeded tasks — confirm < 3 s and < 50 ms main-thread block.
- localStorage quota exceeded simulation (fill quota, attempt add).
- Clock tick: verify display updates every ≤ 1000 ms.
- Contrast ratio check with browser DevTools accessibility panel.
- Focus indicator visibility on Tab traversal.

### Accessibility Checks

- All interactive controls have accessible names (`aria-label` or visible `<label>`).
- Colour contrast ≥ 4.5:1 for text, ≥ 3:1 for focus outlines (verified with contrast analyser tool).
- Focus indicator: `outline: 2px solid <focus-color>` on `:focus-visible`.
