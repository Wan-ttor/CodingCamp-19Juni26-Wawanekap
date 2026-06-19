/* ─── STORAGE ──────────────────────────────────────────────────────────── */

const Storage = (() => {
  const TASKS_KEY = 'tdld_tasks';
  const LINKS_KEY = 'tdld_links';
  let available = true;

  /**
   * Test localStorage availability by performing a test write/read/delete.
   * Sets available = false if any step throws (private browsing, permissions, etc.).
   */
  function init() {
    try {
      const testKey = '__tdld_test__';
      localStorage.setItem(testKey, '1');
      localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
    } catch (e) {
      available = false;
    }
  }

  /**
   * Load tasks from localStorage.
   * Returns [] on missing key, JSON parse error, or non-array value.
   * @returns {Task[]}
   */
  function loadTasks() {
    if (!available) return [];
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      if (raw === null) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      return [];
    }
  }

  /**
   * Save tasks to localStorage.
   * @param {Task[]} tasks
   * @returns {boolean} true on success, false on any DOMException
   */
  function saveTasks(tasks) {
    if (!available) return false;
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
      return true;
    } catch (e) {
      if (e instanceof DOMException) return false;
      throw e;
    }
  }

  /**
   * Load links from localStorage.
   * Returns [] on missing key, JSON parse error, or non-array value.
   * @returns {Link[]}
   */
  function loadLinks() {
    if (!available) return [];
    try {
      const raw = localStorage.getItem(LINKS_KEY);
      if (raw === null) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      return [];
    }
  }

  /**
   * Save links to localStorage.
   * @param {Link[]} links
   * @returns {boolean} true on success, false on any DOMException
   */
  function saveLinks(links) {
    if (!available) return false;
    try {
      localStorage.setItem(LINKS_KEY, JSON.stringify(links));
      return true;
    } catch (e) {
      if (e instanceof DOMException) return false;
      throw e;
    }
  }

  return {
    init,
    loadTasks,
    saveTasks,
    loadLinks,
    saveLinks,
    isAvailable: () => available,
  };
})();

/* ─── GREETING WIDGET ──────────────────────────────────────────────────── */

const Greeting = (() => {
  /**
   * Determine whether the user's locale uses a 12-hour clock.
   * We instantiate an Intl.DateTimeFormat with hour: 'numeric' and read
   * resolvedOptions().hour12 — this reflects the actual locale preference.
   * @returns {boolean}
   */
  function _isHour12() {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric' })
      .resolvedOptions()
      .hour12 === true;
  }

  /**
   * Zero-pad a number to at least two digits.
   * @param {number} n
   * @returns {string}
   */
  function _pad(n) {
    return String(n).padStart(2, '0');
  }

  /**
   * Format a Date object into a locale-aware time string.
   * - 24-hour locales:  HH:MM:SS
   * - 12-hour locales:  HH:MM:SS AM  /  HH:MM:SS PM
   *
   * @param {Date} date
   * @returns {string}
   */
  function formatTime(date) {
    const hours24 = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    if (_isHour12()) {
      const isPM    = hours24 >= 12;
      const hours12 = hours24 % 12 || 12;   // convert 0 → 12, 13 → 1, etc.
      return `${_pad(hours12)}:${_pad(minutes)}:${_pad(seconds)} ${isPM ? 'PM' : 'AM'}`;
    }

    return `${_pad(hours24)}:${_pad(minutes)}:${_pad(seconds)}`;
  }

  /**
   * Format a Date object into "Weekday, DD Month YYYY".
   * Uses Intl.DateTimeFormat to obtain locale-specific weekday and month names.
   * Example: "Monday, 19 June 2026"
   *
   * @param {Date} date
   * @returns {string}
   */
  function formatDate(date) {
    const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
    const monthFmt   = new Intl.DateTimeFormat(undefined, { month: 'long' });

    const weekday = weekdayFmt.format(date);
    const day     = date.getDate();
    const month   = monthFmt.format(date);
    const year    = date.getFullYear();

    return `${weekday}, ${day} ${month} ${year}`;
  }

  /**
   * Pure function: map an hour (0–23) to the appropriate greeting string.
   *
   *   05–11  →  "Good Morning"
   *   12–17  →  "Good Afternoon"
   *   18–20  →  "Good Evening"
   *   21–23, 00–04  →  "Good Night"
   *
   * @param {number} hour  — integer in [0, 23]
   * @returns {string}
   */
  function getGreeting(hour) {
    if (hour >= 5 && hour <= 11)  return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 20) return 'Good Evening';
    return 'Good Night';                  // covers 21–23 and 0–4
  }

  /**
   * Read the current time and update the three DOM targets.
   */
  function tick() {
    const now = new Date();

    const timeEl    = document.getElementById('greeting-time');
    const dateEl    = document.getElementById('greeting-date');
    const messageEl = document.getElementById('greeting-message');

    if (timeEl)    timeEl.textContent    = formatTime(now);
    if (dateEl)    dateEl.textContent    = formatDate(now);
    if (messageEl) messageEl.textContent = getGreeting(now.getHours());
  }

  /**
   * Kick off the clock: run tick() immediately, then once per second.
   */
  function init() {
    tick();
    setInterval(tick, 1000);
  }

  return { init, formatTime, formatDate, getGreeting };
})();

