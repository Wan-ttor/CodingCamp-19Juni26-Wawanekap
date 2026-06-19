# Implementation Plan: To-Do List Life Dashboard

## Overview

Build a self-contained, client-side productivity dashboard delivered as three static files (`index.html`, `css/style.css`, `js/app.js`). Implementation proceeds in six phases: project scaffold → Storage module → Greeting widget → Focus Timer widget → To-Do List widget → Quick Links widget, each wired up incrementally so every step produces a working, testable state.

---

## Tasks

- [x] 1. Scaffold project structure and HTML skeleton
  - Create `index.html` at the project root with `<!DOCTYPE html>`, `<meta charset>`, `<meta name="viewport">`, and relative links to `css/style.css` and `js/app.js`
  - Create `css/style.css` and `js/app.js` as empty files to validate the relative-path references
  - Add four landmark sections in `index.html`: `#greeting`, `#focus-timer`, `#todo`, `#quick-links`
  - Add all DOM element IDs required by each widget: `#greeting-time`, `#greeting-date`, `#greeting-message`, `#timer-display`, `#timer-start`, `#timer-stop`, `#timer-reset`, `#timer-complete-msg`, `#todo-input`, `#todo-add-btn`, `#todo-list`, `#links-label-input`, `#links-url-input`, `#links-add-btn`, `#links-list`, `#links-error`
  - Verify the file opens without errors under the `file://` protocol
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement the Storage module
  - [x] 2.1 Write the `Storage` IIFE in `js/app.js` with constants `TASKS_KEY = 'tdld_tasks'` and `LINKS_KEY = 'tdld_links'`
    - Implement `Storage.init()` — wrap a test write/read/delete in `try/catch`; set `available = false` on any error
    - Implement `Storage.loadTasks()` — read `tdld_tasks`, parse JSON, fall back to `[]` on missing key, parse error, or non-array value
    - Implement `Storage.saveTasks(tasks)` — `JSON.stringify` and write; return `true` on success, `false` on any `DOMException`
    - Implement `Storage.loadLinks()` and `Storage.saveLinks(links)` with the same pattern for `tdld_links`
    - Expose `Storage.isAvailable()`
    - _Requirements: 7.4, 10.1, 10.2, 10.3_

  -
- [x] 3. Implement the Greeting widget
  - [x] 3.1 Write the `Greeting` IIFE with `init()`, `tick()`, `formatTime(date)`, `formatDate(date)`, and `getGreeting(hour)`
    - `formatTime` — use `Intl.DateTimeFormat` to detect `hour12`; zero-pad to produce `HH:MM:SS [AM/PM]`
    - `formatDate` — produce "Weekday, DD Month YYYY" using `Intl.DateTimeFormat` for locale names
    - `getGreeting` — pure function mapping hour (0–23) to one of the four greeting strings per Requirements 2.4–2.7
    - `init()` — call `tick()` immediately, then `setInterval(tick, 1000)`
    - Wire DOM: write to `#greeting-time`, `#greeting-date`, `#greeting-message`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

 
