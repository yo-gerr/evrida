'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, makeHabit, setToday } = require('./helpers/load-app');

const { completionStats, stats, recoveryStats, setState } = loadApp();

// With the clock pinned to 2026-01-15 (Thursday), a 7-day window covers
// 2026-01-09 (Friday) through 2026-01-15.

test('completionStats counts only scheduled days inside the window', (t) => {
  setToday(t, 2026, 1, 15);
  const h = makeHabit({ done: { '2026-01-09': 1, '2026-01-10': 1, '2026-01-11': 1, '2026-01-13': 1 } });
  const s = completionStats(h, 7);
  assert.equal(s.scheduledDays, 7);
  assert.equal(s.completedDays, 4);
  assert.equal(s.rate, 57);
  assert.equal(s.unitsDone, 4);
  assert.equal(s.unitsPossible, 7);
  assert.equal(s.unitRate, 57);
});

test('completionStats respects a non-daily schedule', (t) => {
  setToday(t, 2026, 1, 15);
  // Thursdays only; exactly one scheduled day (Jan 15) falls in the window.
  const h = makeHabit({ days: [4], done: { '2026-01-15': 1 } });
  const s = completionStats(h, 7);
  assert.equal(s.scheduledDays, 1);
  assert.equal(s.completedDays, 1);
  assert.equal(s.rate, 100);
});

test('completionStats excludes days before the habit start date', (t) => {
  setToday(t, 2026, 1, 15);
  const h = makeHabit({ start: '2026-01-12', done: { '2026-01-12': 1, '2026-01-13': 1, '2026-01-14': 1, '2026-01-15': 1 } });
  const s = completionStats(h, 7);
  assert.equal(s.scheduledDays, 4);
  assert.equal(s.completedDays, 4);
});

test('completionStats separates unit progress from day completion for multi-unit goals', (t) => {
  setToday(t, 2026, 1, 15);
  const h = makeHabit({ goal: 3, done: { '2026-01-10': 3, '2026-01-11': 2 } });
  const s = completionStats(h, 7);
  assert.equal(s.scheduledDays, 7);
  assert.equal(s.completedDays, 1);   // only Jan 10 reached the goal of 3
  assert.equal(s.rate, 14);
  assert.equal(s.unitsDone, 5);       // 3 + 2 (partial day contributes its actual units)
  assert.equal(s.unitsPossible, 21);  // 7 scheduled days x goal 3
  assert.equal(s.unitRate, 24);
});

test('stats summarizes today across eligible habits only', (t) => {
  setToday(t, 2026, 1, 15); // Thursday
  const doneToday = makeHabit({ done: { '2026-01-14': 1, '2026-01-15': 1 } });
  const notDone = makeHabit({ id: 'h2' });
  const notScheduled = makeHabit({ id: 'h3', days: [1] }); // Mondays only
  setState({ habits: [doneToday, notDone, notScheduled] });
  const s = stats();
  assert.equal(s.applicable.length, 2); // the Monday-only habit is not eligible today
  assert.equal(s.done, 1);
  assert.equal(s.rate, 50);
  assert.equal(s.entries, 2); // completed calendar days across all done maps
});

test('recoveryStats counts missed scheduled past days and returns after them', (t) => {
  setToday(t, 2026, 1, 15);
  // Start Monday Jan 12: both Jan 12 and Jan 13 missed, returned on Jan 14,
  // today (Jan 15) not yet logged.
  setState({ habits: [makeHabit({ start: '2026-01-12', done: { '2026-01-14': 1 } })] });
  const r = recoveryStats();
  assert.equal(r.misses, 2);  // Jan 12 and Jan 13: past scheduled days without completion
  assert.equal(r.resumes, 1); // Jan 14 followed a miss
});

test('recoveryStats is zero when nothing was missed', (t) => {
  setToday(t, 2026, 1, 15);
  setState({
    habits: [makeHabit({ start: '2026-01-13', done: { '2026-01-13': 1, '2026-01-14': 1 } })],
  });
  const r = recoveryStats();
  assert.equal(r.misses, 0);
  assert.equal(r.resumes, 0);
});