/* ─── FOCUS TIMER WIDGET ───────────────────────────────────────────────── */

const FocusTimer = (() => {
  // ── State variables ────────────────────────────────────────────────────
  let remainingSeconds = 25 * 60;          // 1500
  let intervalId       = null;
  let timerState       = 'stopped';        // 'stopped' | 'running' | 'paused' | 'complete'

  // ── Pure helper ────────────────────────────────────────────────────────

  /**
   * Convert a seconds value (0–1500) into a "MM:SS" display string.
   * Examples: 1500 → "25:00", 90 → "01:30", 0 → "00:00"
   *
   * @param {number} seconds — integer in [0, 1500]
   * @returns {string}
   */
  function formatDisplay(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // ── DOM updater ────────────────────────────────────────────────────────

  /**
   * Write the current remainingSeconds into #timer-display.
   */
  function render() {
    const display = document.getElementById('timer-display');
    if (display) display.textContent = formatDisplay(remainingSeconds);
  }

  // ── Core timer logic ───────────────────────────────────────────────────

  /**
   * Called every second while the timer is running.
   * Decrements remainingSeconds; transitions to 'complete' when it hits 0.
   */
  function tick() {
    remainingSeconds -= 1;
    render();

    if (remainingSeconds <= 0) {
      clearInterval(intervalId);
      intervalId  = null;
      timerState  = 'complete';

      const msg = document.getElementById('timer-complete-msg');
      if (msg) {
        msg.textContent = 'Session complete! Great work — take a break.';
        msg.removeAttribute('hidden');
        msg.style.display = '';
      }
    }
  }

  /**
   * Start or resume the timer.
   * No-op when timerState === 'complete' (Req 3.7).
   */
  function start() {
    if (timerState === 'complete') return;
    if (timerState === 'running')  return;   // already running — guard against double-start

    timerState = 'running';
    intervalId = setInterval(tick, 1000);
  }

  /**
   * Pause the timer, retaining remainingSeconds (Req 3.3).
   */
  function stop() {
    if (timerState !== 'running') return;

    clearInterval(intervalId);
    intervalId = null;
    timerState = 'paused';
  }

  /**
   * Reset the timer to 25:00 and hide the completion message (Req 3.5).
   */
  function reset() {
    clearInterval(intervalId);
    intervalId       = null;
    remainingSeconds = 25 * 60;
    timerState       = 'stopped';

    const msg = document.getElementById('timer-complete-msg');
    if (msg) {
      msg.setAttribute('hidden', '');
      msg.style.display = 'none';
    }

    render();
  }

  // ── Initialisation ─────────────────────────────────────────────────────

  /**
   * Render the initial "25:00" display and attach button listeners.
   */
  function init() {
    render();   // show 25:00 immediately (Req 3.1)

    const btnStart = document.getElementById('timer-start');
    const btnStop  = document.getElementById('timer-stop');
    const btnReset = document.getElementById('timer-reset');

    if (btnStart) btnStart.addEventListener('click', start);
    if (btnStop)  btnStop.addEventListener('click',  stop);
    if (btnReset) btnReset.addEventListener('click', reset);
  }

  return { init, formatDisplay };
})();

/* ─── TODO LIST WIDGET ─────────────────────────────────────────────────── */

const TodoList = (() => {
  /** @type {Task[]} In-memory source of truth */
  let tasks = [];

  // ── Inline error helper ────────────────────────────────────────────────

  /**
   * Display an error message in the #todo-error element.
   * Pass an empty string to clear any existing message.
   * @param {string} msg
   */
  function showError(msg) {
    const el = document.getElementById('todo-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? '' : 'none';
  }

  // ── ID generation ──────────────────────────────────────────────────────

  /**
   * Generate a unique identifier for a new task.
   * Uses `crypto.randomUUID()` when available, falls back to Date.now().
   * @returns {string}
   */
  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString();
  }

  // ── Renderer ───────────────────────────────────────────────────────────

  /**
   * Full re-render of #todo-list.
   * Clears the list and rebuilds one <li> per task.
   * Checkbox, Edit button, and Delete button carry data-id attributes
   * so later tasks (7.1, 7.3, 7.5) can wire them up.
   */
  function render() {
    const list = document.getElementById('todo-list');
    if (!list) return;

    list.innerHTML = '';

    tasks.forEach((task) => {
      const li = document.createElement('li');
      li.dataset.id = task.id;
      if (task.completed) li.classList.add('completed');

      // Completion checkbox (wired in task 7.3)
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.dataset.id = task.id;
      checkbox.setAttribute('aria-label', `Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`);
      checkbox.addEventListener('change', () => toggleTask(task.id));

      // Title span
      const span = document.createElement('span');
      span.classList.add('task-title');
      if (task.completed) span.classList.add('task-completed');
      span.textContent = task.title;

      // Edit button (wired in task 7.1)
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.dataset.id = task.id;
      editBtn.classList.add('task-edit-btn');
      editBtn.setAttribute('aria-label', 'Edit task');

      // ── Edit button click handler (Req 5.1, 5.2) ──────────────────────
      editBtn.addEventListener('click', () => {
        // Swap span for an inline input pre-filled with the current title
        const titleSpan = li.querySelector('.task-title');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = task.title;
        input.classList.add('task-edit-input');
        input.setAttribute('aria-label', 'Edit task title');

        // Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.textContent = 'Confirm';
        confirmBtn.classList.add('task-confirm-btn');
        confirmBtn.setAttribute('aria-label', 'Confirm edit');

        // Hide original span and edit button; insert input + confirm
        titleSpan.style.display = 'none';
        editBtn.style.display = 'none';
        li.insertBefore(input, editBtn);
        li.insertBefore(confirmBtn, editBtn);
        input.focus();

        // Shared confirm logic
        function confirmEdit() {
          const trimmed = input.value.trim();
          if (trimmed.length === 0) {
            // Req 5.4 — discard: restore original display without saving
            input.remove();
            confirmBtn.remove();
            titleSpan.style.display = '';
            editBtn.style.display = '';
          } else {
            // Req 5.3, 5.5 — valid value: delegate to editTask (saves + renders)
            editTask(task.id, trimmed);
          }
        }

        confirmBtn.addEventListener('click', confirmEdit);

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') confirmEdit();
        });
      });

      // Delete button (wired in task 7.5)
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.dataset.id = task.id;
      deleteBtn.classList.add('task-delete-btn');
      deleteBtn.setAttribute('aria-label', 'Delete task');
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  }

  // ── Core operations ────────────────────────────────────────────────────

  /**
   * Add a new task.
   * Trims the title; ignores empty submissions and titles exceeding 255 chars.
   * Persists to Storage before rendering (Req 4.5, 7.1).
   * @param {string} title
   */
  function addTask(title) {
    const trimmed = String(title).trim();

    if (trimmed.length === 0) {
      // Req 4.3 — keep focus on input, do nothing else
      const input = document.getElementById('todo-input');
      if (input) input.focus();
      return;
    }

    if (trimmed.length > 255) {
      // Silent ignore per spec (no hard error message required for length)
      return;
    }

    const task = {
      id: generateId(),
      title: trimmed,
      completed: false,
    };

    tasks.push(task);
    Storage.saveTasks(tasks);   // persist before render (Req 4.5, 7.1)
    render();

    // Clear the input field after a successful add
    const input = document.getElementById('todo-input');
    if (input) {
      input.value = '';
      input.focus();
    }
  }

  // ── Edit task ──────────────────────────────────────────────────────────

  /**
   * Update the title of an existing task.
   * Trims newTitle; silently discards the call if the trimmed value is empty
   * or if no task with the given id exists.
   * Persists to Storage and re-renders on success (Req 5.3, 5.5).
   *
   * @param {string} id       — id of the task to edit
   * @param {string} newTitle — replacement title (will be trimmed)
   */
  function editTask(id, newTitle) {
    const trimmed = String(newTitle).trim();

    // Req 5.4 — discard empty edits without touching Storage
    if (trimmed.length === 0) return;

    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return;  // task not found — no-op

    tasks[index].title = trimmed;
    Storage.saveTasks(tasks);  // Req 5.5 — persist before render
    render();
  }

  // ── Delete task ────────────────────────────────────────────────────────

  /**
   * Remove a task by id.
   * Splices from the in-memory array, persists to Storage.
   * On Storage failure, restores the item at its original index,
   * re-renders, and shows an inline error (Req 6.5, 6.6).
   * @param {string} id
   */
  function deleteTask(id) {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return;

    const [removed] = tasks.splice(index, 1);   // remove from in-memory array

    const success = Storage.saveTasks(tasks);
    if (!success) {
      // Req 6.6 — restore at original index, re-render, show error
      tasks.splice(index, 0, removed);
      render();
      showError('Could not delete. Please try again.');
      return;
    }

    render();
  }

  // ── Toggle completion ─────────────────────────────────────────────────

  /**
   * Flip the completed state of a task in-memory, persist to Storage,
   * and re-render. On storage failure, revert the flip and show an error.
   * Persists within 500ms (synchronous — completes immediately). (Req 6.1, 6.2, 6.3)
   * @param {string} id
   */
  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;  // flip in-memory

    const success = Storage.saveTasks(tasks);
    if (!success) {
      // Revert and show error (Req 6.3)
      task.completed = !task.completed;
      render();
      showError('Could not save. Please try again.');
      return;
    }

    render();  // re-render to apply/remove completed styling
  }

  // ── Initialisation ─────────────────────────────────────────────────────

  /**
   * Load persisted tasks, detect error conditions, render, and attach
   * the Add button / Enter-key listeners.
   *
   * Error handling (Req 7.3):
   *   - Storage unavailable → show "Storage is unavailable" message
   *   - Storage available but raw value exists and is not a JSON array
   *     → show "data could not be read" message
   */
  function init() {
    showError('');  // clear any stale error

    if (!Storage.isAvailable()) {
      // Req 7.3 — storage unavailable
      showError('Storage is unavailable. Tasks will not be saved.');
    } else {
      // Check for corrupted data: raw value exists but can't be parsed as an array
      const raw = localStorage.getItem('tdld_tasks');
      if (raw !== null) {
        let isValidArray = false;
        try {
          const parsed = JSON.parse(raw);
          isValidArray = Array.isArray(parsed);
        } catch (_e) {
          isValidArray = false;
        }
        if (!isValidArray) {
          // Req 7.3 — data unreadable
          showError('Saved task data could not be read and has been reset.');
        }
      }
    }

    // Load tasks (Storage already falls back to [] on any error — Req 10.2)
    tasks = Storage.loadTasks();
    render();

    // Attach event listeners
    const addBtn = document.getElementById('todo-add-btn');
    const input  = document.getElementById('todo-input');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        addTask(input ? input.value : '');
      });
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          addTask(input.value);
        }
      });
    }
  }

  return { init, addTask, editTask, deleteTask, render, generateId };
})();