- [x] 4. Implement the Focus Timer widget
  - [x] 4.1 Write the `FocusTimer` IIFE with state variables (`remainingSeconds`, `intervalId`, `timerState`) and functions `init()`, `start()`, `stop()`, `reset()`, `tick()`, `render()`, and `formatDisplay(seconds)`
    - `formatDisplay` — pure function converting seconds (0–1500) to `MM:SS` string
    - `start()` — guard: no-op when `timerState === 'complete'`; start interval, set state to `'running'`
    - `stop()` — clear interval, set state to `'paused'`; retain `remainingSeconds`
    - `reset()` — clear interval, set `remainingSeconds = 1500`, state to `'stopped'`, re-render, hide `#timer-complete-msg`
    - `tick()` — decrement `remainingSeconds`; on reaching 0, clear interval, set state to `'complete'`, show `#timer-complete-msg`
    - Attach click listeners to `#timer-start`, `#timer-stop`, `#timer-reset` inside `init()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

 
- [x] 5. Checkpoint — Greeting and Focus Timer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement the To-Do List widget — core add/display
  - [x] 6.1 Write the `TodoList` IIFE skeleton: `tasks` array, `init()`, `generateId()`, `addTask(title)`, `render()`, and inline error helper
    - `init()` — call `Storage.loadTasks()`; if `Storage.isAvailable()` is false, display storage-unavailable error; if data is corrupted (load returns `[]` but raw value exists and is non-array), display unreadable-data error; render
    - `generateId()` — use `crypto.randomUUID()` with fallback to `Date.now().toString()`
    - `addTask(title)` — trim, reject if empty or > 255 chars, push `{id, title:trimmed, completed:false}`, call `Storage.saveTasks`, render
    - `render()` — clear `#todo-list`, rebuild one `<li>` per task with checkbox, title `<span>`, Edit button, Delete button
    - Attach Enter-key and click listeners for `#todo-add-btn` / `#todo-input` in `init()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.1, 7.2, 7.3_

 

  

- [x] 7. Implement the To-Do List widget — edit, toggle, delete
  - [x] 7.1 Implement `editTask(id, newTitle)` and wire up the Edit button in `render()`
    - Edit button click — swap title `<span>` for `<input>` pre-filled with current title; show Confirm button
    - Confirm: trim value; if empty, discard and restore span without writing to Storage; if valid, call `editTask`, save, render
    - `editTask` — validate trimmed title, update in-memory `tasks` array, call `Storage.saveTasks`, render
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 7.3 Implement `toggleTask(id)` and wire up the checkbox in `render()`
    - Flip `completed` in-memory, call `Storage.saveTasks`; on failure (`false`), flip back, re-render, show inline error
    - Apply CSS classes for strikethrough + opacity ≤ 0.6 to completed items; remove on incomplete
    - Persist updated state within 500 ms of the toggle
    - _Requirements: 6.1, 6.2, 6.3_

  
  - [x] 7.5 Implement `deleteTask(id)` and wire up the Delete button in `render()`
    - Splice from in-memory array, call `Storage.saveTasks`; on failure, restore item at original index, re-render, show inline error
    - _Requirements: 6.4, 6.5, 6.6_

 
- [x] 8. Checkpoint — To-Do List
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement the Quick Links widget — validation and add/display
  - [x] 9.1 Write the `QuickLinks` IIFE skeleton: `links` array, `init()`, `validateLink(label, url)`, `addLink(label, url)`, `render()`
    - `validateLink` — pure function; check label trimmed length 1–50, URL starts with `http://` or `https://` and length ≤ 2048; return `{ valid, field, message }`
    - `addLink` — check 20-link cap first (separate message); call `validateLink`; push, `Storage.saveLinks`; on failure revert and show inline error
    - `render()` — clear `#links-list`, rebuild one `<button data-url>` per link with label text and a nested Delete button; clicking the main button area opens URL in new tab
    - `init()` — load from Storage, render; attach listeners to `#links-add-btn`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_


- [x] 10. Implement the Quick Links widget — delete
  - [x] 10.1 Implement `deleteLink(id)` and wire up the Delete button in `render()`
    - Splice from `links`, call `Storage.saveLinks`; on failure restore link and re-render (inline error optional per Req 9.3)
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 11. Apply CSS visual design and responsive layout
  - [x] 11.1 Write `css/style.css` with base styles: body font ≥ 16 px, heading size hierarchy with ≥ 4 px step per level, uniform section spacing, dark-on-light colour palette with ≥ 4.5:1 contrast ratio for all text
    - Define CSS custom properties for colours and spacing
    - Style each widget section consistently
    - _Requirements: 11.1, 11.3_

  - [x] 11.2 Add responsive grid layout: single-column below 600 px, multi-column at ≥ 600 px; no horizontal scrollbar from 320 px to 1920 px
    - Use CSS Grid or Flexbox with `min-width: 0` on grid children to prevent overflow
    - _Requirements: 11.2_

  - [x] 11.3 Add visible focus indicator styles: `outline: 2px solid <focus-color>` on `:focus-visible` for all interactive controls; ensure outline colour has ≥ 3:1 contrast against adjacent background
    - Add accessible names via `aria-label` or associated `<label>` for all inputs and icon-only buttons
    - _Requirements: 11.4_

- [x] 12. Bootstrap `DOMContentLoaded` entry point and wire all modules
  - [x] 12.1 Add `DOMContentLoaded` listener at the bottom of `js/app.js` that calls `Storage.init()`, `Greeting.init()`, `FocusTimer.init()`, `TodoList.init()`, and `QuickLinks.init()` in that order
    - Verify no widget calls another widget's functions directly
    - Confirm the page is fully interactive within 3 seconds when loaded via `file://`
    - _Requirements: 1.1, 1.2, 1.3, 12.1, 12.2_

 

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use [fast-check](https://fast-check.io/) which runs without a build step — load it via a local copy of the UMD bundle to stay offline-capable (Req 1.2)
- Each task references specific requirements for traceability
- Checkpoints at tasks 5, 8, and 13 ensure incremental validation
- The Storage module is built first so all subsequent widget tests can call its pure load/save functions directly
- Full re-render on every mutation is intentional (design decision) — keeps logic simple and stays within the 100 ms UI response budget for ≤ 500 tasks

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 2, "tasks": ["3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "6.1", "11.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "11.2", "11.3"] },
    { "id": 5, "tasks": ["7.1", "7.3", "7.5"] },
    { "id": 6, "tasks": ["7.2", "7.4", "7.6", "9.1"] },
    { "id": 7, "tasks": ["9.2", "9.3", "9.4", "10.1"] },
    { "id": 8, "tasks": ["12.1"] },
    { "id": 9, "tasks": ["12.2"] }
  ]
}
```
