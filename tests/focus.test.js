'use strict';
// Time habits and the Focus timer. Habits track either a count (reps, pages,
// glasses) or minutes. Both write the same integer into `done[date]`, so the
// only new logic to verify is unit detection, display formatting, the minutes
// total used by the Steam-style library, and the validation boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, makeHabit, setToday } = require('./helpers/load-app');

const {
  habitUnit,
  isTimeHabit,
  formatMinutes,
  hoursLabel,
  habitMinutes,
  minutesInLastDays,
  clockText,
  FOCUS_PRESETS,
  completeFocusSession,
  resetFocusTimer,
  normalize,
  renderFocus,
  setState,
  getState,
  getFocusTimer,
  setFocusTimer,
  today,
} = loadApp();

// --- Unit detection --------------------------------------------------------

test('habitUnit defaults to count and recognises minutes', () => {
  assert.equal(habitUnit({}), 'count');
  assert.equal(habitUnit({ unit: 'count' }), 'count');
  assert.equal(habitUnit({ unit: 'minutes' }), 'minutes');
  assert.equal(habitUnit({ unit: 'bogus' }), 'count');
});

test('isTimeHabit is true only for minute habits', () => {
  assert.equal(isTimeHabit({}), false);
  assert.equal(isTimeHabit({ unit: 'minutes' }), true);
  assert.equal(isTimeHabit({ unit: 'count' }), false);
});

// --- Presets -----------------------------------------------------------------

test('Focus presets stay inside the documented ranges', () => {
  assert.ok(FOCUS_PRESETS.length >= 3);
  for (const p of FOCUS_PRESETS) {
    assert.ok(p.id && p.name);
    assert.ok(p.focus >= 1 && p.focus <= 180);
    assert.ok(p.short >= 1 && p.short <= 60);
    assert.ok(p.long >= 1 && p.long <= 90);
    assert.ok(p.every >= 2 && p.every <= 8);
  }
});

// --- Display formatting ----------------------------------------------------

test('formatMinutes reads naturally below and above an hour', () => {
  assert.equal(formatMinutes(0), '0m');
  assert.equal(formatMinutes(-5), '0m');
  assert.equal(formatMinutes(25), '25m');
  assert.equal(formatMinutes(59), '59m');
  assert.equal(formatMinutes(60), '1h');
  assert.equal(formatMinutes(90), '1h 30m');
  assert.equal(formatMinutes(125), '2h 5m');
  assert.equal(formatMinutes('30'), '30m');
  assert.equal(formatMinutes(null), '0m');
});

test('hoursLabel keeps a Steam-style decimal but never a trailing .0', () => {
  assert.equal(hoursLabel(0), '0 hrs');
  assert.equal(hoursLabel(30), '0.5 hrs');
  assert.equal(hoursLabel(60), '1 hrs');
  assert.equal(hoursLabel(90), '1.5 hrs');
  assert.equal(hoursLabel(600), '10 hrs');
  assert.equal(hoursLabel(1104), '18.4 hrs');
});

test('clockText pads minutes and seconds', () => {
  assert.equal(clockText(0), '00:00');
  assert.equal(clockText(59), '00:59');
  assert.equal(clockText(61), '01:01');
  assert.equal(clockText(1500), '25:00');
  assert.equal(clockText(3600), '60:00');
});

// --- Minutes totals --------------------------------------------------------

test('habitMinutes sums only time habits and ignores count habits', () => {
  const time = makeHabit({ unit: 'minutes', done: { '2026-01-14': 30, '2026-01-15': 45 } });
  assert.equal(habitMinutes(time), 75);
  assert.equal(habitMinutes(makeHabit({ done: { '2026-01-15': 3 } })), 0);
  assert.equal(habitMinutes(makeHabit({ unit: 'minutes' })), 0);
});

test('habitMinutes tolerates string and negative values defensively', () => {
  const h = makeHabit({ unit: 'minutes', done: { '2026-01-14': '20', '2026-01-15': -5 } });
  assert.equal(habitMinutes(h), 20);
});

