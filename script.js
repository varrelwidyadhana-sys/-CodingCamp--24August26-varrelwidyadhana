/* ============================================================
   LIFE DASHBOARD — script.js
   Vanilla JS · LocalStorage · No dependencies

   Features:
   - Live clock & time-based greeting
   - 25-min Focus Timer
   - To-Do List  → duplicate prevention · sort (A-Z, Z-A, pending, done)
   - Quick Links (persisted)
   - Light / Dark mode toggle (persisted)
   ============================================================ */

'use strict';

/* ============================================================
   HELPERS
   ============================================================ */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}


/* ============================================================
   1. LIGHT / DARK MODE
   ============================================================ */
const THEME_KEY   = 'dashboard_theme';
const htmlEl      = document.documentElement;
const btnTheme    = document.getElementById('btn-theme');
const themeIcon   = document.getElementById('theme-icon');
const themeLabel  = document.getElementById('theme-label');

function applyTheme(theme) {
  htmlEl.setAttribute('data-theme', theme);
  if (theme === 'light') {
    themeIcon.textContent  = '🌙';
    themeLabel.textContent = 'Dark Mode';
  } else {
    themeIcon.textContent  = '☀️';
    themeLabel.textContent = 'Light Mode';
  }
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = htmlEl.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

btnTheme.addEventListener('click', toggleTheme);

// Restore saved preference (fall back to dark)
applyTheme(localStorage.getItem(THEME_KEY) || 'dark');


/* ============================================================
   2. CLOCK & GREETING
   ============================================================ */
const clockEl    = document.getElementById('clock');
const dateEl     = document.getElementById('date');
const greetingEl = document.getElementById('greeting');

function updateClock() {
  const now = new Date();
  const h   = String(now.getHours()).padStart(2, '0');
  const m   = String(now.getMinutes()).padStart(2, '0');
  const s   = String(now.getSeconds()).padStart(2, '0');

  clockEl.textContent = `${h}:${m}:${s}`;

  dateEl.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });

  const hour = now.getHours();
  let msg;
  if      (hour >= 5  && hour < 12) msg = '☀️ Good Morning';
  else if (hour >= 12 && hour < 17) msg = '🌤️ Good Afternoon';
  else if (hour >= 17 && hour < 21) msg = '🌇 Good Evening';
  else                               msg = '🌙 Good Night';

  greetingEl.textContent = msg;
}

updateClock();
setInterval(updateClock, 1000);


/* ============================================================
   3. FOCUS TIMER  (25-min Pomodoro)
   ============================================================ */
const TIMER_DEFAULT = 25 * 60;

const timerDisplay = document.getElementById('timer-display');
const btnStart     = document.getElementById('btn-start');
const btnStop      = document.getElementById('btn-stop');
const btnReset     = document.getElementById('btn-reset');

let timerSeconds  = TIMER_DEFAULT;
let timerInterval = null;
let timerRunning  = false;

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderTimer() {
  timerDisplay.textContent = formatTime(timerSeconds);
}

