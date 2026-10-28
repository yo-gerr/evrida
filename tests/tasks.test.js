'use strict';
// Daily intentions: "Bring forward" must offer only yesterday's unfinished
// items that are not already in today's list, so repeated presses cannot
// stack duplicates. Yesterday's entries are never modified by carrying.
// Renaming an intention in place reuses intentionText(), the same trim and
// 120-character cap the add form and normalize() apply.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, setToday } = require('./helpers/load-app');

const { carryPending, intentionText, setState } = loadApp();

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

// --- Inline rename text rule ------------------------------------------------
// The label editor commits through intentionText(), so an edit obeys exactly
// the same limits as a newly added intention.

test('intentionText trims surrounding whitespace on an edit', () => {
  assert.equal(intentionText('   Walk after lunch   '), 'Walk after lunch');
});

test('intentionText caps an edit at the 120-character limit', () => {
  const long = 'a'.repeat(140);
  const out = intentionText(long);
  assert.equal(out.length, 120);
  assert.equal(out, 'a'.repeat(120));
});

test('intentionText leaves a normal edit unchanged', () => {
  assert.equal(intentionText('Read one page'), 'Read one page');
});

test('intentionText reports blank input as empty so an edit reverts', () => {
  assert.equal(intentionText(''), '');
  assert.equal(intentionText('   '), '');
  assert.equal(intentionText(null), '');
  assert.equal(intentionText(undefined), '');
});