/* ─── QUICK LINKS WIDGET ───────────────────────────────────────────────── */

/**
 * @typedef {Object} Link
 * @property {string} id    — Unique identifier
 * @property {string} label — Display label, 1–50 characters
 * @property {string} url   — Absolute URL beginning with http:// or https://, 1–2048 characters
 */

const QuickLinks = (() => {
  /** @type {Link[]} In-memory source of truth */
  let links = [];

  // ── Inline error helper ────────────────────────────────────────────────

  /**
   * Display a message in the #links-error element.
   * Pass an empty string to clear any existing message.
   * @param {string} msg
   */
  function showError(msg) {
    const el = document.getElementById('links-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? '' : 'none';
  }

  // ── ID generation ──────────────────────────────────────────────────────

  /**
   * Generate a unique identifier for a new link.
   * Uses `crypto.randomUUID()` when available, falls back to Date.now().
   * @returns {string}
   */
  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString();
  }

  // ── Pure validation ────────────────────────────────────────────────────

  /**
   * Validate a link label and URL.
   * Pure function — no side effects, no DOM access.
   *
   * Rules:
   *   - label trimmed length must be 1–50 characters
   *   - url must start with "http://" or "https://"
   *   - url length must be ≤ 2048 characters
   *
   * @param {string} label
   * @param {string} url
   * @returns {{ valid: boolean, field: string|null, message: string|null }}
   */
  function validateLink(label, url) {
    const trimmedLabel = String(label).trim();

    if (trimmedLabel.length === 0 || trimmedLabel.length > 50) {
      return {
        valid: false,
        field: 'label',
        message: 'Label must be 1–50 characters.',
      };
    }

    if (!String(url).startsWith('http://') && !String(url).startsWith('https://')) {
      return {
        valid: false,
        field: 'url',
        message: 'URL must start with http:// or https://.',
      };
    }

    if (String(url).length > 2048) {
      return {
        valid: false,
        field: 'url',
        message: 'URL must be 2048 characters or fewer.',
      };
    }

    return { valid: true, field: null, message: null };
  }

  // ── Renderer ───────────────────────────────────────────────────────────

  /**
   * Full re-render of #links-list.
   * Clears the container and rebuilds one item per link.
   * Each item is a wrapper <div> containing:
   *   - A <button data-url> whose text is the link label — opens URL in new tab
   *   - A Delete <button> with class "link-delete-btn" and data-id
   *
   * Using a container div avoids the invalid button-in-button HTML pattern.
   */
  function render() {
    const list = document.getElementById('links-list');
    if (!list) return;

    list.innerHTML = '';

    links.forEach((link) => {
      // Wrapper div
      const wrapper = document.createElement('div');
      wrapper.classList.add('link-item');

      // Main link button — opens URL in a new tab
      const linkBtn = document.createElement('button');
      linkBtn.type = 'button';
      linkBtn.dataset.url = link.url;
      linkBtn.textContent = link.label;
      linkBtn.classList.add('link-btn');
      linkBtn.addEventListener('click', () => {
        window.open(link.url, '_blank', 'noopener,noreferrer');
      });

      // Delete button — wired to deleteLink (full implementation in task 10.1)
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.dataset.id = link.id;
      deleteBtn.classList.add('link-delete-btn');
      deleteBtn.setAttribute('aria-label', `Delete link "${link.label}"`);
      deleteBtn.addEventListener('click', () => deleteLink(link.id));

      wrapper.appendChild(linkBtn);
      wrapper.appendChild(deleteBtn);
      list.appendChild(wrapper);
    });
  }

  // ── Core operations ────────────────────────────────────────────────────

  /**
   * Remove a link by id.
   * Splices from the in-memory array, persists to Storage.
   * On Storage failure, restores the item at its original index,
   * re-renders, and shows an inline error (Req 9.3).
   * @param {string} id
   */
  function deleteLink(id) {
    const index = links.findIndex((l) => l.id === id);
    if (index === -1) return;

    const [removed] = links.splice(index, 1);   // remove from in-memory array

    const success = Storage.saveLinks(links);
    if (!success) {
      // Req 9.3 — restore and re-render so panel stays consistent with persisted data
      links.splice(index, 0, removed);
      render();
      showError('Could not delete link. Please try again.');
      return;
    }

    render();
  }

  /**
   * Add a new link.
   *
   * Order of checks:
   *   1. Enforce 20-link cap (separate message, per Req 8.7)
   *   2. Validate label and URL via validateLink
   *   3. Generate id, push to in-memory array
   *   4. Persist via Storage.saveLinks — on failure, revert and show error
   *   5. Re-render and clear inputs
   *
   * @param {string} label
   * @param {string} url
   */
  function addLink(label, url) {
    // Step 1: 20-link cap (Req 8.7)
    if (links.length >= 20) {
      showError('Maximum of 20 links reached.');
      return;
    }

    // Step 2: Validate
    const result = validateLink(label.trim(), url);
    if (!result.valid) {
      showError(result.message);
      return;
    }

    // Step 3: Build and push new link
    const link = {
      id: generateId(),
      label: label.trim(),
      url: url,
    };

    links.push(link);

    // Step 4: Persist — revert on failure
    const success = Storage.saveLinks(links);
    if (!success) {
      links.splice(links.length - 1, 1);  // remove the just-pushed item
      showError('Could not save link. Please try again.');
      return;
    }

    // Step 5: Re-render and clear inputs
    showError('');
    render();

    const labelInput = document.getElementById('links-label-input');
    const urlInput   = document.getElementById('links-url-input');
    if (labelInput) labelInput.value = '';
    if (urlInput)   urlInput.value   = '';
  }

  // ── Initialisation ─────────────────────────────────────────────────────

  /**
   * Load persisted links, render, and attach event listeners.
   *
   * Listeners:
   *   - Click on #links-add-btn → addLink
   *   - Enter key on #links-url-input → addLink
   */
  function init() {
    links = Storage.loadLinks();
    render();

    const addBtn    = document.getElementById('links-add-btn');
    const labelInput = document.getElementById('links-label-input');
    const urlInput   = document.getElementById('links-url-input');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        addLink(
          labelInput ? labelInput.value : '',
          urlInput   ? urlInput.value   : ''
        );
      });
    }

    // Also trigger addLink on Enter key within the URL input field
    if (urlInput) {
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          addLink(
            labelInput ? labelInput.value : '',
            urlInput.value
          );
        }
      });
    }
  }

  return { init, validateLink, addLink, deleteLink, render };
})();

/* ─── BOOTSTRAP ─────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  Storage.init();
  Greeting.init();
  FocusTimer.init();
  TodoList.init();
  QuickLinks.init();
});

 const darkModeBtn = document .getElementById ("drakModeBtn");
 
 darkModeBtn.addEventListener("click", () => {
    document.body.classList.toggle("drak-mode");

 });
 