test('minutesInLastDays counts today and the six days before it', (t) => {
  setToday(t, 2026, 1, 15);
  const h = makeHabit({
    unit: 'minutes',
    done: {
      '2026-01-15': 25, // today
      '2026-01-14': 30, // yesterday
      '2026-01-08': 60, // seven days ago — outside the window
      '2026-01-07': 120, // eight days ago — outside the window
    },
  });
  assert.equal(minutesInLastDays(h, 7), 55);
  assert.equal(minutesInLastDays(makeHabit({ done: { '2026-01-15': 9 } }), 7), 0);
});

// --- Persistence boundary --------------------------------------------------

test('normalize keeps a minutes habit and its minutes goal', () => {
  const h = normalize({
    habits: [{ name: 'Study', unit: 'minutes', goal: 60, done: { '2026-01-15': 45 } }],
  }).habits[0];
  assert.equal(h.unit, 'minutes');
  assert.equal(h.goal, 60);
  assert.equal(h.done['2026-01-15'], 45);
});

test('normalize leaves count habits without a unit field', () => {
  const h = normalize({ habits: [{ name: 'Push-ups', goal: 10 }] }).habits[0];
  assert.equal(h.unit, undefined);
  assert.equal('unit' in h, false);
});

test('normalize accepts the full minutes range and rejects beyond it', () => {
  assert.equal(
    normalize({ habits: [{ name: 'Deep work', unit: 'minutes', goal: 600 }] }).habits[0].goal,
    600
  );
  assert.throws(
    () => normalize({ habits: [{ name: 'Too long', unit: 'minutes', goal: 601 }] }),
    /invalid target/
  );
  assert.throws(
    () => normalize({ habits: [{ name: 'Push-ups', goal: 100 }] }),
    /invalid target/
  );
});

test('normalize sanitizes session records and clamps minutes', () => {
  const sessions = normalize({
    habits: [],
    sessions: [
      { id: 'a', habitId: 'h1', date: '2026-01-15', minutes: 5000, at: 5, kind: 'manual', note: '  hi  ' },
      { id: 'b', date: '2026-01-14', minutes: 0 },
      { date: 'not-a-date', minutes: 10 },
      { date: '2026-01-13', minutes: 'nope' },
      null,
    ],
  }).sessions;
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].minutes, 1440);
  assert.equal(sessions[0].kind, 'manual');
  assert.equal(sessions[0].note, 'hi');
  assert.equal(sessions[1].minutes, 1);
  assert.equal(sessions[1].kind, 'focus');
});

test('normalize clamps Focus settings into documented ranges', () => {
  const focus = normalize({
    habits: [],
    settings: { theme: 'dark', focus: { focus: 999, short: 0, long: 200, every: 99, sound: false } },
  }).settings.focus;
  assert.deepEqual(focus, { focus: 180, short: 1, long: 90, every: 8, sound: false, notify: false, autoBreak: true, autoFocus: false });
});

test('normalize preserves Focus notification and auto-start flags', () => {
  const focus = normalize({
    habits: [],
    settings: { focus: { notify: true, autoBreak: false, autoFocus: true } },
  }).settings.focus;
  assert.equal(focus.notify, true);
  assert.equal(focus.autoBreak, false);
  assert.equal(focus.autoFocus, true);
});

test('normalize treats non-boolean Focus flags as defaults', () => {
  const focus = normalize({
    habits: [],
    settings: { focus: { notify: 'yes', autoBreak: 'no', autoFocus: 1 } },
  }).settings.focus;
  assert.equal(focus.notify, false);
  assert.equal(focus.autoBreak, true);
  assert.equal(focus.autoFocus, false);
});

test('normalize defaults Focus settings when missing', () => {
  const focus = normalize({ habits: [] }).settings.focus;
  assert.deepEqual(focus, { focus: 25, short: 5, long: 15, every: 4, sound: true, notify: false, autoBreak: true, autoFocus: false });
});

// --- Focus page smoke ------------------------------------------------------

test('renderFocus builds the timer and an empty time library', () => {
  setState({
    version: 11,
    habits: [],
    sessions: [],
    settings: { theme: 'system', focus: { focus: 25, short: 5, long: 15, every: 4, sound: true, notify: false, autoBreak: true, autoFocus: false } },
  });
  const html = renderFocus();
  assert.match(html, /id="focusClock"/);
  assert.match(html, /Your time library/);
  assert.match(html, /No time habits yet/);
  assert.match(html, /25 min focus/);
  assert.match(html, /Classic/);
});

