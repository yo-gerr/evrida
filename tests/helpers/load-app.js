'use strict';
// Test loader for Evrida's application script.
//
// The application logic lives in app.js (extracted from the former inline
// <script> block). This loader reads app.js at test time and appends a small
// export hook (string surgery on the extracted text only; app.js itself is
// never modified) that exposes the app's pure helpers to the test suite.
//
// DOM and browser APIs are satisfied with minimal stubs so the script can
// execute its normal startup path (load -> applyTheme -> render) inside Node.

const fs = require('node:fs');
const path = require('node:path');

const APP_PATH = path.join(__dirname, '..', '..', 'app.js');

const EXPORTED_NAMES = [
  'esc', 'localKey', 'today', 'dateFrom', 'shift', 'daysBetween',
  'goal', 'count', 'completed', 'scheduled', 'fmt', 'pct',
  'habitUnit', 'isTimeHabit', 'formatMinutes', 'hoursLabel', 'habitMinutes',
  'minutesInLastDays', 'clockText', 'FOCUS_PRESETS', 'FOCUS_DEFAULTS',
  'completeFocusSession', 'resetFocusTimer',
  'defaultState', 'normalize', 'currentStreak', 'bestStreak', 'eligible',
  'stats', 'completionStats', 'recoveryStats', 'quoteForToday',
  'carryPending', 'intentionText', 'cueSentence', 'renderFocus', 'renderJournal', 'renderSettings', 'render', '$', 'KEY', 'VERSION', 'CATEGORIES', 'COLORS', 'EMOJIS', 'QUOTES',
];

function makeElement() {
  return {
    dataset: {},
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    innerHTML: '',
    textContent: '',
    value: '',
    title: '',
    content: '',
    hidden: false,
    checked: false,
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    getAttribute() { return null; },
    focus() {},
    click() {},
    showModal() {},
    close() {},
    append() {},
    remove() {},
    setSelectionRange() {},
    querySelector() { return makeElement(); },
    querySelectorAll() { return []; },
    closest() { return null; },
  };
}

function makeDocument() {
  const cache = new Map();
  return {
    documentElement: makeElement(),
    body: makeElement(),
    querySelector(selector) {
      if (!cache.has(selector)) cache.set(selector, makeElement());
      return cache.get(selector);
    },
    querySelectorAll() { return []; },
    createElement() { return makeElement(); },
    addEventListener() {},
  };
}

function makeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
    setItem: (k, v) => { store.set(String(k), String(v)); },
    removeItem: (k) => { store.delete(String(k)); },
    clear: () => { store.clear(); },
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}

function makeWindow() {
  return {
    addEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  };
}

function loadApp() {
  const code = fs.readFileSync(APP_PATH, 'utf8');
  const terminator = code.lastIndexOf('})();');
  if (terminator < 0) throw new Error('Could not find the IIFE terminator in app.js.');
  const hook = `;globalThis.__evridaInternals={${EXPORTED_NAMES.join(',')},getState:()=>state,setState:v=>{state=v},getActivePage:()=>activePage,setActivePage:v=>{activePage=v},getSettingsView:()=>settingsView,setSettingsView:v=>{settingsView=v},getFocusTimer:()=>focusTimer,setFocusTimer:v=>Object.assign(focusTimer,v)};`;
  const instrumented = code.slice(0, terminator) + hook + code.slice(terminator);

  const fn = new Function('document', 'localStorage', 'window', instrumented);
  fn(makeDocument(), makeLocalStorage(), makeWindow());

  const internals = globalThis.__evridaInternals;
  delete globalThis.__evridaInternals;
  if (!internals) throw new Error('App internals export hook failed.');
  return internals;
}

// Build a fully-formed habit record for pure-function tests.
function makeHabit(overrides = {}) {
  return {
    id: 'h1',
    name: 'Test habit',
    category: 'General',
    goal: 1,
    start: '2026-01-01',
    days: [0, 1, 2, 3, 4, 5, 6],
    icon: '\u{1F4DA}',
    color: '#526BD8',
    done: {},
    ...overrides,
  };
}

// Pin the mocked clock to local noon of a given date so today() returns it
// in any timezone. Must be called inside a test's (t) callback.
function setToday(t, year, month, day) {
  const epoch = new Date(year, month - 1, day, 12).getTime();
  t.mock.timers.enable({ apis: ['Date'] });
  t.mock.timers.setTime(epoch);
}

module.exports = { loadApp, makeHabit, setToday };