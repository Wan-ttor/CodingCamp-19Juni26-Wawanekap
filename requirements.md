# Requirements Document

## Introduction

The **To-Do List Life Dashboard** is a self-contained, client-side web application that provides a personal productivity hub in the browser. It combines four widgets — a live Greeting with date/time, a Focus Timer (Pomodoro-style), a To-Do List, and a Quick Links panel — all persisted via the browser's Local Storage API. The application requires no backend, no build tools, and no frameworks. It is delivered as a single HTML file referencing one CSS file and one JavaScript file.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Widget**: The UI section that displays the current time, date, and a time-of-day greeting.
- **Focus_Timer**: The UI section that provides a 25-minute countdown timer with start, stop, and reset controls.
- **Todo_List**: The UI section that manages a user's personal task list.
- **Task**: A single item in the Todo_List with a title, completion state, and unique identifier.
- **Quick_Links**: The UI section that stores and displays user-defined shortcut buttons to external URLs.
- **Link**: A single Quick Links entry with a label and a URL.
- **Storage**: The browser's `localStorage` API used for all client-side persistence.
- **Modern_Browser**: Chrome (latest), Firefox (latest), Edge (latest), or Safari (latest).

---

## Requirements

### Requirement 1: Project Structure

**User Story:** As a developer, I want the project to follow a strict folder structure, so that the codebase remains clean and maintainable.

#### Acceptance Criteria

1. THE Dashboard SHALL be structured with exactly one HTML file at the project root, one CSS file inside a `css/` directory, and one JavaScript file inside a `js/` directory, and all asset references in the HTML file SHALL use relative paths (e.g., `css/style.css`, `js/app.js`) regardless of whether absolute paths could achieve the same compatibility, so the file works under both the `file://` protocol and any static host.
2. THE Dashboard SHALL NOT require a backend server, build process, third-party framework, or any external network resource (including CDN-loaded fonts, icon libraries, or analytics scripts) to run.
3. THE Dashboard SHALL function when opened directly in a Modern_Browser as a local file (via `file://` protocol) or served from any static host.

---

### Requirement 2: Greeting Widget

**User Story:** As a user, I want to see the current time, date, and a personalized greeting when I open the dashboard, so that I feel welcomed and oriented throughout the day.

#### Acceptance Criteria

1. IF the user's browser locale uses a 12-hour clock, THEN THE Greeting_Widget SHALL display the current time in `HH:MM:SS AM/PM` format, updated within 1 second (≤1000 ms) of each real-world second change without a page reload.
2. IF the user's browser locale uses a 24-hour clock, THEN THE Greeting_Widget SHALL display the current time in `HH:MM:SS` format, updated within 1 second (≤1000 ms) of each real-world second change without a page reload.
3. THE Greeting_Widget SHALL display the current date including the full weekday name, day, month name, and year (e.g., "Monday, 19 June 2026").
4. IF the local hour is between 05:00 and 11:59 (inclusive), THEN THE Greeting_Widget SHALL display the message "Good Morning".
5. IF the local hour is between 12:00 and 17:59 (inclusive), THEN THE Greeting_Widget SHALL display the message "Good Afternoon".
6. IF the local hour is between 18:00 and 20:59 (inclusive), THEN THE Greeting_Widget SHALL display the message "Good Evening".
7. IF the local hour is between 21:00 and 23:59 (inclusive) or between 00:00 and 04:59 (inclusive), THEN THE Greeting_Widget SHALL display the message "Good Night" and SHALL NOT display any other greeting message during this time range.

---

### Requirement 3: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with start, stop, and reset controls, so that I can apply the Pomodoro technique to stay focused.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialize with a countdown value of 25 minutes and 0 seconds (25:00) on first load and after every reset.
2. WHEN the user activates the Start control WHILE the Focus_Timer is stopped or paused, THE Focus_Timer SHALL begin or resume decrementing the countdown by one second each second.
3. WHEN the user activates the Stop control WHILE the Focus_Timer is running, THE Focus_Timer SHALL pause the countdown and retain the current remaining time.
4. WHEN the user activates the Start control WHILE the Focus_Timer is paused, THE Focus_Timer SHALL resume the countdown from the retained remaining time.
5. WHEN the user activates the Reset control, THE Focus_Timer SHALL stop the countdown and restore the display to 25:00.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and display a visible on-page message stating the session is complete.
7. WHEN the countdown is at 00:00, THE Focus_Timer SHALL ignore any activation of the Start control until the Reset control has been activated.
8. THE Focus_Timer SHALL display the remaining time in `MM:SS` format at all times.

---

### Requirement 4: To-Do List — Add and Display Tasks