test('renderFocus lists time habits with hours and excludes count habits', (t) => {
  setToday(t, 2026, 1, 15);
  setState({
    version: 11,
    habits: [
      makeHabit({
        id: 'study',
        name: 'Study',
        unit: 'minutes',
        goal: 60,
        done: { '2026-01-15': 30, '2026-01-14': 60 },
      }),
      makeHabit({ id: 'pushups', name: 'Push-ups', goal: 10, done: { '2026-01-15': 10 } }),
    ],
    sessions: [
      { id: 's1', habitId: 'study', date: '2026-01-15', minutes: 30, at: 1, kind: 'focus', note: '' },
    ],
    settings: { theme: 'system', focus: { focus: 25, short: 5, long: 15, every: 4, sound: true, notify: false, autoBreak: true, autoFocus: false } },
  });
  const html = renderFocus();
  assert.match(html, /<h4>Study<\/h4>/);
  assert.match(html, /1\.5 hrs/);
  assert.doesNotMatch(html, /<h4>Push-ups<\/h4>/);
  assert.match(html, /Recent sessions/);
});

// --- Auto-start behaviour --------------------------------------------------

function focusState(focus = {}) {
  return normalize({
    habits: [
      makeHabit({ id: 'study', name: 'Study', unit: 'minutes', goal: 60 }),
    ],
    settings: { focus: { focus: 25, short: 5, long: 15, every: 4, ...focus } },
  });
}

// completeFocusSession starts a new interval for auto-start. Mock the toast
// timeout so the suite does not wait 4.5 seconds for it to drain, then always
// reset the timer to clear the interval.
function completeInTest(t, state) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  setState(state);
  try {
    completeFocusSession();
    return { timer: { ...getFocusTimer() }, state: getState() };
  } finally {
    resetFocusTimer();
  }
}

test('a completed focus block auto-starts a short break and credits minutes', (t) => {
  setFocusTimer({
    mode: 'focus',
    habitId: 'study',
    running: true,
    endsAt: Date.now() + 1000,
    remaining: 0,
    cycle: 0,
    active: true,
  });
  const { timer, state } = completeInTest(t, focusState());
  assert.equal(timer.mode, 'short');
  assert.equal(timer.running, true);
  assert.equal(timer.active, true);
  assert.equal(timer.remaining, 5 * 60);
  assert.equal(state.sessions.length, 1);
  assert.equal(state.sessions[0].minutes, 25);
  assert.equal(state.sessions[0].habitId, 'study');
  assert.equal(state.habits[0].done[today()], 25);
});

test('turning autoBreak off leaves a finished focus block waiting for Start', (t) => {
  setFocusTimer({
    mode: 'focus',
    habitId: 'study',
    running: true,
    endsAt: Date.now() + 1000,
    remaining: 0,
    cycle: 0,
    active: true,
  });
  const { timer } = completeInTest(t, focusState({ autoBreak: false }));
  assert.equal(timer.mode, 'short');
  assert.equal(timer.running, false);
  assert.equal(timer.active, true);
  assert.equal(timer.remaining, 5 * 60);
});

test('a finished break waits for the next focus by default', (t) => {
  setFocusTimer({
    mode: 'short',
    habitId: 'study',
    running: true,
    endsAt: Date.now() + 1000,
    remaining: 0,
    cycle: 1,
    active: true,
  });
  const { timer } = completeInTest(t, focusState());
  assert.equal(timer.mode, 'focus');
  assert.equal(timer.running, false);
  assert.equal(timer.active, true);
  assert.equal(timer.remaining, 25 * 60);
});

test('autoFocus starts the next focus when the break ends', (t) => {
  setFocusTimer({
    mode: 'short',
    habitId: 'study',
    running: true,
    endsAt: Date.now() + 1000,
    remaining: 0,
    cycle: 1,
    active: true,
  });
  const { timer } = completeInTest(t, focusState({ autoFocus: true }));
  assert.equal(timer.mode, 'focus');
  assert.equal(timer.running, true);
  assert.equal(timer.active, true);
  assert.equal(timer.remaining, 25 * 60);
});
