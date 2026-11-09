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
  normalize,
  renderFocus,
  setState,
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
  assert.deepEqual(focus, { focus: 180, short: 1, long: 90, every: 8, sound: false });
});

test('normalize defaults Focus settings when missing', () => {
  const focus = normalize({ habits: [] }).settings.focus;
  assert.deepEqual(focus, { focus: 25, short: 5, long: 15, every: 4, sound: true });
});

// --- Focus page smoke ------------------------------------------------------

test('renderFocus builds the timer and an empty time library', () => {
  setState({
    version: 10,
    habits: [],
    sessions: [],
    settings: { theme: 'system', focus: { focus: 25, short: 5, long: 15, every: 4, sound: true } },
  });
  const html = renderFocus();
  assert.match(html, /id="focusClock"/);
  assert.match(html, /Your time library/);
  assert.match(html, /No time habits yet/);
});

test('renderFocus lists time habits with hours and excludes count habits', (t) => {
  setToday(t, 2026, 1, 15);
  setState({
    version: 10,
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
    settings: { theme: 'system', focus: { focus: 25, short: 5, long: 15, every: 4, sound: true } },
  });
  const html = renderFocus();
  assert.match(html, /<h4>Study<\/h4>/);
  assert.match(html, /1\.5 hrs/);
  assert.doesNotMatch(html, /<h4>Push-ups<\/h4>/);
  assert.match(html, /Recent sessions/);
});