**User Story:** As a user, I want to add tasks and see them listed on the dashboard, so that I can track what I need to do.

#### Acceptance Criteria

1. THE Todo_List SHALL provide an input field and an "Add" control for entering new tasks.
2. WHEN the user submits a task title (via the Add control or by pressing the Enter key) whose value, after trimming leading and trailing whitespace, is between 1 and 255 characters (inclusive), THE Todo_List SHALL append a new Task to the list with a unique identifier, the trimmed title, and an initial completion state of incomplete.
3. IF the user attempts to submit a task title whose trimmed value is empty or whitespace-only, THEN THE Todo_List SHALL ignore the submission and retain focus on the input field.
4. THE Todo_List SHALL display all Tasks in the order they were added, showing each Task's title and completion state.
5. WHEN a new Task is created, THE Todo_List SHALL persist the Task to Storage before it is rendered in the list.
6. WHEN the Dashboard loads, THE Todo_List SHALL restore all previously saved Tasks from Storage and display them.

---

### Requirement 5: To-Do List — Edit Tasks

**User Story:** As a user, I want to edit an existing task's title, so that I can correct mistakes or update what I need to do.

#### Acceptance Criteria

1. THE Todo_List SHALL provide an Edit control for each Task in the list.
2. WHEN the user activates the Edit control for a Task, THE Todo_List SHALL replace the Task's title display with an editable input field pre-filled with the current title.
3. WHEN the user confirms the edit (via an on-screen confirm control or by pressing Enter) and the trimmed new value is non-empty, THE Todo_List SHALL update the Task's title to the trimmed new value and restore the standard display.
4. IF the user confirms an edit with an empty or whitespace-only value, THEN THE Todo_List SHALL discard the change and restore the original title without modifying Storage.
5. WHEN an edit is confirmed with a valid non-empty value, THE Todo_List SHALL persist the updated Task to Storage before the updated title is rendered.

---

### Requirement 6: To-Do List — Complete and Delete Tasks

**User Story:** As a user, I want to mark tasks as done and delete tasks I no longer need, so that I can manage my list effectively.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a checkbox or toggle control for each Task to mark it as complete or incomplete.
2. WHEN the user toggles the completion control for a Task, THE Todo_List SHALL update the Task's completion state and apply strikethrough text decoration and reduced opacity (≤0.6) to completed Tasks, and remove both styles when the Task is marked incomplete.
3. WHEN the completion state of a Task changes, THE Todo_List SHALL persist the updated state to Storage within 500 milliseconds; IF the Storage write fails, THEN THE Todo_List SHALL revert the completion toggle to its previous state and display an inline error message.
4. THE Todo_List SHALL provide a Delete control for each Task.
5. WHEN the user activates the Delete control for a Task, THE Todo_List SHALL remove that Task from the list and from Storage.
6. IF the Storage write fails when deleting a Task, THEN THE Todo_List SHALL keep that Task visible in the list and display an inline error message; THE Todo_List SHALL NOT show an error message when the Storage write succeeds, even if the task becomes invisible for other reasons.

---

### Requirement 7: To-Do List — Persistence

**User Story:** As a user, I want my tasks to be saved automatically, so that they are still there when I reopen the dashboard.

#### Acceptance Criteria

1. WHEN the user performs an add, edit, complete, or delete operation, THE Todo_List SHALL persist the entire current task array to Storage before the UI reflects the change.
2. WHEN the Dashboard loads, THE Storage SHALL be read once and all Tasks restored from it before the list is rendered, so the list is never rendered in a partially-loaded state.
3. IF Storage is unavailable on load, THEN THE Todo_List SHALL render an empty list and display an inline error message indicating storage is unavailable; IF Storage is available but returns a value that cannot be parsed as a JSON array, THEN THE Todo_List SHALL render an empty list and display a separate inline error message indicating the data is unreadable; no task data SHALL be silently discarded in either case.
4. THE Todo_List SHALL store all Tasks under a single fixed Storage key that does not vary by session, user agent, or runtime configuration.
5. IF a valid task array is serialized to JSON and then deserialized from JSON, THEN the resulting array SHALL have the same number of items, the same field names, the same field values, and the same item order as the original array.

---

### Requirement 8: Quick Links — Add and Display

