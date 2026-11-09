'use strict';
// Journal lives inside Settings. These smoke tests guard the entry point and
// the sub-view so the feature cannot silently become unreachable again.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/load-app');

const { renderSettings, renderJournal, defaultState, setState, render, $, setActivePage, setSettingsView, getSettingsView } = loadApp();

test('Settings offers a Journal entry point', () => {
  setState(defaultState());
  const html = renderSettings();
  assert.match(html, /Journal &amp; reflections/);
  assert.match(html, /data-action="open-journal-view"/);
  assert.match(html, /id="themeSelect"/);
});

test('Journal renders its editor and a way back to Settings', () => {
  setState({
    ...defaultState(),
    journal: {
      '2026-01-15': {
        note: 'A quiet day',
        wentWell: 'Walked outside',
        challenge: '',
        grateful: '',
        mood: 'good',
      },
    },
  });
  const html = renderJournal();
  assert.match(html, /data-action="close-journal-view"/);
  assert.match(html, /id="journalNote"/);
  assert.match(html, /Find an entry/);
  assert.match(html, /A quiet day/);
  assert.match(html, /not encrypted by default/);
});

test('Settings routing opens the Journal sub-view and returns', () => {
  setState(defaultState());
  setActivePage('settings');
  setSettingsView('main');
  render();
  assert.match($('#main').innerHTML, /data-action="open-journal-view"/);

  setSettingsView('journal');
  render();
  assert.match($('#main').innerHTML, /id="journalNote"/);
  assert.match($('#main').innerHTML, /data-action="close-journal-view"/);
  assert.doesNotMatch($('#main').innerHTML, /id="themeSelect"/);
});

test('a legacy journal deep link resolves to the Settings journal view', () => {
  setState(defaultState());
  setActivePage('journal');
  setSettingsView('main');
  render();
  assert.equal(getSettingsView(), 'journal');
  assert.match($('#main').innerHTML, /id="journalNote"/);
});