function startTimer() {
  if (timerRunning) return;
  timerRunning      = true;
  btnStart.disabled = true;

  timerInterval = setInterval(() => {
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning      = false;
      btnStart.disabled = false;
      timerDisplay.textContent   = '00:00';
      timerDisplay.style.color   = 'var(--danger)';
      setTimeout(() => { timerDisplay.style.color = ''; }, 2500);
      return;
    }
    timerSeconds--;
    renderTimer();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning      = false;
  btnStart.disabled = false;
}

function resetTimer() {
  stopTimer();
  timerSeconds           = TIMER_DEFAULT;
  timerDisplay.style.color = '';
  renderTimer();
}

btnStart.addEventListener('click', startTimer);
btnStop.addEventListener('click',  stopTimer);
btnReset.addEventListener('click', resetTimer);

renderTimer();


/* ============================================================
   4. TO-DO LIST
   ============================================================ */
const TODO_KEY     = 'dashboard_todos';
const SORT_KEY     = 'dashboard_sort';

const todoInput    = document.getElementById('todo-input');
const btnAddTodo   = document.getElementById('btn-add-todo');
const todoListEl   = document.getElementById('todo-list');
const sortSelect   = document.getElementById('sort-select');
const todoWarning  = document.getElementById('todo-warning');

/**
 * @typedef {{ id: string, text: string, done: boolean }} TodoItem
 */

function loadTodos() {
  try { return JSON.parse(localStorage.getItem(TODO_KEY)) || []; }
  catch { return []; }
}

function saveTodos(todos) {
  localStorage.setItem(TODO_KEY, JSON.stringify(todos));
}

/* ── Sort ───────────────────────────────────────────────── */

/**
 * Return a sorted *copy* of the array. Original order in storage
 * is never changed so "Default" always restores insertion order.
 * @param {TodoItem[]} todos
 * @param {string} mode
 * @returns {TodoItem[]}
 */
function sortedTodos(todos, mode) {
  const copy = [...todos];
  switch (mode) {
    case 'az':
      return copy.sort((a, b) =>
        a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }));

    case 'za':
      return copy.sort((a, b) =>
        b.text.localeCompare(a.text, undefined, { sensitivity: 'base' }));

    case 'pending':
      // pending (done=false) first, then done
      return copy.sort((a, b) => Number(a.done) - Number(b.done));

    case 'done':
      // done (done=true) first, then pending
      return copy.sort((a, b) => Number(b.done) - Number(a.done));

    default:
      return copy; // insertion order
  }
}

/* ── Duplicate check ──────────────────────────────────── */

/**
 * Check if text already exists in the todo list (case-insensitive).
 * @param {string} text
 * @param {TodoItem[]} todos
 * @returns {boolean}
 */
function isDuplicate(text, todos) {
  const norm = text.trim().toLowerCase();
  return todos.some(t => t.text.trim().toLowerCase() === norm);
}

function showWarning(msg) {
  todoWarning.textContent = msg;
  // Shake the input to draw attention
  todoInput.classList.remove('shake');
  // Force reflow so the animation re-triggers
  void todoInput.offsetWidth;
  todoInput.classList.add('shake');
  setTimeout(() => {
    todoWarning.textContent = '';
    todoInput.classList.remove('shake');
  }, 2000);
}

/* ── Render ───────────────────────────────────────────── */

function createTodoElement(todo, todos) {
  const li = document.createElement('li');
  li.className  = 'todo-item';
  li.dataset.id = todo.id;

  // Checkbox
  const checkbox    = document.createElement('input');
  checkbox.type     = 'checkbox';
  checkbox.checked  = todo.done;
  checkbox.setAttribute('aria-label', 'Mark task as done');
  checkbox.addEventListener('change', () => {
    // Mutate the source array directly so save/re-render is consistent
    const all = loadTodos();
    const t   = all.find(x => x.id === todo.id);
    if (t) t.done = checkbox.checked;
    saveTodos(all);
    renderTodos(all);
  });

  // Text label (double-click → inline edit)
  const span       = document.createElement('span');
  span.className   = 'task-text' + (todo.done ? ' done' : '');
  span.textContent = todo.text;
  span.title       = 'Double-click to edit';
  span.addEventListener('dblclick', () => startEdit(li, span, todo));

  // Delete
  const btnDel       = document.createElement('button');
  btnDel.className   = 'btn btn-delete';
  btnDel.textContent = 'Delete';
  btnDel.setAttribute('aria-label', `Delete task: ${todo.text}`);
  btnDel.addEventListener('click', () => {
    const updated = loadTodos().filter(t => t.id !== todo.id);
    saveTodos(updated);
    renderTodos(updated);
  });

  li.append(checkbox, span, btnDel);
  return li;
}

