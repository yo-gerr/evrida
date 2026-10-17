'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, makeHabit, setToday } = require('./helpers/load-app');

const { scheduled, goal, count, completed, eligible } = loadApp();

// Calendar facts for these tests (verified against the real calendar):
// 2026-01-04 Sunday, 05 Monday, 06 Tuesday, 07 Wednesday,
// 08 Thursday, 09 Friday, 10 Saturday.

test('scheduled maps weekday numbers 0-6 to the correct calendar days', () => {
  const h = makeHabit({ days: [0] });
  assert.equal(scheduled(h, '2026-01-04'), true);  // Sunday
  assert.equal(scheduled(h, '2026-01-05'), false); // Monday
  const weekdays = [
    ['2026-01-04', 0], ['2026-01-05', 1], ['2026-01-06', 2], ['2026-01-07', 3],
    ['2026-01-08', 4], ['2026-01-09', 5], ['2026-01-10', 6],
  ];
  for (const [date, dow] of weekdays) {
    assert.equal(scheduled(makeHabit({ days: [dow] }), date), true, date);
  }
});

test('scheduled is false when the habit has no day list', () => {
  assert.equal(scheduled({ done: {} }, '2026-01-04'), false);
});

test('goal and count are defensive against missing or malformed values', () => {
  assert.equal(goal({}), 1);
  assert.equal(goal({ goal: 0 }), 1);
  assert.equal(goal({ goal: 5 }), 5);
  assert.equal(count({ done: {} }, '2026-01-05'), 0);
  assert.equal(count({ done: { '2026-01-05': '3' } }, '2026-01-05'), 3);
  assert.equal(count({ done: { '2026-01-05': -2 } }, '2026-01-05'), 0);
});

test('completed requires reaching the daily target; partial progress is not completion', () => {
  const h = makeHabit({ goal: 3, done: { '2026-01-05': 2 } });
  assert.equal(completed(h, '2026-01-05'), false);
  h.done['2026-01-05'] = 3;
  assert.equal(completed(h, '2026-01-05'), true);
});

test('goal of one treats any positive count as completion', () => {
  assert.equal(completed(makeHabit({ done: { '2026-01-05': 1 } }), '2026-01-05'), true);
});

test('eligible requires on/after start date AND a scheduled weekday', () => {
  const h = makeHabit({ start: '2026-01-05', days: [1] }); // Mondays only
  assert.equal(eligible(h, '2026-01-04'), false); // Sunday before start
  assert.equal(eligible(h, '2026-01-05'), true);  // Monday on start date
  assert.equal(eligible(h, '2026-01-12'), true);  // later Monday
  assert.equal(eligible(h, '2026-01-13'), false); // Tuesday, unscheduled
});

test('eligible defaults to the current date', (t) => {
  setToday(t, 2026, 10, 18); // a Sunday
  const sunday = makeHabit({ days: [0] });
  const monday = makeHabit({ days: [1] });
  assert.equal(eligible(sunday), true);
  assert.equal(eligible(monday), false);
});
