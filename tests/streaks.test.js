'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, makeHabit, setToday } = require('./helpers/load-app');

const { currentStreak, bestStreak } = loadApp();

// January 2026: 1=Thu ... 5=Mon, 12=Mon, 15=Thu, 19=Mon.

test('currentStreak counts consecutive completed scheduled days including today', (t) => {
  setToday(t, 2026, 1, 15);
  const h = makeHabit({ done: { '2026-01-13': 1, '2026-01-14': 1, '2026-01-15': 1 } });
  assert.equal(currentStreak(h), 3);
});

test('currentStreak forgives an incomplete today (grace: count from yesterday)', (t) => {
  setToday(t, 2026, 1, 15);
  const h = makeHabit({ done: { '2026-01-13': 1, '2026-01-14': 1 } });
  assert.equal(currentStreak(h), 2);
});

test('currentStreak with only yesterday done is 1', (t) => {
  setToday(t, 2026, 1, 15);
  assert.equal(currentStreak(makeHabit({ done: { '2026-01-14': 1 } })), 1);
});

test('currentStreak breaks after a missed scheduled day', (t) => {
  setToday(t, 2026, 1, 15);
  const h = makeHabit({ done: { '2026-01-12': 1, '2026-01-14': 1 } }); // 13 missed
  assert.equal(currentStreak(h), 1);
});

test('currentStreak is zero with no completions or before the start date', (t) => {
  setToday(t, 2026, 1, 15);
  assert.equal(currentStreak(makeHabit()), 0);
  assert.equal(currentStreak(makeHabit({ start: '2026-01-16' })), 0);
});

test('currentStreak skips unscheduled rest days without breaking', (t) => {
  setToday(t, 2026, 1, 15); // Thursday, not scheduled
  // Mon/Wed/Fri habit; completed both scheduled days this week.
  const h = makeHabit({ days: [1, 3, 5], done: { '2026-01-12': 1, '2026-01-14': 1 } });
  assert.equal(currentStreak(h), 2);
});

test('currentStreak counts every day for an every-day habit', (t) => {
  setToday(t, 2026, 1, 15);
  const done = {};
  for (let d = 8; d <= 15; d++) done[`2026-01-${String(d).padStart(2, '0')}`] = 1;
  assert.equal(currentStreak(makeHabit({ done })), 8);
});

test('bestStreak finds the longest run of completed scheduled days', () => {
  const done = {};
  for (let d = 8; d <= 12; d++) done[`2026-01-${String(d).padStart(2, '0')}`] = 1;
  assert.equal(bestStreak(makeHabit({ done })), 5);
});

test('bestStreak bridges across unscheduled days for weekly habits', () => {
  // Completed three consecutive Mondays: Jan 5, 12, 19, 2026.
  const h = makeHabit({ days: [1], done: { '2026-01-05': 1, '2026-01-12': 1, '2026-01-19': 1 } });
  assert.equal(bestStreak(h), 3);
});

test('bestStreak resets after a missed scheduled day', () => {
  const h = makeHabit({ days: [1], done: { '2026-01-05': 1, '2026-01-19': 1 } }); // 12 missed
  assert.equal(bestStreak(h), 1);
});

test('bestStreak ignores completions before the start date', () => {
  const h = makeHabit({
    start: '2026-01-10',
    done: { '2026-01-05': 1, '2026-01-10': 1, '2026-01-11': 1, '2026-01-12': 1 },
  });
  assert.equal(bestStreak(h), 3);
});

test('bestStreak breaks at partial days that did not reach the goal', () => {
  // Jan 11 reached only 2 of 3 units: not a completion, so it breaks a
  // daily-schedule run. The two completed days form runs of 1.
  const h = makeHabit({
    goal: 3,
    done: { '2026-01-10': 3, '2026-01-11': 2, '2026-01-12': 3 },
  });
  assert.equal(bestStreak(h), 1);
});

test('bestStreak is zero with no completions', () => {
  assert.equal(bestStreak(makeHabit()), 0);
});