function startEdit(li, span, todo) {
  const input     = document.createElement('input');
  input.type      = 'text';
  input.className = 'task-edit-input';
  input.value     = todo.text;
  input.maxLength = 120;

  function commitEdit() {
    const val = input.value.trim();
    if (!val) {
      renderTodos(loadTodos());
      return;
    }
    const all = loadTodos();
    // Duplicate check: ignore the item being edited
    const others  = all.filter(t => t.id !== todo.id);
    if (isDuplicate(val, others)) {
      showWarning(`"${val}" already exists.`);
      renderTodos(all);
      return;
    }
    const t = all.find(x => x.id === todo.id);
    if (t && val !== t.text) {
      t.text = val;
      saveTodos(all);
    }
    renderTodos(all);
  }

  input.addEventListener('blur',    commitEdit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  input.blur();
    if (e.key === 'Escape') { renderTodos(loadTodos()); }
  });

  li.replaceChild(input, span);
  input.focus();
  input.select();
}

function renderTodos(todos) {
  const mode    = sortSelect.value;
  const display = sortedTodos(todos, mode);
  todoListEl.innerHTML = '';
  display.forEach(todo => {
    todoListEl.appendChild(createTodoElement(todo, todos));
  });
}

/* ── Add ──────────────────────────────────────────────── */

function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;

  const todos = loadTodos();

  // ── Challenge 4: Prevent duplicates ──────────────────
  if (isDuplicate(text, todos)) {
    showWarning(`"${text}" is already in your list.`);
    return;
  }

  todos.push({ id: generateId(), text, done: false });
  saveTodos(todos);
  renderTodos(todos);

  todoInput.value = '';
  todoInput.focus();
}

btnAddTodo.addEventListener('click', addTodo);
todoInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTodo();
});

// ── Challenge 5: Sort — persist & react to changes ────
sortSelect.value = localStorage.getItem(SORT_KEY) || 'default';
sortSelect.addEventListener('change', () => {
  localStorage.setItem(SORT_KEY, sortSelect.value);
  renderTodos(loadTodos());
});

// Initial render
renderTodos(loadTodos());


/* ============================================================
   5. QUICK LINKS
   ============================================================ */
const LINKS_KEY     = 'dashboard_links';
const linkNameInput = document.getElementById('link-name-input');
const linkUrlInput  = document.getElementById('link-url-input');
const btnAddLink    = document.getElementById('btn-add-link');
const linksListEl   = document.getElementById('links-list');

/**
 * @typedef {{ id: string, name: string, url: string }} LinkItem
 */

function loadLinks() {
  try { return JSON.parse(localStorage.getItem(LINKS_KEY)) || []; }
  catch { return []; }
}

function saveLinks(links) {
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

function normaliseUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return 'https://' + trimmed;
}

function flagInput(el) {
  el.style.borderColor = 'var(--danger)';
  el.focus();
  setTimeout(() => { el.style.borderColor = ''; }, 1200);
}

function createLinkElement(link, links) {
  const pill = document.createElement('div');
  pill.className = 'link-pill';

  const a   = document.createElement('a');
  a.href    = link.url;
  a.target  = '_blank';
  a.rel     = 'noopener noreferrer';
  a.textContent = link.name;

  const btnRemove = document.createElement('button');
  btnRemove.className   = 'btn-remove-link';
  btnRemove.textContent = '×';
  btnRemove.setAttribute('aria-label', `Remove link: ${link.name}`);
  btnRemove.addEventListener('click', () => {
    const updated = links.filter(l => l.id !== link.id);
    saveLinks(updated);
    renderLinks(updated);
  });

  pill.append(a, btnRemove);
  return pill;
}

function renderLinks(links) {
  linksListEl.innerHTML = '';
  links.forEach(link => {
    linksListEl.appendChild(createLinkElement(link, links));
  });
}

function addLink() {
  const name = linkNameInput.value.trim();
  const url  = normaliseUrl(linkUrlInput.value);

  if (!name) { flagInput(linkNameInput); return; }
  if (!url)  { flagInput(linkUrlInput);  return; }

  const links = loadLinks();
  links.push({ id: generateId(), name, url });
  saveLinks(links);
  renderLinks(links);

  linkNameInput.value = '';
  linkUrlInput.value  = '';
  linkNameInput.focus();
}

btnAddLink.addEventListener('click', addLink);
linkUrlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addLink();
});

// Initial render
renderLinks(loadLinks());
