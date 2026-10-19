'use strict';
// Daily intentions: "Bring forward" must offer only yesterday's unfinished
// items that are not already in today's list, so repeated presses cannot
// stack duplicates. Yesterday's entries are never modified by carrying.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, setToday } = require('./helpers/load-app');

const { carryPending, setState } = loadApp();

// Clock pinned to 2026-01-15 (Thursday), so yesterday is 2026-01-14.
const todayKey = '2026-01-15';
const yesterdayKey = '2026-01-14';

function setTasks(tasks) {
  setState({ tasks });
}

test('carryPending returns unfinished yesterday items when today is empty', (t) => {
  setToday(t, 2026, 1, 15);
  setTasks({
    [yesterdayKey]: [
      { id: 'a', text: 'Drink water', done: false },
      { id: 'b', text: 'Stretch', done: false },
    ],
  });
  const pending = carryPending();
  assert.deepEqual(
    pending.map((x) => x.text),
    ['Drink water', 'Stretch']
  );
});

test('carryPending skips yesterday items already present in today', (t) => {
  setToday(t, 2026, 1, 15);
  setTasks({
    [yesterdayKey]: [
      { id: 'a', text: 'Drink water', done: false },
      { id: 'b', text: 'Stretch', done: false },
    ],
    [todayKey]: [{ id: 'c', text: 'Drink water', done: false }],
  });
  const pending = carryPending();
  assert.deepEqual(
    pending.map((x) => x.text),
    ['Stretch']
  );
});

test('carryPending compares text ignoring surrounding whitespace', (t) => {
  setToday(t, 2026, 1, 15);
  setTasks({
    [yesterdayKey]: [{ id: 'a', text: 'Drink water', done: false }],
    [todayKey]: [{ id: 'c', text: '  Drink water  ', done: false }],
  });
  assert.deepEqual(carryPending(), []);
});

test('carryPending ignores yesterday items already marked done', (t) => {
  setToday(t, 2026, 1, 15);
  setTasks({
    [yesterdayKey]: [
      { id: 'a', text: 'Finished earlier', done: true },
      { id: 'b', text: 'Still open', done: false },
    ],
  });
  assert.deepEqual(
    carryPending().map((x) => x.text),
    ['Still open']
  );
});

test('carryPending is empty when yesterday has no unfinished items', (t) => {
  setToday(t, 2026, 1, 15);
  setTasks({ [yesterdayKey]: [{ id: 'a', text: 'Done', done: true }] });
  assert.deepEqual(carryPending(), []);
  setTasks({});
  assert.deepEqual(carryPending(), []);
  setState({});
  assert.deepEqual(carryPending(), []);
});

test('repeated carry is a no-op the second time (no duplicate stacking)', (t) => {
  setToday(t, 2026, 1, 15);
  const state = {
    [yesterdayKey]: [
      { id: 'a', text: 'Drink water', done: false },
      { id: 'b', text: 'Stretch', done: false },
    ],
  };
  setTasks(state);

  // First press: both items are offered and copied into today.
  const first = carryPending();
  assert.equal(first.length, 2);
  state[todayKey] = first.map((x, i) => ({
    id: `copy${i}`,
    text: x.text,
    done: false,
  }));

  // Second press: nothing left to offer, so no further copies can stack.
  assert.deepEqual(carryPending(), []);
});

test('carryPending keeps duplicate texts from yesterday on the first press', (t) => {
  setToday(t, 2026, 1, 15);
  setTasks({
    [yesterdayKey]: [
      { id: 'a', text: 'Two glasses of water', done: false },
      { id: 'b', text: 'Two glasses of water', done: false },
    ],
  });
  assert.equal(carryPending().length, 2);
});