**User Story:** As a user, I want to save buttons that open my favorite websites, so that I can access them quickly from the dashboard.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide an input field for a link label (1–50 characters), an input field for a URL (1–2048 characters), and an "Add" control.
2. WHEN the user submits a non-empty label and a URL that begins with `http://` or `https://` via the Add control, THE Quick_Links SHALL append a new Link to the panel and persist it to Storage; IF the Storage write fails, THEN THE Quick_Links SHALL remove the Link from the panel and display an inline error message.
3. IF the user attempts to add a Link with an empty label, a label exceeding 50 characters, an empty URL, a URL not beginning with `http://` or `https://`, or a URL exceeding 2048 characters, THEN THE Quick_Links SHALL reject the submission and display an inline validation message that identifies which field is invalid.
4. THE Quick_Links SHALL display each saved Link as a clickable button labeled with the Link's label.
5. WHEN the user clicks a Link button, THE Quick_Links SHALL open the associated URL in a new browser tab.
6. WHEN the Dashboard loads, THE Quick_Links SHALL restore all previously saved Links from Storage and render them as buttons.
7. THE Quick_Links SHALL enforce a maximum of 20 saved Links; IF the user attempts to add a Link when 20 Links already exist, THEN THE Quick_Links SHALL reject the submission and display an inline message stating the maximum has been reached; THE Quick_Links SHALL NOT display this maximum-reached message at other times.

---

### Requirement 9: Quick Links — Delete

**User Story:** As a user, I want to remove quick links I no longer need, so that the panel stays relevant and uncluttered.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide a Delete control for each Link button.
2. WHEN the user activates the Delete control for a Link, THE Quick_Links SHALL immediately remove that Link from the panel and persist the updated links array to Storage.
3. IF the Storage write fails when deleting a Link, THEN THE Quick_Links SHALL re-render the deleted Link in the panel so the panel remains consistent with persisted data; an inline error message MAY also be displayed but is not required if the link restoration makes the failure evident to the user.

---

### Requirement 10: Data Storage Contract

**User Story:** As a developer, I want all persistent data to use a well-defined Storage schema, so that the application remains predictable and debuggable.

#### Acceptance Criteria

1. THE Storage SHALL use the key `"tdld_tasks"` to store the serialized task array and the key `"tdld_links"` to store the serialized links array.
2. IF Storage is unavailable, or returns a value for a key that cannot be parsed as valid JSON, or returns a successfully-parsed value that is not a JSON array (e.g., an object, string, or number), THEN THE Dashboard SHALL fall back to an empty array for that key, display no error to the user, and render normally.
3. WHEN any write operation is performed, THE Dashboard SHALL write only to `"tdld_tasks"` or `"tdld_links"` and SHALL NOT create, update, or delete any other Storage key, including keys for user preferences or settings.

---

### Requirement 11: Visual Design and Responsiveness

**User Story:** As a user, I want the dashboard to look clean and readable on any screen size, so that I can use it comfortably on desktop and laptop browsers.

#### Acceptance Criteria

1. THE Dashboard SHALL apply a consistent visual theme where body text uses a minimum font size of 16px, heading levels are visually distinct from each other and from body text through differences in font size of at least 4px per level, and spacing between sections is uniform.
2. THE Dashboard SHALL lay out the four widgets (Greeting, Focus Timer, To-Do List, Quick Links) in a responsive grid that displays as a single-column layout at viewport widths below 600px and as a multi-column layout at viewport widths of 600px and above, without producing a horizontal scrollbar at any viewport width between 320px and 1920px at 100% browser zoom; at viewport widths below 320px, horizontal scrollbars are permitted.
3. THE Dashboard SHALL render all text with a contrast ratio of at least 4.5:1 between the text color and its background color in the default browser light color scheme without requiring any user action.
4. THE Dashboard SHALL render a visible focus indicator on every interactive control (buttons, inputs, checkboxes) such that the focused element has an outline of at least 2px in width with a contrast ratio of at least 3:1 between the outline color and the adjacent background color.

---

### Requirement 12: Performance

**User Story:** As a user, I want the dashboard to load instantly and respond without lag, so that it doesn't interrupt my workflow.

#### Acceptance Criteria

1. THE Dashboard SHALL load and become fully interactive (all controls enabled, all persisted data visible, no loading indicators active) within 3 seconds on a connection of at least 10 Mbps download speed and at most 50ms round-trip latency when served as a static file.
2. WHEN the user interacts with any control (add, edit, delete, toggle, timer), THE Dashboard SHALL update the UI state (DOM change) within 100 milliseconds; the Storage persistence operation may complete asynchronously after the DOM update.
3. THE Dashboard SHALL NOT block the browser's main thread for more than 50ms during any single Storage read or write operation for task arrays containing up to 500 Tasks or link arrays containing up to 100 Links.
4. IF a Storage operation takes longer than 200ms, THEN THE Dashboard SHALL display a non-blocking loading indicator and remove it when the operation completes, so the user is not left with an unresponsive UI.
