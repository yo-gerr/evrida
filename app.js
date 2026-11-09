(() => {
        'use strict';
        // Keep the legacy storage key so existing Streakgrid data remains available after rebranding.
        const KEY = 'streakgrid';
        const VERSION = 10;
        const FOCUS_DEFAULTS = { focus: 25, short: 5, long: 15, every: 4, sound: true };
        const TIMER_KEY = `${KEY}-timer`;
        const MILESTONES = [10, 50, 100, 250, 500, 1000];
        const CATEGORIES = [
          'Health & Fitness',
          'Learning',
          'Productivity',
          'Mindfulness',
          'Home',
          'Relationships',
          'Finance',
          'General'
        ];
        const COLORS = [
          '#496B50',
          '#C8795A',
          '#788A9A',
          '#A67C29',
          '#5F8A6E',
          '#3F6D7A',
          '#B4707C',
          '#6E7F4E'
        ];
        // Validation whitelist for a habit's persisted `icon`, not just a
        // picker list: normalize() resets any icon not found here to EMOJIS[0].
        // This array may only GROW BY APPENDING. Removing or reordering an
        // entry would silently rewrite the stored icons of existing habits.
        // The first 16 are the original set; keep them first and unchanged.
        const EMOJIS = [
          // Original set — everyday health, focus, and self-care.
          '📚',
          '🏃',
          '💧',
          '🧘',
          '💪',
          '🛏️',
          '🥗',
          '✍️',
          '🎸',
          '💤',
          '🧹',
          '🌱',
          '🚶',
          '🧠',
          '🎨',
          '🪥',
          // Play and games.
          '♟️',
          '🎮',
          '🎲',
          '🧩',
          '🎯',
          // Learning and language.
          '🗣️',
          '🔤',
          '🧮',
          '✈️',
          // Sport and movement.
          '🚴',
          '🏊',
          '⚽',
          '🧗',
          // Rest and wellbeing.
          '🛁',
          '☀️',
          '🌙',
          '🧴',
          // Work and admin.
          '💼',
          '🖥️',
          '✅',
          '🗓️',
          '💰',
          '🧾',
          // Home and kitchen.
          '🍳',
          '🧺',
          '🧽',
          // Making and craft.
          '📷',
          '🎹',
          '🧶',
          '🪚',
          // Nature, animals, and people.
          '🌳',
          '🐾',
          '👥',
          '🙏',
          // A few remaining common ones.
          '🕯️',
          '📝',
          '🚭',
          '🦷'
        ];
        const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        // [page id, icon, label, keepInMobileBar]. Five destinations: the daily
        // loop (Today, Habits), review & focus (Insights — with Trends, History,
        // and Habitat tabs — and Focus), and configuration (Settings, which also
        // hosts Journal). History is no longer a standalone destination; each
        // habit card's History button deep-links into the Insights History tab.
        const NAV = [
          ['today', '◷', 'Today', true],
          ['habits', '☷', 'Habits', true],
          ['insights', '↗', 'Insights', true],
          ['focus', '⏱', 'Focus', true],
          ['settings', '⚙', 'Settings', true]
        ];
        const QUOTES = [
          {
            text: 'It is never too late to be what you might have been.',
            author: 'George Eliot'
          },
          {
            text: 'Great things are done by a series of small things brought together.',
            author: 'Vincent van Gogh'
          },
          {
            text: 'You do not have to see the whole staircase, just take the first step.',
            author: 'Often attributed to Martin Luther King Jr.'
          },
          {
            text: 'How we spend our days is, of course, how we spend our lives.',
            author: 'Annie Dillard'
          },
          {
            text: 'The secret of getting ahead is getting started.',
            author: 'Commonly attributed to Mark Twain'
          },
          {
            text: 'Nothing diminishes anxiety faster than action.',
            author: 'Walter Anderson'
          },
          {
            text: 'Success is the sum of small efforts, repeated day in and day out.',
            author: 'Robert Collier'
          },
          {
            text: 'You are allowed to be both a masterpiece and a work in progress.',
            author: 'Sophia Bush'
          },
          {
            text: 'Almost everything will work again if you unplug it for a few minutes, including you.',
            author: 'Anne Lamott'
          },
          {
            text: 'Act as if what you do makes a difference. It does.',
            author: 'William James'
          },
          {
            text: 'The journey of a thousand miles begins with one step.',
            author: 'Lao Tzu'
          },
          {
            text: 'Be where you are; otherwise you will miss your life.',
            author: 'Unknown attribution'
          },
          {
            text: 'Small disciplines repeated with consistency every day lead to great achievements.',
            author: 'John C. Maxwell'
          },
          {
            text: 'You don’t have to be extreme, just consistent.',
            author: 'Unknown'
          },
          {
            text: 'Rest is not idleness, and to lie sometimes on the grass under trees is by no means a waste of time.',
            author: 'John Lubbock'
          }
        ];
        let state = {
            version: VERSION,
            habits: [],
            gallery: [],
            journal: {},
            savedQuotes: [],
            tasks: {},
            pets: {},
            dismissedCarries: {},
            settings: { theme: 'system' }
          },
          activePage = 'today',
          // Insights owns trends, history, and the habitat with its companions.
          // Session-only view state; never persisted.
          insightView = 'trends',
          habitatMode = 'zoo',
          // Settings hosts the Journal. Session-only sub-view; never persisted.
          settingsView = 'main',
          editingId = null,
          insightPeriod = 30,
          insightCategory = 'All categories',
          pickedEmoji = EMOJIS[0],
          pickedColor = COLORS[0],
          pickedDays = [0, 1, 2, 3, 4, 5, 6],
          journalDate = '',
          journalSearch = '',
          undoAction = null,
          toastTimer = null,
          confirmResolve = null,
          timer = null,
          lastSessionId = '',
          focusCfgOpen = false,
          audioCtx = null,
          focusSort = 'played';
        // Focus timer state: session-only UI state plus a small persistence
        // record in TIMER_KEY so a reload or a backgrounded tab stays honest.
        let focusTimer = {
            mode: 'focus',
            habitId: '',
            running: false,
            endsAt: 0,
            remaining: FOCUS_DEFAULTS.focus * 60,
            cycle: 0
          },
          focusTicker = null;
        const baseTitle = document.title;
        const $ = s => document.querySelector(s);
        const esc = s =>
          String(s).replace(
            /[&<>"']/g,
            c =>
              ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
              })[c]
          );
        const localKey = d =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const today = () => localKey(new Date());
        const dateFrom = k => {
          const [y, m, d] = k.split('-').map(Number);
          return new Date(y, m - 1, d, 12);
        };
        const shift = (k, n) => {
          const d = dateFrom(k);
          d.setDate(d.getDate() + n);
          return localKey(d);
        };
        const daysBetween = (a, b) =>
          Math.round((dateFrom(b) - dateFrom(a)) / 86400000);
        const goal = h => Math.max(1, Number(h.goal) || 1);
        const count = (h, k) => Math.max(0, Number(h.done?.[k]) || 0);
        const completed = (h, k) => count(h, k) >= goal(h);
        const scheduled = (h, k) =>
          Array.isArray(h.days) && h.days.includes(dateFrom(k).getDay());
        // Habits track either a count (reps, pages, glasses) or time in minutes.
        // Both write the same `done[date]` integer, so streaks, heatmaps,
        // insights, and companions keep working without special cases.
        const habitUnit = h => (h.unit === 'minutes' ? 'minutes' : 'count');
        const isTimeHabit = h => habitUnit(h) === 'minutes';
        const formatMinutes = m => {
          const n = Math.max(0, Math.round(Number(m) || 0));
          if (n < 60) return `${n}m`;
          const hrs = Math.floor(n / 60),
            mins = n % 60;
          return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
        };
        // Steam-style playtime label: one decimal, but never a trailing ".0".
        const hoursLabel = m => {
          const hrs = Math.max(0, Number(m) || 0) / 60;
          if (hrs >= 100) return `${Math.round(hrs)} hrs`;
          return `${hrs.toFixed(1).replace(/\.0$/, '')} hrs`;
        };
        const habitMinutes = h => {
          if (!isTimeHabit(h)) return 0;
          return Object.values(h.done || {}).reduce(
            (n, v) => n + Math.max(0, Math.round(Number(v) || 0)),
            0
          );
        };
        const minutesInLastDays = (h, days) => {
          if (!isTimeHabit(h)) return 0;
          let n = 0;
          for (let i = 0; i < days; i++) n += count(h, shift(today(), -i));
          return n;
        };
        const unassignedMinutes = () =>
          (state.sessions || [])
            .filter(
              s => !s.habitId || !state.habits.some(h => h.id === s.habitId)
            )
            .reduce((n, s) => n + Math.max(0, Number(s.minutes) || 0), 0);
        const clockText = total => {
          const s = Math.max(0, Math.round(Number(total) || 0));
          return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(
            s % 60
          ).padStart(2, '0')}`;
        };
        const fmt = k =>
          dateFrom(k).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
        journalDate = today();
        function defaultState() {
          return {
            version: VERSION,
            habits: [],
            gallery: [],
            journal: {},
            savedQuotes: [],
            tasks: {},
            pets: {},
            dismissedCarries: {},
            sessions: [],
            settings: { theme: 'system', focus: { ...FOCUS_DEFAULTS } }
          };
        }
        function normalize(raw) {
          if (!raw || !Array.isArray(raw.habits))
            throw Error('Backup must contain a habits list.');
          if (raw.habits.length > 500)
            throw Error('This backup contains too many habits.');
          const habits = raw.habits.map((h, i) => {
            if (!h || typeof h !== 'object')
              throw Error(`Habit ${i + 1} is invalid.`);
            const name = String(h.name || '').trim();
            if (!name || name.length > 60)
              throw Error(`Habit ${i + 1} has an invalid name.`);
            const unit = h.unit === 'minutes' ? 'minutes' : 'count';
            const g = Number(h.goal || 1);
            if (!Number.isInteger(g) || g < 1 || g > (unit === 'minutes' ? 600 : 99))
              throw Error(`Habit “${name}” has an invalid target.`);
            const start = /^\d{4}-\d{2}-\d{2}$/.test(h.start || '')
              ? h.start
              : today();
            const days = Array.isArray(h.days)
              ? [
                  ...new Set(
                    h.days
                      .map(Number)
                      .filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
                  )
                ]
              : [0, 1, 2, 3, 4, 5, 6];
            const done = {};
            if (
              h.done &&
              typeof h.done === 'object' &&
              !Array.isArray(h.done)
            ) {
              for (const [k, v] of Object.entries(h.done)) {
                if (
                  /^\d{4}-\d{2}-\d{2}$/.test(k) &&
                  Number.isFinite(Number(v)) &&
                  Number(v) >= 0 &&
                  Number(v) <= 999
                )
                  done[k] = Math.floor(Number(v));
              }
            }
            const category =
              String(h.category || 'General')
                .trim()
                .slice(0, 32) || 'General';
            // Implementation intention: separate when/where. A legacy single
            // `cue` from an earlier build migrates into `when` so no text is
            // lost, and is dropped from output so normalization stays stable.
            const when = String(h.when || h.cue || '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 60);
            const where = String(h.where || '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 60);
            return {
              id: String(h.id || `h${Date.now()}${i}`),
              name,
              category,
              goal: g,
              start,
              days: days.length ? days : [0, 1, 2, 3, 4, 5, 6],
              icon: EMOJIS.includes(h.icon) ? h.icon : EMOJIS[0],
              color: COLORS.includes(h.color)
                ? h.color
                : COLORS[i % COLORS.length],
              ...(unit === 'minutes' ? { unit } : {}),
              done,
              ...(h.art && typeof h.art === 'object' ? { art: h.art } : {}),
              ...(when ? { when } : {}),
              ...(where ? { where } : {}),
              ...(String(h.petName || '').trim()
                ? { petName: String(h.petName || '').trim().slice(0, 20) }
                : {})
            };
          });
          const gallery = Array.isArray(raw.gallery)
            ? raw.gallery
                .filter(g => g && typeof g === 'object' && !Array.isArray(g))
                .slice(-100)
            : [];
          const journal = {};
          if (
            raw.journal &&
            typeof raw.journal === 'object' &&
            !Array.isArray(raw.journal)
          ) {
            for (const [k, v] of Object.entries(raw.journal)) {
              if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && typeof v === 'object') {
                journal[k] = {
                  note: String(v.note || '').slice(0, 5000),
                  wentWell: String(v.wentWell || '').slice(0, 1500),
                  challenge: String(v.challenge || '').slice(0, 1500),
                  grateful: String(v.grateful || '').slice(0, 1500),
                  mood: ['great', 'good', 'okay', 'low', 'rough'].includes(
                    v.mood
                  )
                    ? v.mood
                    : ''
                };
              }
            }
          }
          const savedQuotes = Array.isArray(raw.savedQuotes)
            ? [
                ...new Set(
                  raw.savedQuotes
                    .map(Number)
                    .filter(
                      n => Number.isInteger(n) && n >= 0 && n < QUOTES.length
                    )
                )
              ]
            : [];
          const tasks = {};
          if (
            raw.tasks &&
            typeof raw.tasks === 'object' &&
            !Array.isArray(raw.tasks)
          ) {
            for (const [k, list] of Object.entries(raw.tasks)) {
              if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Array.isArray(list)) {
                tasks[k] = list
                  .filter(t => t && typeof t === 'object' && !Array.isArray(t))
                  .slice(0, 100)
                  .map((t, i) => ({
                    id: String(t.id || `t${k}${i}`).slice(0, 80),
                    text: String(t.text || '')
                      .trim()
                      .slice(0, 120),
                    done: !!t.done
                  }))
                  .filter(t => t.text);
              }
            }
          }
          const theme = ['system', 'light', 'dark'].includes(
            raw.settings?.theme
          )
            ? raw.settings.theme
            : 'system';
          const dismissedCarries = {};
          if (
            raw.dismissedCarries &&
            typeof raw.dismissedCarries === 'object' &&
            !Array.isArray(raw.dismissedCarries)
          ) {
            const cutoff = shift(today(), -8);
            for (const [k, v] of Object.entries(raw.dismissedCarries)) {
              if (typeof k !== 'string') continue;
              const idx = k.indexOf('::');
              if (idx < 0) continue;
              const d = k.slice(0, idx);
              if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
              if (d < cutoff) continue;
              if (!v) continue;
              dismissedCarries[k] = true;
            }
          }
          const pets = {};
          if (raw.pets && typeof raw.pets === 'object' && !Array.isArray(raw.pets)) {
            for (const [hid, p] of Object.entries(raw.pets)) {
              if (p && typeof p === 'object') {
                pets[hid] = {
                  xp: Math.max(0, Math.floor(Number(p.xp) || 0)),
                  stage: Math.max(0, Math.floor(Number(p.stage) || 0)),
                  bornAt: typeof p.bornAt === 'string' ? p.bornAt : today(),
                  species: typeof p.species === 'string' ? p.species : ''
                };
              }
            }
          }
          const sessions = (Array.isArray(raw.sessions) ? raw.sessions : [])
            .filter(x => x && typeof x === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(x.date || '') && Number.isFinite(Number(x.minutes)))
            .map((x, i) => ({
              id: String(x.id || `s${i}`).slice(0, 60),
              habitId: String(x.habitId || '').slice(0, 80),
              date: x.date,
              minutes: Math.max(1, Math.min(1440, Math.round(Number(x.minutes)))),
              at: Number.isFinite(Number(x.at)) ? Number(x.at) : 0,
              kind: x.kind === 'manual' ? 'manual' : 'focus',
              note: String(x.note || '').trim().slice(0, 200)
            }))
            .slice(-3000);
          const fcfg = (raw.settings && raw.settings.focus) || {};
          const clampInt = (v, lo, hi, d) => {
            const n = Math.round(Number(v));
            return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
          };
          const focus = {
            focus: clampInt(fcfg.focus, 1, 180, FOCUS_DEFAULTS.focus),
            short: clampInt(fcfg.short, 1, 60, FOCUS_DEFAULTS.short),
            long: clampInt(fcfg.long, 1, 90, FOCUS_DEFAULTS.long),
            every: clampInt(fcfg.every, 2, 8, FOCUS_DEFAULTS.every),
            sound: fcfg.sound !== false
          };
          return {
            version: VERSION,
            habits,
            gallery,
            journal,
            savedQuotes,
            tasks,
            pets,
            dismissedCarries,
            sessions,
            settings: { theme, focus }
          };
        }
        function save() {
          try {
            localStorage.setItem(KEY, JSON.stringify(state));
            return true;
          } catch (e) {
            notify(
              'Could not save. Storage may be full or unavailable.',
              false
            );
            return false;
          }
        }
        function load() {
          try {
            const raw = localStorage.getItem(KEY);
            if (!raw) {
              state = defaultState();
              return;
            }
            state = normalize(JSON.parse(raw));
          } catch (e) {
            state = defaultState();
            setTimeout(
              () =>
                notify(
                  'Saved data could not be read. Your existing backup may help restore it.',
                  false
                ),
              100
            );
          }
        }
        function applyTheme() {
          document.documentElement.dataset.theme = state.settings.theme;
          const meta = $('meta[name="theme-color"]');
          if (meta) {
            const dark =
              state.settings.theme === 'dark' ||
              (state.settings.theme === 'system' &&
                window.matchMedia &&
                window.matchMedia('(prefers-color-scheme: dark)').matches);
            meta.content = dark ? '#171D19' : '#F7F5EF';
          }
          $('#headerTheme').title = `Appearance: ${state.settings.theme}`;
        }
        function notify(message, undo = true) {
          $('#toastText').textContent = message;
          const undoBtn = $('#undoBtn');
          if (undoBtn) {
            if (undo && undoAction) {
              undoBtn.classList.remove('hidden');
              undoBtn.style.display = '';
            } else {
              undoBtn.classList.add('hidden');
              undoBtn.style.display = 'none';
            }
          }
          const icon = document.querySelector('.toast-icon');
          if (icon) {
            icon.style.display = undo && undoAction ? 'inline-flex' : 'none';
          }
          $('#toast').classList.add('show');
          clearTimeout(toastTimer);
          toastTimer = setTimeout(
            () => $('#toast').classList.remove('show'),
            4500
          );
        }
        function snapshotUndo(message, fn) {
          undoAction = fn;
          notify(message, true);
        }
        $('#undoBtn').onclick = () => {
          if (undoAction) {
            undoAction();
            undoAction = null;
            save();
            render();
            $('#toast').classList.remove('show');
          }
        };
        function openConfirm(title, message, okText = 'Continue') {
          $('#confirmTitle').textContent = title;
          $('#confirmText').textContent = message;
          $('#confirmOk').textContent = okText;
          $('#confirmDialog').showModal();
          return new Promise(resolve => (confirmResolve = resolve));
        }
        $('#confirmCancel').onclick = () => {
          $('#confirmDialog').close();
          confirmResolve?.(false);
        };
        $('#confirmOk').onclick = () => {
          $('#confirmDialog').close();
          confirmResolve?.(true);
        };
        $('#confirmDialog').addEventListener('close', () => {
          if (confirmResolve) {
            confirmResolve(false);
            confirmResolve = null;
          }
        });
        function currentStreak(h) {
          let k = today(),
            n = 0;
          if (k < h.start) return 0;
          if (scheduled(h, k) && !completed(h, k)) k = shift(k, -1);
          for (let i = 0; i < 3660; i++) {
            const d = shift(k, -i);
            if (d < h.start) break;
            if (!scheduled(h, d)) continue;
            if (completed(h, d)) n++;
            else break;
          }
          return n;
        }
        function bestStreak(h) {
          const keys = Object.keys(h.done)
            .filter(k => k >= h.start && scheduled(h, k) && completed(h, k))
            .sort();
          let best = 0,
            run = 0,
            prev = null;
          for (const k of keys) {
            if (prev === null) {
              run = 1;
            } else {
              let gap = 1,
                d = shift(prev, 1);
              while (d < k && !scheduled(h, d) && gap < 8) {
                d = shift(d, 1);
                gap++;
              }
              run = d === k ? run + 1 : 1;
            }
            best = Math.max(best, run);
            prev = k;
          }
          return best;
        }
        function eligible(h, k = today()) {
          return k >= h.start && scheduled(h, k);
        }
        function stats() {
          const applicable = state.habits.filter(h => eligible(h));
          const done = applicable.filter(h => completed(h, today())).length;
          const entries = state.habits.reduce(
            (n, h) =>
              n + Object.keys(h.done).filter(k => completed(h, k)).length,
            0
          );
          return {
            applicable,
            done,
            entries,
            rate: pct(done, applicable.length)
          };
        }
        function navMarkup(mobile = false) {
          return NAV.filter(item => !mobile || item[3])
            .map(
              ([id, ico, label]) =>
                `<button data-page="${id}" class="${activePage === id ? 'active' : ''}" ${activePage === id ? 'aria-current="page"' : ''}><span>${ico}</span>${label}</button>`
            )
            .join('');
        }
        const PET_SPECIES = ['fish', 'snail', 'plant'];
        const PET_STAGES = [
          { name: 'Egg', xp: 0 },
          { name: 'Fry', xp: 5 },
          { name: 'Juvenile', xp: 20 },
          { name: 'Adult', xp: 50 }
        ];
        function ensurePet(hid) {
          state.pets = state.pets || {};
          if (!state.pets[hid]) {
            const s = PET_SPECIES[hid.charCodeAt(hid.length - 1) % PET_SPECIES.length];
            state.pets[hid] = { xp: 0, stage: 0, bornAt: today(), species: s };
          }
          return state.pets[hid];
        }
        function addPetXP(hid, amount) {
          if (amount <= 0) return;
          const p = ensurePet(hid);
          p.xp += amount;
          let newStage = p.stage;
          for (let i = PET_STAGES.length - 1; i >= 0; i--) {
            if (p.xp >= PET_STAGES[i].xp) {
              newStage = i;
              break;
            }
          }
          if (newStage !== p.stage) {
            p.stage = newStage;
            try {
              notify(`Your companion grew to ${PET_STAGES[p.stage].name.toLowerCase()}!`, false);
            } catch (e) {}
          }
          try {
            save();
          } catch (e) {}
        }
        function petSvg(species, stage) {
          const INK = '#25352b';
          const kind = species === 'snail' || species === 'plant' ? species : 'fish';
          const delay = `${(-Math.random() * 6).toFixed(2)}s`;
          const wrap = body =>
            `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><g class="pet pet-${kind} pet-s${Math.max(0, Math.min(3, stage | 0))}" style="--d:${delay}">${body}</g></svg>`;
          const eye = (x, y, r = 2) =>
            `<g class="pet-eye"><circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>` +
            `<circle cx="${x + r * 0.2}" cy="${y + r * 0.1}" r="${r * 0.62}" fill="${INK}"/>` +
            `<circle cx="${x + r * 0.45}" cy="${y - r * 0.3}" r="${r * 0.22}" fill="#fff"/></g>`;
          const blush = (x, y) =>
            `<ellipse cx="${x}" cy="${y}" rx="2" ry="1.2" fill="#ff8fa3" opacity=".45"/>`;
          const smile = d =>
            `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>`;
          const shadow = rx =>
            `<ellipse cx="20" cy="36.5" rx="${rx}" ry="1.8" fill="${INK}" opacity=".12"/>`;
          const bubble = (x, y, r) =>
            `<circle class="pet-bubble" cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".35" stroke="#8cc4ec" stroke-width="1"/>`;
          const sparkle = (x, y) =>
            `<path class="pet-spark" d="M${x} ${y - 3.2}l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1z" fill="#f2c94c"/>`;
          const leaf = (x, y, rot, s, fill) =>
            `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">` +
            `<path d="M0 0C-3.4-3-3.4-9 0-12.5 3.4-9 3.4-3 0 0z" fill="${fill}"/>` +
            `<path d="M0-1V-9.5" stroke="#fff" stroke-opacity=".35" stroke-width=".8" stroke-linecap="round"/></g>`;
          const sway = inner => `<g class="pet-sway">${inner}</g>`;
          const pot = (stageFace = true) =>
            `<path d="M12.5 28h15l-2 8.2H14.5z" fill="#c8795a"/>` +
            `<rect x="11" y="26" width="18" height="4" rx="2" fill="#d98f70"/>` +
            (stageFace
              ? `<g class="pet-eye"><circle cx="17.2" cy="32.2" r="1" fill="${INK}"/><circle cx="22.8" cy="32.2" r="1" fill="${INK}"/></g>` +
                smile('M18.6 34c.9.8 1.9.8 2.8 0') +
                blush(15.4, 33.6) +
                blush(24.6, 33.6)
              : '');

          const art = {
            fish: [
              `<circle cx="20" cy="21" r="11" fill="#cfe9fb" fill-opacity=".6"/>` +
                `<circle cx="20" cy="21" r="11" fill="none" stroke="#8cc4ec" stroke-width="1.5"/>` +
                `<path d="M14 22c0-4 3-6 6-5s5 4 3 7-6 4-9-2z" fill="#ff9d7a"/>` +
                `<circle cx="22.5" cy="20" r="1.1" fill="${INK}"/>` +
                `<ellipse cx="14.5" cy="15.5" rx="3" ry="1.6" fill="#fff" opacity=".75" transform="rotate(-35 14.5 15.5)"/>` +
                bubble(33, 9, 1.6) + bubble(7, 12, 1),
              `<path class="pet-tail" d="M14 21 6.5 15v12z" fill="#5aaee8" stroke="#5aaee8" stroke-width="1.2" stroke-linejoin="round"/>` +
                `<ellipse cx="21" cy="21" rx="8.5" ry="6" fill="#7cc4f5"/>` +
                `<ellipse cx="22" cy="23.6" rx="6" ry="2.6" fill="#d6eeff"/>` +
                `<path d="M18 15.6c1.6-3.2 4.2-3.6 6.2-1.6z" fill="#5aaee8"/>` +
                eye(25.5, 19.5, 2.2) + blush(26.5, 23.4) +
                bubble(32, 11, 1.4) + bubble(35, 16, 0.9),
              `<path class="pet-tail" d="M12 21C8 17 6 14 3.5 13 4.5 17 4.5 25 3.5 29 6 28 8 25 12 21z" fill="#3b95e0"/>` +
                `<ellipse cx="21" cy="21" rx="10.5" ry="7.5" fill="#4aa3e8"/>` +
                `<ellipse cx="22" cy="25" rx="7" ry="3" fill="#dff1ff" opacity=".85"/>` +
                `<path d="M17 14.4c2 3 2 10.4 0 13.4M22 13.8c2 3.2 2 11 0 14" fill="none" stroke="#2f80c8" stroke-width="1.5" stroke-linecap="round" opacity=".45"/>` +
                `<path d="M15 14.8C17 9.4 22 8.8 26 13.8 22 12.6 18 13 15 14.8z" fill="#2f80c8"/>` +
                `<path d="M19.5 23c-2 2-2.2 4.2-.6 5.2 2-.5 3.4-2.6 3.4-4.6z" fill="#2f80c8" opacity=".75"/>` +
                eye(26.5, 18.8, 2.6) + blush(28, 23.6) + smile('M30.4 23.4c-.9.9-2 1-2.9.4') +
                bubble(34, 10, 1.5) + bubble(36.5, 15, 1),
              `<g class="pet-tail"><path d="M10 21C6 16 3 12 1.5 7.5 7.5 8 11.5 12 13.5 16.5z" fill="#1f78d1"/>` +
                `<path d="M10 21C6 26 3 30 1.5 34.5 7.5 34 11.5 30 13.5 25.5z" fill="#1f78d1"/></g>` +
                `<ellipse cx="22" cy="21" rx="13.5" ry="9" fill="#2f8fe0"/>` +
                `<ellipse cx="23" cy="25.6" rx="9.5" ry="3.8" fill="#cfe9fb" opacity=".9"/>` +
                `<path d="M14 18c2 1.5 2 5 0 6.5M18 16.5c2.2 2 2.2 7 0 9M22 16c2.2 2.2 2.2 8 0 10" fill="none" stroke="#1f78d1" stroke-width="1.2" stroke-linecap="round" opacity=".5"/>` +
                `<path d="M12.5 17.6C18 13.8 28 13.2 33 17" fill="none" stroke="#f2c94c" stroke-width="1.6" stroke-linecap="round"/>` +
                `<path d="M14 13.4C17 4.8 25 3.8 31 12.4 26 10.6 19 10.6 14 13.4z" fill="#1f78d1"/>` +
                `<path d="M20 27.6c-2.5 3-3 5.6-1 7 3-.5 5.5-3 5.5-6.5z" fill="#1f78d1"/>` +
                eye(30, 19.4, 3) + blush(30.8, 24.4) + smile('M34 23.8c-1 1-2.4 1.2-3.4.5') +
                sparkle(36, 7)
            ],
            snail: [
              shadow(8) +
                `<ellipse cx="20" cy="26" rx="7.5" ry="9.5" fill="#f4ead8"/>` +
                `<circle cx="17" cy="23" r="1" fill="#d9c3a0"/><circle cx="23" cy="27" r="1.2" fill="#d9c3a0"/><circle cx="19" cy="31" r=".9" fill="#d9c3a0"/><circle cx="22.5" cy="21" r=".8" fill="#d9c3a0"/>` +
                `<ellipse cx="16.5" cy="19.5" rx="2" ry="3" fill="#fff" opacity=".7" transform="rotate(20 16.5 19.5)"/>`,
              shadow(12) +
                `<ellipse cx="22" cy="32" rx="12" ry="4" fill="#e8d5b5"/>` +
                `<circle cx="31" cy="28.5" r="4.3" fill="#e8d5b5"/>` +
                `<path d="M29.8 25.6 28.6 20.6M33.2 26l2-5" stroke="#c9ae85" stroke-width="1.2" stroke-linecap="round" fill="none"/>` +
                `<circle cx="28.4" cy="19.8" r="1.7" fill="#fff"/><circle cx="28.6" cy="19.9" r="1" fill="${INK}"/>` +
                `<circle cx="35.2" cy="20.2" r="1.7" fill="#fff"/><circle cx="35.4" cy="20.3" r="1" fill="${INK}"/>` +
                `<circle cx="20" cy="25.5" r="7" fill="#e0a07a"/><circle cx="20" cy="25.5" r="4.4" fill="#eab792"/>` +
                `<path d="M20 25.5c.8-1.4 2.6-1 2.6.6s-2.2 2.4-3.6 1.2" fill="none" stroke="#b9653f" stroke-width="1.1" stroke-linecap="round"/>` +
                blush(32.6, 30) + smile('M30.2 30.3c.7.6 1.6.6 2.3.1'),
              shadow(15) +
                `<ellipse cx="21" cy="31.8" rx="14" ry="4.4" fill="#e8d5b5"/>` +
                `<circle cx="32.2" cy="28" r="5" fill="#e8d5b5"/>` +
                `<path d="M30.6 24.4 29.4 18.4M34.4 24.8l2.4-6" stroke="#c9ae85" stroke-width="1.3" stroke-linecap="round" fill="none"/>` +
                eye(29.2, 17.8, 1.9) + eye(36.8, 18.2, 1.9) +
                `<circle cx="19" cy="23" r="9.2" fill="#d9825b"/><circle cx="19" cy="23" r="6.6" fill="#e59b73"/><circle cx="19" cy="23" r="4" fill="#d9825b"/>` +
                `<path d="M19 23c1-1.8 3.4-1.2 3.4.8s-2.8 3-4.6 1.6-1-4.6 1.2-5.4" fill="none" stroke="#b9653f" stroke-width="1.2" stroke-linecap="round"/>` +
                `<ellipse cx="14.6" cy="18.4" rx="2.4" ry="1.3" fill="#fff" opacity=".4" transform="rotate(-40 14.6 18.4)"/>` +
                blush(33.8, 30) + smile('M31.4 30.2c.8.7 1.8.7 2.6.1'),
              shadow(17) +
                `<ellipse cx="21" cy="32" rx="16" ry="4.8" fill="#e8d5b5"/>` +
                `<ellipse cx="22" cy="33.6" rx="11" ry="1.8" fill="#f4ead8"/>` +
                `<circle cx="33.6" cy="27.6" r="5.6" fill="#e8d5b5"/>` +
                `<path d="M31.6 23.6 30.2 16.6M35.4 24l1.8-6.6" stroke="#c9ae85" stroke-width="1.4" stroke-linecap="round" fill="none"/>` +
                eye(29.8, 15.6, 2.1) + eye(37.4, 16.4, 2.1) +
                `<circle cx="18" cy="21" r="11.4" fill="#c46b45"/><circle cx="18" cy="21" r="8.6" fill="#da8760"/><circle cx="18" cy="21" r="5.8" fill="#c46b45"/><circle cx="18" cy="21" r="3" fill="#da8760"/>` +
                `<path d="M18 21c1-2 3.8-1.4 3.8.9s-3.2 3.4-5.4 1.8-1.2-5.4 1.4-6.2c3.2-.8 6.2 1.6 5.8 5" fill="none" stroke="#a1532f" stroke-width="1.3" stroke-linecap="round"/>` +
                `<ellipse cx="12.4" cy="14.2" rx="3.2" ry="1.6" fill="#fff" opacity=".4" transform="rotate(-40 12.4 14.2)"/>` +
                blush(35, 30.2) + smile('M32.4 30.6c.9.8 2 .8 2.9.1') +
                sparkle(7, 8)
            ],
            plant: [
              shadow(11) +
                `<ellipse cx="20" cy="33.5" rx="11" ry="4" fill="#8a6a4d"/>` +
                `<ellipse cx="20" cy="29" rx="5.8" ry="4.6" fill="#c19a6b"/>` +
                sway(`<path d="M20 24.6c0-2.2 1.2-3.4 3-3.6" stroke="#6aa84f" stroke-width="1.6" fill="none" stroke-linecap="round"/>` +
                leaf(23.2, 21.2, 55, 0.45, '#8bc34a')) +
                `<ellipse cx="17.6" cy="27.2" rx="1.6" ry="1" fill="#fff" opacity=".45" transform="rotate(-30 17.6 27.2)"/>` +
                `<g class="pet-eye"><circle cx="18" cy="29.4" r=".9" fill="${INK}"/><circle cx="22" cy="29.4" r=".9" fill="${INK}"/></g>` +
                smile('M19 31.2c.7.6 1.3.6 2 0'),
              shadow(10) + pot() + sway(
                `<path d="M20 26.4V19" stroke="#4f8a4f" stroke-width="2" stroke-linecap="round"/>` +
                leaf(20, 20, -38, 0.85, '#7cb342') + leaf(20, 20, 38, 0.85, '#8bc34a')),
              shadow(10) + pot() + sway(
                `<path d="M20 26.4V13.6" stroke="#4f8a4f" stroke-width="2.2" stroke-linecap="round"/>` +
                leaf(20, 23, -62, 0.95, '#6aa84f') + leaf(20, 23, 62, 0.95, '#7cb342') +
                leaf(20, 17.5, -32, 1.05, '#8bc34a') + leaf(20, 17.5, 32, 1.05, '#7cb342') +
                leaf(20, 14, 0, 0.8, '#9ccc65')),
              shadow(10) + pot() + sway(
                `<path d="M20 26.4V11" stroke="#4f8a4f" stroke-width="2.4" stroke-linecap="round"/>` +
                leaf(20, 24, -66, 1.1, '#5f9e45') + leaf(20, 24, 66, 1.1, '#6aa84f') +
                leaf(20, 19.5, -42, 1.15, '#7cb342') + leaf(20, 19.5, 42, 1.15, '#8bc34a') +
                leaf(20, 15, -16, 0.95, '#8bc34a') + leaf(20, 15, 16, 0.95, '#9ccc65') +
                [0, 72, 144, 216, 288]
                  .map(a => `<circle cx="${(20 + 3.7 * Math.sin((a * Math.PI) / 180)).toFixed(2)}" cy="${(7.6 - 3.7 * Math.cos((a * Math.PI) / 180)).toFixed(2)}" r="3.1" fill="#f4a6b8"/>`)
                  .join('') +
                `<circle cx="20" cy="7.6" r="2.4" fill="#f2c94c"/>`)
            ]
          };
          const set = art[species] || art.fish;
          return wrap(set[Math.max(0, Math.min(3, stage | 0))]);
        }
        function renderNav() {
          $('#topNav').innerHTML = navMarkup();
          $('#bottomNav').innerHTML = navMarkup(true);
          document.querySelectorAll('[data-page]').forEach(
            b =>
              (b.onclick = () => {
                // Deep links can name an Insights view (for example the mosaic
                // formerly known as Gallery). Anything else resets to trends
                // so the page never opens on a stale view.
                insightView = b.dataset.insightsView || 'trends';
                activePage = b.dataset.page;
                settingsView = activePage === 'journal' ? 'journal' : 'main';
                render();
              })
          );
        }
        function pageHead(eyebrow, title, desc, action = '') {
          return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2><p>${desc}</p></div>${action}</div>`;
        }
        function statCard(value, label) {
          return `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`;
        }
        function empty(title, desc, button = 'Create your first habit') {
          return `<div class="empty"><div class="emoji">🌱</div><h3>${title}</h3><p>${desc}</p><button class="btn primary" data-action="new">＋ ${button}</button></div>`;
        }
        // Display-only implementation-intention sentence. Assembled from the
        // stored name/when/where parts and never persisted, so edits and
        // missing parts stay correct. Returns '' when there is nothing to say.
        // Sentence-case the habit name for natural grammar while preserving
        // proper nouns and all-caps acronyms.
        function sentenceCaseHabitName(name) {
          const trimmed = String(name || '').trim();
          if (!trimmed) return trimmed;
          // If the name is all caps (acronym) or starts with a digit/symbol, keep as-is
          if (/^[A-Z0-9][A-Z0-9\s\W]*$/.test(trimmed) && /[A-Z]/.test(trimmed) && !/[a-z]/.test(trimmed)) {
            return trimmed;
          }
          // If it starts with a letter, lowercase the first character
          if (/^[A-Za-z]/.test(trimmed)) {
            return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
          }
          return trimmed;
        }
        function cueSentence(h) {
          const name = sentenceCaseHabitName(h.name);
          const when = String(h.when || '').trim();
          const where = String(h.where || '').trim();
          if (!name || (!when && !where)) return '';
          return `I will ${name}${when ? ' ' + when : ''}${where ? ' ' + where : ''}`;
        }
        function habitCard(h, mode = 'today') {
          const k = today(),
            c = count(h, k),
            g = goal(h),
            done = completed(h, k),
            time = isTimeHabit(h),
            pctVal = Math.min(100, pct(c, g));
          const stateLabel = done
            ? 'Completed'
            : c
              ? 'In progress'
              : 'Not started';
          const shown = time ? formatMinutes(c) : c;
          const target = time ? formatMinutes(g) : g;
          const counterHint = time
            ? 'Open the Focus timer to log time.'
            : done
              ? 'At your target. Press and hold to subtract one.'
              : 'Tap to add one; press and hold to subtract one.';
          // Time habits open the timer instead of incrementing a rep counter.
          const counter = time
            ? `<button class="count-btn ${done ? 'done' : c ? 'partial' : ''}" data-action="focus-habit" data-id="${esc(h.id)}" aria-label="${esc(h.name)}: ${shown} of ${target} today. Open the Focus timer." title="${stateLabel} · ${shown}/${target} — open Focus">${shown}/${target}</button>`
            : `<button class="count-btn ${done ? 'done' : c ? 'partial' : ''}" data-action="count" data-id="${esc(h.id)}" aria-label="${esc(h.name)}: ${c} of ${g} today. ${counterHint}" title="${stateLabel} · ${c}/${g} — ${done ? 'hold to subtract' : 'tap adds one, hold subtracts'}">${c}/${g}</button>`;
          state.pets = state.pets || {};
          const p = ensurePet(h.id);
          const stageName = PET_STAGES[p.stage].name;
          return `<article class="habit-card" style="--hc:${h.color}"><div class="habit-top"><div class="habit-icon" aria-hidden="true">${esc(h.icon)}</div><div class="habit-info"><h3>${esc(h.name)}</h3>${cueSentence(h) ? `<p class="habit-cue">${esc(cueSentence(h))}</p>` : ''}<p>${currentStreak(h)}-day streak · best ${bestStreak(h)} · ${stageName}</p><span class="category-tag">${esc(h.category || 'General')}</span></div><div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:44px;height:44px">${petSvg(p.species, p.stage)}</div>${counter}</div></div>${g > 1 ? `<div class="progress-row"><div class="track" role="progressbar" aria-label="${esc(h.name)} progress" aria-valuemin="0" aria-valuemax="${g}" aria-valuenow="${c}"><span style="width:${pctVal}%"></span></div><span class="progress-label">${pctVal}%</span></div>` : ''}<div class="card-actions"><span class="small-text">${h.days.length === 7 ? 'Every day' : h.days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(' · ')}</span><span class="grow"></span><button data-action="history" data-id="${esc(h.id)}">History</button><button data-action="edit" data-id="${esc(h.id)}">Edit</button></div></article>`;
        }
        function quoteForToday() {
          const n = Number(today().replaceAll('-', ''));
          return QUOTES[((n % QUOTES.length) + QUOTES.length) % QUOTES.length];
        }
        function quoteIndex(q = quoteForToday()) {
          return QUOTES.findIndex(x => x.text === q.text);
        }
        function recoveryStats() {
          let misses = 0,
            resumes = 0;
          for (const h of state.habits) {
            let previousMiss = false;
            for (let k = h.start; k <= today(); k = shift(k, 1)) {
              if (!scheduled(h, k)) continue;
              const done = completed(h, k);
              if (previousMiss && done) resumes++;
              if (!done && k < today()) misses++;
              previousMiss = !done;
            }
          }
          return { misses, resumes };
        }
        function recoveryMessage() {
          const active = state.habits.filter(h => eligible(h, today()));
          const cameBack = active.some(
            h =>
              completed(h, today()) &&
              (() => {
                let k = shift(today(), -1);
                while (k >= h.start && !scheduled(h, k)) k = shift(k, -1);
                return k >= h.start && !completed(h, k);
              })()
          );
          return cameBack
            ? 'You showed up again. One missed day didn’t erase the effort you’ve already made.'
            : 'A missed day is information, not a verdict. Your best streak and all past progress remain yours.';
        }
        function renderQuoteCard() {
          const q = quoteForToday(),
            idx = quoteIndex(q),
            saved = state.savedQuotes.includes(idx);
          return `<section class="quote-card" aria-label="Daily inspiration"><p class="quote-text">${esc(q.text)}</p><div class="quote-author">— ${esc(q.author)}</div><div class="card-actions"><button data-action="save-quote" data-quote="${idx}" aria-pressed="${saved}">${saved ? '♥ Saved' : '♡ Save quote'}</button><span class="grow"></span><button data-page="journal">Journal &amp; reflections →</button></div></section>`;
        }
        // Unfinished intentions from the last few days that are not already present in
        // today's list. Matching text from different days is carried only once,
        // preferring the newest day; same-day duplicates remain separate. Past
        // entries are never modified by carrying. Explicitly deleted carried items are
        // remembered per source day + normalized text so they don't resurface.
        function carryPending() {
          const seen = new Set(
            (Array.isArray(state.tasks?.[today()]) ? state.tasks[today()] : [])
              .map(t => String(t.text || '').trim().toLowerCase())
          );
          state.dismissedCarries = state.dismissedCarries || {};
          const cutoff = shift(today(), -8);
          for (const k of Object.keys(state.dismissedCarries)) {
            const idx = k.indexOf('::');
            if (idx < 0) {
              delete state.dismissedCarries[k];
              continue;
            }
            const d = k.slice(0, idx);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < cutoff) {
              delete state.dismissedCarries[k];
            }
          }
          const candidates = [];
          const maxDays = 7;
          for (let i = 1; i <= maxDays; i++) {
            const key = shift(today(), -i);
            if (!Array.isArray(state.tasks?.[key])) continue;
            const foundOnDate = new Set();
            for (const t of state.tasks[key]) {
              const text = String(t.text || '').trim();
              if (!text) continue;
              if (t.done) continue;
              const norm = text.toLowerCase();
              if (seen.has(norm)) continue;
              if (state.dismissedCarries[`${key}::${norm}`]) continue;
              candidates.push({ ...t, _from: key });
              foundOnDate.add(norm);
            }
            for (const text of foundOnDate) seen.add(text);
          }
          return candidates;
        }
        // The single text rule for a daily intention: trimmed and capped at the
        // same 120 characters the add form and normalize() enforce. Used by the
        // inline editor so an edit can never store more than a new entry.
        function intentionText(value) {
          return String(value == null ? '' : value)
            .trim()
            .slice(0, 120);
        }
        // Intentions are renamed in place, with no extra button: the label is
        // both the text and the trigger (double-click, press-and-hold on touch,
        // or Enter/F2 from the keyboard). The editor is swapped into the same
        // slot and the commit writes the DOM directly instead of re-rendering,
        // because a re-render during a blur would swallow the click the user
        // was aiming at and drop the scroll position.
        const TASK_EDIT_HOLD = 500;
        function syncTaskRowLabels(row, text) {
          if (!row) return;
          const box = row.querySelector('input[type="checkbox"]');
          if (box)
            box.setAttribute(
              'aria-label',
              `Mark ${text} ${box.checked ? 'incomplete' : 'complete'}`
            );
          const del = row.querySelector('button[data-action="task-delete"]');
          if (del) del.setAttribute('aria-label', `Delete task: ${text}`);
        }
        function beginTaskEdit(label) {
          if (!label || label.dataset.editing === '1') return;
          const list = Array.isArray(state.tasks?.[today()])
            ? state.tasks[today()]
            : [];
          const task = list.find(t => t.id === label.dataset.taskId);
          if (!task) return;
          const original = String(task.text || '');
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'task-edit';
          input.maxLength = 120;
          input.autocomplete = 'off';
          input.value = original;
          input.setAttribute('aria-label', 'Edit intention');
          label.dataset.editing = '1';
          label.replaceWith(input);
          input.focus();
          input.select();
          let settled = false;
          const finish = (commit, keepFocus) => {
            if (settled) return;
            settled = true;
            const next = commit ? intentionText(input.value) : original;
            input.replaceWith(label);
            delete label.dataset.editing;
            // An empty save is treated as "no change" rather than a deletion:
            // removing an intention stays an explicit choice via its × button.
            if (next && next !== original) {
              task.text = next;
              label.textContent = next;
              syncTaskRowLabels(label.closest('.task-row'), next);
              save();
            }
            if (keepFocus) label.focus();
          };
          input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              finish(true, true);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              finish(false, true);
            }
          });
          input.addEventListener('blur', () => finish(true, false));
        }
        function renderTasks() {
          const list = Array.isArray(state.tasks?.[today()])
            ? state.tasks[today()]
            : [];
          const done = list.filter(t => t.done).length;
          const carry = carryPending();
          let html = `<div class="panel intentions"><div class="section-title" style="margin:0 0 4px"><h3>Daily intentions</h3><span class="spacer"></span><span class="task-progress">${done} of ${list.length}</span></div><p class="small-text">A few things you would like to do today. These are separate from habits—no streaks, no guilt. Double-click an intention to edit it—or press and hold on a touch screen.</p>`;
          html += list.length
            ? `<div class="task-list">${list.map(t => `<div class="task-row ${t.done ? 'done' : ''}"><input type="checkbox" data-action="task-toggle" data-id="${esc(t.id)}" aria-label="Mark ${esc(t.text)} ${t.done ? 'incomplete' : 'complete'}" ${t.done ? 'checked' : ''}><span class="task-label" data-task-id="${esc(t.id)}" tabindex="0" title="Double-click to edit">${esc(t.text)}</span><button type="button" data-action="task-delete" data-id="${esc(t.id)}" aria-label="Delete task: ${esc(t.text)}" title="Delete task">×</button></div>`).join('')}</div>`
            : `<div class="empty" style="padding:18px;margin-top:12px"><div class="emoji">☀️</div><strong>No tasks for today</strong><p>Add one small intention if it would help. You can also leave this section empty.</p></div>`;
          html += `<form id="taskForm" class="task-add"><input id="taskInput" type="text" maxlength="120" autocomplete="off" placeholder="Add a small intention…" aria-label="New daily intention"><button class="btn primary" type="submit">Add</button></form>`;
          html += `<p id="taskHint" class="small-text task-hint hidden"></p><span id="taskLimitStatus" class="sr-only" role="status"></span>`;
          if (carry.length) {
            const groups = new Map();
            for (const c of carry) {
              if (!groups.has(c._from)) groups.set(c._from, []);
              groups.get(c._from).push(c);
            }
            const parts = [];
            for (const [d, items] of [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
              parts.push(`${items.length} from ${d}`);
            }
            html += `<div class="card-actions"><span class="small-text grow">${carry.length} unfinished item${carry.length === 1 ? '' : 's'} (${parts.join(', ')})</span><button class="btn small" type="button" data-action="task-carry">Bring forward</button></div>`;
          }
          html += `<p class="small-text" style="margin:10px 0 0">Unfinished tasks can stay in the past or be brought forward when you choose (up to the last 7 days). They never affect habit streaks or insights.</p></div>`;
          return html;
        }
        function renderToday() {
          const s = stats();
          const action =
            '<button class="btn primary" data-action="new">＋ New habit</button>';
          const now = new Date(),
            hour = now.getHours();
          let html = pageHead(
            now.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            }),
            hour < 12
              ? 'Good morning'
              : hour < 18
                ? 'Good afternoon'
                : 'Good evening',
            'Small steps add up. Focus on what you can do today.',
            action
          );
          html += `<div class="stats">${statCard(`${s.done}/${s.applicable.length}`, 'Habits completed today')}${statCard(`${s.rate}%`, 'Today’s completion rate')}${statCard(Math.max(0, ...state.habits.map(currentStreak)), 'Longest current streak')}</div>`;
          if (!state.habits.length)
            html += empty(
              'Start with one small habit',
              'Add a habit you want to make part of your life. Your progress stays in this browser.'
            );
          else {
            const incomplete = s.applicable.filter(h => !completed(h, today()));
            const done = s.applicable.filter(h => completed(h, today()));
            const notToday = state.habits.filter(h => !eligible(h));
            html += `<div class="section-title"><h3>Up next</h3><span>${incomplete.length} remaining</span></div>`;
            html += incomplete.length
              ? `<div class="habit-list">${incomplete.map(h => habitCard(h)).join('')}</div>`
              : `<div class="panel"><strong>✨ You’re all caught up.</strong><p class="small-text">${s.applicable.length ? 'You completed every habit scheduled for today. Take a moment to celebrate.' : 'No habits are scheduled for today.'}</p></div>`;
            if (done.length) {
              const shown = todaySections.completedExpanded
                ? done
                : done.slice(0, COMPLETED_PREVIEW);
              html += `<div class="section-title"><h3>Completed</h3><span>${done.length}</span></div><div class="habit-list" id="completedList">${shown.map(h => habitCard(h)).join('')}</div>`;
              if (done.length > COMPLETED_PREVIEW)
                html += `<button type="button" class="section-toggle" data-action="toggle-completed" aria-expanded="${todaySections.completedExpanded}" aria-controls="completedList">${todaySections.completedExpanded ? 'Show fewer' : `Show all ${done.length}`}</button>`;
            }
            if (notToday.length) {
              const expanded = todaySections.notTodayExpanded;
              html += `<div class="section-title"><h3><button type="button" class="section-toggle" data-action="toggle-not-today" aria-expanded="${expanded}" aria-controls="notScheduledList">${expanded ? '▾' : '▸'} Not scheduled today</button></h3><span>${notToday.length}</span></div><div class="habit-list" id="notScheduledList" ${expanded ? '' : 'hidden'}>${notToday.map(h => habitCard(h)).join('')}</div>`;
            }
          }
          html += renderTasks();
          html += `<aside class="note"><h3>Gentle reminder</h3><p>${esc(recoveryMessage())}</p><p class="small-text">Rest days are part of a routine, too. Your best streak and lifetime completions are never taken away.</p></aside>`;
          html += renderQuoteCard();
          return html;
        }
        function renderHabits() {
          let html = pageHead(
            'Your routine',
            'My habits',
            `${state.habits.length} ${state.habits.length === 1 ? 'habit' : 'habits'} in your routine.`,
            '<button class="btn primary" data-action="new">＋ New habit</button>'
          );
          if (!state.habits.length)
            return (
              html +
              empty(
                'Your routine starts here',
                'Create a habit, choose its category and schedule, and track progress over time.'
              )
            );
          const groups = new Map();
          for (const h of state.habits) {
            const c = h.category || 'General';
            if (!groups.has(c)) groups.set(c, []);
            groups.get(c).push(h);
          }
          // With a long routine the page becomes a wall of cards, so each
          // category is a disclosure in the same shape as the Today sections.
          // The threshold keeps small routines fully expanded: collapsing three
          // habits would only add clicks.
          const collapsible = state.habits.length >= CATEGORY_COLLAPSE_THRESHOLD;
          const sorted = [...groups.entries()].sort((a, b) =>
            a[0].localeCompare(b[0])
          );
          sorted.forEach(([category, habits], i) => {
            // Index-based id: category names are user text and cannot be
            // interpolated into an id safely or predictably.
            const listId = `categoryList${i}`;
            const dueToday = habits.filter(h => eligible(h));
            const doneToday = dueToday.filter(h => completed(h, today()));
            const expanded =
              !collapsible || !habitSections.collapsed.has(category);
            const summary = dueToday.length
              ? `${doneToday.length} of ${dueToday.length} done today`
              : `${habits.length} ${habits.length === 1 ? 'habit' : 'habits'}`;
            const heading = collapsible
              ? `<button type="button" class="section-toggle" data-action="toggle-category" data-category="${esc(category)}" aria-expanded="${expanded}" aria-controls="${listId}"><span aria-hidden="true">${expanded ? '▾' : '▸'}</span> ${esc(category)}</button>`
              : esc(category);
            // The id is only needed as an aria-controls target, so it is only
            // emitted when the heading is actually a disclosure control.
            const listAttrs = collapsible
              ? `id="${listId}" ${expanded ? '' : 'hidden'}`
              : '';
            html += `<div class="category-heading"><h3>${heading}</h3><span>${esc(summary)}</span></div><div class="habit-list" ${listAttrs}>${habits.map(h => habitCard(h, 'all')).join('')}</div>`;
          });
          return html;
        }
        function renderHistoryBody() {
          if (!state.habits.length)
            return empty(
              'Your history starts with a habit',
              'Once you begin tracking, your progress will appear here.'
            );
          let html = `<div class="panel"><h3>Completion heatmap</h3><p class="small-text">Each row of squares follows the calendar week. Your timeline starts on the habit’s start date, so dates before it are not shown as missed days. Future squares are planned days and cannot be marked complete yet.</p><div class="legend"><span><i class="dot full"></i>Completed</span><span><i class="dot partial"></i>Partial</span><span><i class="dot"></i>No progress</span><span><i class="dot hollow"></i>Not scheduled</span><span><i class="dot outlined"></i>Today</span><span><i class="dot faint"></i>Future</span></div></div>`;
          const end = shift(today(), 14);
          for (const h of state.habits) {
            let cells = '';
            const firstDow = new Date(h.start + 'T12:00:00').getDay();
            for (let i = 0; i < firstDow; i++)
              cells += '<span class="grid-spacer" aria-hidden="true"></span>';
            for (let k = h.start; k <= end; k = shift(k, 1)) {
              const future = k > today(),
                sched = scheduled(h, k);
              let cls = 'day-cell';
              if (future) cls += ' future';
              else if (completed(h, k)) cls += ' full';
              else if (count(h, k) > 0) cls += ' partial';
              if (k === today()) cls += ' today';
              if (!sched) cls += ' unscheduled';
              const status = future
                ? sched
                  ? 'Upcoming scheduled day'
                  : 'Future · not scheduled'
                : !sched
                  ? 'Unscheduled'
                  : completed(h, k)
                    ? 'Complete'
                    : count(h, k) > 0
                      ? 'Partial progress'
                      : 'No completion';
              if (future)
                cells += `<span class="day-cell future ${sched ? '' : 'unscheduled'}" style="--hc:${h.color}" title="${fmt(k)} · ${status}" aria-label="${esc(h.name)}, ${fmt(k)}, ${status}"></span>`;
              else
                cells += `<button class="${cls}" style="--hc:${h.color}" data-action="day" data-id="${esc(h.id)}" data-date="${k}" title="${fmt(k)} · ${status}" aria-label="${esc(h.name)}, ${fmt(k)}, ${status}"></button>`;
            }
            html += `<div class="panel"><div class="habit-top"><div class="habit-icon" style="--hc:${h.color}">${esc(h.icon)}</div><div class="habit-info"><h3>${esc(h.name)}</h3><p>${currentStreak(h)} current · ${bestStreak(h)} best streak</p></div></div><div class="habit-grid">${cells}</div><p class="small-text">Starts ${fmt(h.start)} · showing through ${fmt(end)}. ${h.days.length === 7 ? 'Scheduled every day.' : 'Scheduled ' + h.days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ') + '.'}</p></div>`;
          }
          return html;
        }
        function completionStats(h, period) {
          const end = today(),
            start = shift(end, -(period - 1));
          let scheduledDays = 0,
            completedDays = 0,
            unitsDone = 0,
            unitsPossible = 0;
          for (let k = start; k <= end; k = shift(k, 1)) {
            if (k < h.start || !scheduled(h, k)) continue;
            scheduledDays++;
            unitsPossible += goal(h);
            const n = count(h, k);
            unitsDone += Math.min(n, goal(h));
            if (n >= goal(h)) completedDays++;
          }
          return {
            scheduledDays,
            completedDays,
            rate: pct(completedDays, scheduledDays),
            unitsDone,
            unitsPossible,
            unitRate: pct(unitsDone, unitsPossible)
          };
        }
        function renderInsights() {
          // Three views share one page head so the switcher reads as part of the
          // page rather than as nested tabs. Each renderer below returns body
          // markup only; the mosaic used to be its own Gallery page.
          const switcher = `<div class="seg" role="tablist" aria-label="Insights view"><button data-insight-view="trends" role="tab" aria-selected="${insightView === 'trends'}" class="${insightView === 'trends' ? 'active' : ''}">Trends</button><button data-insight-view="history" role="tab" aria-selected="${insightView === 'history'}" class="${insightView === 'history' ? 'active' : ''}">History</button><button data-insight-view="habitat" role="tab" aria-selected="${insightView === 'habitat'}" class="${insightView === 'habitat' ? 'active' : ''}">Habitat</button></div>`;
          if (insightView === 'habitat')
            return (
              pageHead(
                'Your companions',
                'Habitat',
                'Each habit has a companion that grows alongside it. Complete scheduled days to help yours grow; rest days never set them back.'
              ) +
              switcher +
              renderHabitat()
            );
          if (insightView === 'history')
            return (
              pageHead(
                'Look back',
                'History',
                'Each habit has its own timeline: from its start date through today, with the next 14 days shown for planning.'
              ) +
              switcher +
              renderHistoryBody()
            );
          return (
            pageHead(
              'Patterns, not pressure',
              'Insights',
              'Understand your consistency and discover which routines are sticking.'
            ) +
            switcher +
            renderTrends()
          );
        }
        function renderTrends() {
          const allCategories = [
            'All categories',
            ...new Set(
              state.habits
                .map(h => h.category || 'General')
                .sort((a, b) => a.localeCompare(b))
            )
          ];
          if (!state.habits.length)
            return empty(
              'Insights grow with your habits',
              'Add a habit and log a few days. Your trends and category comparisons will appear here.'
            );
          if (!allCategories.includes(insightCategory))
            insightCategory = 'All categories';
          const habits = state.habits.filter(
            h =>
              insightCategory === 'All categories' ||
              (h.category || 'General') === insightCategory
          );
          const rows = habits.map(h => ({
            h,
            ...completionStats(h, insightPeriod)
          }));
          const totalScheduled = rows.reduce((n, r) => n + r.scheduledDays, 0),
            totalCompleted = rows.reduce((n, r) => n + r.completedDays, 0),
            rate = pct(totalCompleted, totalScheduled);
          const currentBest = Math.max(0, ...habits.map(currentStreak));
          const recovery = recoveryStats();
          let html = '';
          html += `<div class="insight-controls"><div class="field"><label for="insightPeriod">Time period</label><select id="insightPeriod"><option value="7" ${insightPeriod === 7 ? 'selected' : ''}>Last 7 days</option><option value="30" ${insightPeriod === 30 ? 'selected' : ''}>Last 30 days</option><option value="90" ${insightPeriod === 90 ? 'selected' : ''}>Last 90 days</option></select></div><div class="field"><label for="insightCategory">Category</label><select id="insightCategory">${allCategories.map(c => `<option value="${esc(c)}" ${c === insightCategory ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div></div>`;
          html += `<div class="stats">${statCard(`${rate}%`, 'Scheduled days completed')}${statCard(`${totalCompleted}/${totalScheduled}`, 'Successful scheduled days')}${statCard(currentBest, 'Longest current streak')}</div><div class="note"><h3>Gentle recovery</h3><p class="muted">${recovery.resumes} ${recovery.resumes === 1 ? 'return after a missed scheduled day' : 'returns after missed scheduled days'} recorded across your habits. Best streaks and lifetime completions remain intact.</p><p class="small-text">A return means a habit was completed on a scheduled day after a previous scheduled day was missed. Planned rest days are ignored.</p></div>`;
          html += `<div class="panel"><h3>Category overview</h3><p class="small-text">Completion rate is based on scheduled days within the selected period, starting no earlier than each habit’s start date. Future and unscheduled days are excluded.</p>`;
          const cats = [
            ...new Set(state.habits.map(h => h.category || 'General'))
          ].sort((a, b) => a.localeCompare(b));
          if (insightCategory !== 'All categories') {
            const subset = rows;
            html += `<div class="bar-row"><span>${esc(insightCategory)}</span><div class="bar-track"><span style="width:${rate}%"></span></div><strong>${rate}%</strong></div>`;
          } else {
            for (const c of cats) {
              const cr = state.habits
                .filter(h => (h.category || 'General') === c)
                .map(h => completionStats(h, insightPeriod));
              const sd = cr.reduce((n, r) => n + r.scheduledDays, 0),
                cd = cr.reduce((n, r) => n + r.completedDays, 0),
                cp = pct(cd, sd);
              html += `<div class="bar-row"><span>${esc(c)}</span><div class="bar-track" role="img" aria-label="${esc(c)} completion ${cp}%"><span style="width:${cp}%"></span></div><strong>${cp}%</strong></div>`;
            }
          }
          html += `</div>`;
          html += `<div class="panel"><h3>${insightCategory === 'All categories' ? 'Habit breakdown' : esc(insightCategory) + ' habits'}</h3>`;
          if (!rows.length)
            html += `<p class="muted">No habits in this category yet.</p>`;
          else {
            for (const r of [...rows].sort(
              (a, b) => b.rate - a.rate || a.h.name.localeCompare(b.h.name)
            )) {
              html += `<div class="habit-insight"><div class="habit-icon" style="--hc:${r.h.color}">${esc(r.h.icon)}</div><div><h4>${esc(r.h.name)}</h4><p>${esc(r.h.category || 'General')} · ${r.completedDays}/${r.scheduledDays} scheduled days · ${currentStreak(r.h)} current streak</p></div><strong>${r.rate}%</strong></div>`;
            }
          }
          html += `</div><div class="insight-note">Use these numbers as a guide, not a score. A low percentage can simply mean a habit is new or your schedule needs adjusting.</div>`;
          return html;
        }
        function renderJournal() {
          if (journalDate > today()) journalDate = today();
          const entry = state.journal[journalDate] || {
            note: '',
            wentWell: '',
            challenge: '',
            grateful: '',
            mood: ''
          };
          const saved = Object.entries(state.journal)
            .filter(
              ([k, v]) =>
                k <= today() &&
                [v.note, v.wentWell, v.challenge, v.grateful, v.mood].some(x =>
                  String(x || '').trim()
                )
            )
            .sort((a, b) => b[0].localeCompare(a[0]));
          const qids = [...state.savedQuotes].sort((a, b) => a - b);
          let html = pageHead(
            'A little space for you',
            'Journal',
            'A private pause for your thoughts. Optional, short, and never required to complete a habit.',
            '<button type="button" class="btn" data-action="close-journal-view">← Settings</button>'
          );
          html += `<div class="panel journal-editor"><div class="two"><div class="field"><label for="journalDate">Entry date</label><input type="date" id="journalDate" value="${journalDate}" max="${today()}"></div><div class="field"><label>How are you feeling?</label><div class="mood-pick">${[
            ['great', '😁 Great'],
            ['good', '🙂 Good'],
            ['okay', '😐 Okay'],
            ['low', '😔 Low'],
            ['rough', '🫠 Rough']
          ]
            .map(
              ([v, l]) =>
                `<button type="button" data-mood="${v}" class="${entry.mood === v ? 'selected' : ''}" aria-pressed="${entry.mood === v}">${l}</button>`
            )
            .join(
              ''
            )}</div></div></div><div class="field"><label for="journalNote">Anything on your mind? (optional)</label><textarea id="journalNote" maxlength="5000" placeholder="A thought, a moment, or a few words…">${esc(entry.note)}</textarea></div><div class="journal-grid"><div class="field"><label for="journalWell">What went well today?</label><textarea id="journalWell" maxlength="1500" placeholder="Big or small counts.">${esc(entry.wentWell)}</textarea></div><div class="field"><label for="journalChallenge">What challenged you?</label><textarea id="journalChallenge" maxlength="1500" placeholder="No need to solve it right now.">${esc(entry.challenge)}</textarea></div></div><div class="field"><label for="journalGrateful">What are you grateful for?</label><textarea id="journalGrateful" maxlength="1500" placeholder="Something you want to remember.">${esc(entry.grateful)}</textarea></div><div class="card-actions"><span class="small-text grow">You can write as little or as much as you want.</span><button class="btn primary" data-action="save-journal">Save entry</button><button class="btn" data-action="clear-journal">Clear day</button></div></div>`;
          html += `<div class="panel"><h3>Find an entry</h3><div class="field"><label for="journalSearch">Search your journal</label><input id="journalSearch" type="text" value="${esc(journalSearch)}" placeholder="Search words in your entries…"></div>`;
          const found = saved.filter(
            ([k, v]) =>
              !journalSearch ||
              [k, v.note, v.wentWell, v.challenge, v.grateful, v.mood]
                .join(' ')
                .toLowerCase()
                .includes(journalSearch.toLowerCase())
          );
          html += found.length
            ? found
                .map(
                  ([k, v]) =>
                    `<div class="journal-entry"><button class="btn small" data-action="open-journal" data-date="${k}">${fmt(k)} · ${v.mood ? esc(v.mood) : 'No mood selected'}</button>${v.note ? `<p>${esc(v.note.slice(0, 240))}${v.note.length > 240 ? '…' : ''}</p>` : ''}${v.wentWell ? `<p><strong>Went well:</strong> ${esc(v.wentWell.slice(0, 180))}</p>` : ''}${v.challenge ? `<p><strong>Challenge:</strong> ${esc(v.challenge.slice(0, 180))}</p>` : ''}${v.grateful ? `<p><strong>Grateful for:</strong> ${esc(v.grateful.slice(0, 180))}</p>` : ''}</div>`
                )
                .join('')
            : `<p class="muted small-text">${journalSearch ? 'No entries match that search.' : 'Your saved entries will appear here.'}</p>`;
          html += `</div><div class="panel"><h3>Saved inspiration</h3><p class="small-text">Quotes you save on Today live here for whenever you need them.</p>`;
          html += qids.length
            ? qids
                .map(
                  i =>
                    `<div class="journal-entry"><p><strong>“${esc(QUOTES[i].text)}”</strong></p><p class="small-text">— ${esc(QUOTES[i].author)}</p><button class="btn small" data-action="save-quote" data-quote="${i}">♥ Remove from saved</button></div>`
                )
                .join('')
            : `<p class="muted small-text">No saved quotes yet. Save one from the Today page.</p>`;
          html += `</div>`;
          const dayHabits = state.habits.filter(
            h => journalDate >= h.start && scheduled(h, journalDate)
          );
          const dayDone = dayHabits.filter(h => completed(h, journalDate));
          html += `<div class="panel"><h3>Habit snapshot · ${fmt(journalDate)}</h3><p class="muted small-text">An optional glance at how your habits and reflections fit together. This does not change any habit status.</p>${dayHabits.length ? `<p><strong>${dayDone.length} of ${dayHabits.length}</strong> scheduled habits completed</p><p class="small-text">${dayHabits.map(h => `${completed(h, journalDate) ? '✓' : '○'} ${esc(h.name)}`).join(' · ')}</p>` : `<p class="muted small-text">No habits scheduled for this date.</p>`}</div><div class="privacy-note">🔒 Journal entries stay in this browser and are included in your JSON backup. Browser local storage is <strong>not encrypted by default</strong>; anyone with access to this browser profile may be able to read it. Browser cleanup can erase it, so export backups regularly.</div>`;
          return html;
        }
        const ZOO_MAX = 30;
        function renderHabitat() {
          if (!state.habits.length)
            return empty(
              'Your companions start with a habit',
              'Create a habit and a companion will join you, growing as you complete scheduled days.'
            );
          const total = state.habits.length;
          const zooShown = Math.min(total, ZOO_MAX);
          const header =
            `<div class="card-actions" style="margin:0 0 var(--sp-3);align-items:center;flex-wrap:wrap;gap:var(--sp-2)">` +
            `<div class="seg" role="tablist" aria-label="Habitat view">` +
            `<button type="button" data-habitat-mode="zoo" role="tab" aria-selected="${habitatMode === 'zoo'}" class="${habitatMode === 'zoo' ? 'active' : ''}">Zoo (${zooShown})</button>` +
            `<button type="button" data-habitat-mode="cards" role="tab" aria-selected="${habitatMode === 'cards'}" class="${habitatMode === 'cards' ? 'active' : ''}">Cards (${total})</button>` +
            `</div>` +
            `<span class="grow"></span>` +
            `<span class="small-text muted">${habitatMode === 'zoo' ? (zooShown < total ? `Showing the first ${zooShown} companions in the scene; the rest appear in Cards.` : 'All companions are in the scene.') : 'All companions shown as cards.'}</span>` +
            `</div>`;
          const body = habitatMode === 'zoo' ? renderZoo() : renderHabitatCards();
          const unnamed = state.habits.some(h => !String(h.petName || '').trim());
          const nameHint =
            unnamed && habitatMode === 'zoo'
              ? `<p class="small-text muted" style="margin:0 0 var(--sp-3)">Companions without a name use their habit's name. You can name one while editing the habit.</p>`
              : '';
          return header + nameHint + body;
        }

        function petDisplayName(h) {
          const n = String(h.petName || '').trim();
          return n || h.name;
        }
        function renderZoo() {
          const rnd = (id, salt) => {
            let h = (2166136261 ^ salt) >>> 0;
            for (const c of id) {
              h ^= c.charCodeAt(0);
              h = Math.imul(h, 16777619);
            }
            return ((h >>> 0) % 10000) / 10000;
          };
          const habits = state.habits.slice(0, ZOO_MAX);
          const plantCount = habits.filter(h => ensurePet(h.id).species === 'plant').length || 1;
          let plantIndex = 0;
          const actors = habits
            .map(h => {
              const p = ensurePet(h.id),
                kind = ['fish', 'snail', 'plant'].includes(p.species) ? p.species : 'fish',
                r = n => rnd(h.id, n),
                pname = petDisplayName(h);
              let size, x0, x1, t, place, z;
              if (kind === 'fish') {
                size = 40 + p.stage * 10;
                x0 = 12 + r(1) * 30;
                x1 = x0 + 20 + r(2) * 26;
                t = 12 + r(4) * 10;
                place = `--y:${(4 + r(3) * 28).toFixed(1)}%`;
                z = 40;
              } else if (kind === 'snail') {
                size = 38 + p.stage * 8;
                x0 = 12 + r(1) * 30;
                x1 = x0 + 14 + r(2) * 24;
                t = 40 + r(4) * 30;
                const by = 4 + r(3) * 9;
                place = `--by:${by.toFixed(1)}%`;
                z = Math.round(30 - by);
              } else {
                size = 44 + p.stage * 9;
                x0 = x1 = 12 + ((plantIndex + 0.5) / plantCount) * 76 + (r(1) - 0.5) * 4;
                t = 20;
                const by = 3 + r(3) * 5;
                place = `--by:${by.toFixed(1)}%`;
                z = Math.round(30 - by);
                plantIndex++;
              }
              const done = eligible(h) && completed(h, today());
              const named = String(h.petName || '').trim();
              const tagLabel = named
                ? `Open details for ${h.name}. Companion: ${pname}.`
                : `Open details for ${h.name}.`;
              const style =
                `--x0:${x0.toFixed(1)}%;--x1:${x1.toFixed(1)}%;${place};--t:${t.toFixed(1)}s;` +
                `--d:${(-r(5) * 2 * t).toFixed(1)}s;--bt:${(3 + r(6) * 3).toFixed(1)}s;--s:${size}px;--z:${z}`;
              return (
                `<div class="zoo-actor kind-${kind}" style="${style}">` +
                `<button type="button" class="zoo-tag${done ? ' done' : ''}" data-action="zoo-open" data-id="${esc(h.id)}" aria-label="${esc(tagLabel)}">${esc(h.icon)} ${esc(pname)}${done ? ' ✓' : ''}</button>` +
                `<div class="zoo-body" aria-hidden="true">` +
                `<span class="zoo-flip"><span class="zoo-bob">${petSvg(kind, p.stage)}</span></span></div></div>`
              );
            })
            .join('');
          const weeds = [6, 31, 58, 88]
            .map(
              (x, i) =>
                `<svg class="zoo-weed" style="left:${x}%;--wd:${i * -1.3}s" viewBox="0 0 20 44" aria-hidden="true"><path d="M10 44C3 33 17 27 10 16S11 5 10 2" fill="none" stroke="#5f9e45" stroke-width="3.4" stroke-linecap="round"/></svg>`
            )
            .join('');
          const bubbles = [10, 27, 46, 66, 83]
            .map((x, i) => `<span style="left:${x}%;--bd:${5 + i * 1.3}s;--bs:${-i * 1.7}s"></span>`)
            .join('');
          const due = habits.filter(h => eligible(h)),
            careDone = due.filter(h => completed(h, today())).length;
          return (
            `<div class="small-text muted" style="margin:0 0 var(--sp-2)">${careDone} of ${due.length} habits cared for today. Tap a companion tag to open its habit card.</div>` +
            `<div class="zoo" role="group" aria-label="Habitat with your companions"><div class="zoo-water">${weeds}<div class="zoo-bubbles" aria-hidden="true">${bubbles}</div></div><div class="zoo-ground" aria-hidden="true"></div>${actors}</div>`
          );
        }

        function renderHabitatCards() {
          state.pets = state.pets || {};
          let html = `<div class="panel" style="background:linear-gradient(180deg, color-mix(in srgb, #64b5f6 12%, var(--card)) 0%, var(--card) 100%);"><h3>Your companions</h3><p class="small-text">Each companion grows with completed scheduled days. Missed or rest days never shrink them—they are here to keep you company, not to judge.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-4);margin-top:var(--sp-4)">${state.habits
            .map(h => {
              const p = ensurePet(h.id);
              const stage = PET_STAGES[p.stage];
              const next = PET_STAGES[p.stage + 1];
              const xp = p.xp;
              const need = next ? next.xp - xp : 0;
              const pctXp = next ? Math.min(100, Math.round((100 * (xp - stage.xp)) / Math.max(1, next.xp - stage.xp))) : 100;
              const pname = petDisplayName(h);
              const context = pname === h.name ? '' : `<span class="small-text">for ${esc(h.name)}</span>`;
              return `<div class="art-card" id="pet-card-${esc(h.id)}" tabindex="-1" style="text-align:center"><div class="pet-btn" aria-hidden="true">${petSvg(p.species, p.stage)}</div><h4>${esc(h.icon)} ${esc(pname)}</h4><p class="small-text" style="margin:2px 0 4px">${context}${context ? ' · ' : ''}${stage.name} · ${xp} care points</p>${next ? `<div class="track" style="margin:8px auto;max-width:160px"><span style="width:${pctXp}%"></span></div><p class="small-text">${need} more to reach ${next.name}</p>` : `<p class="small-text">Fully grown — keep up the gentle care.</p>`}<div class="card-actions" style="justify-content:center"><button type="button" class="btn small" data-action="zoo-open" data-id="${esc(h.id)}">Open habit card</button></div></div>`;
            })
            .join('')}</div></div>`;
          return html;
        }
        function renderMosaic() {
          return renderHabitat();
        }
        // ---------- Focus / Pomodoro ----------
        // Minutes logged by a completed focus block land in the habit's normal
        // `done[date]` slot, so the timer needs no special cases downstream.
        function focusModeSeconds(mode = focusTimer.mode) {
          const cfg = (state.settings && state.settings.focus) || FOCUS_DEFAULTS;
          const value =
            mode === 'short' ? cfg.short : mode === 'long' ? cfg.long : cfg.focus;
          const fallback =
            mode === 'short'
              ? FOCUS_DEFAULTS.short
              : mode === 'long'
                ? FOCUS_DEFAULTS.long
                : FOCUS_DEFAULTS.focus;
          return Math.max(60, Math.round(Number(value) || fallback) * 60);
        }
        function focusRemainingSeconds() {
          if (focusTimer.running)
            return Math.max(0, Math.round((focusTimer.endsAt - Date.now()) / 1000));
          return Math.max(0, focusTimer.remaining);
        }
        function focusModeLabel(mode = focusTimer.mode) {
          return mode === 'short'
            ? 'Short break'
            : mode === 'long'
              ? 'Long break'
              : 'Focus';
        }
        function focusHabit() {
          return focusTimer.habitId
            ? state.habits.find(h => h.id === focusTimer.habitId)
            : null;
        }
        function stopFocusTicker() {
          if (focusTicker) clearInterval(focusTicker);
          focusTicker = null;
        }
        function persistTimer() {
          try {
            localStorage.setItem(
              TIMER_KEY,
              JSON.stringify({
                mode: focusTimer.mode,
                habitId: focusTimer.habitId,
                running: focusTimer.running,
                endsAt: focusTimer.endsAt,
                remaining: focusTimer.remaining,
                cycle: focusTimer.cycle
              })
            );
          } catch (_) {}
        }
        function setFocusMode(mode) {
          focusTimer.mode =
            mode === 'short' || mode === 'long' ? mode : 'focus';
          focusTimer.running = false;
          focusTimer.endsAt = 0;
          focusTimer.remaining = focusModeSeconds(focusTimer.mode);
          stopFocusTicker();
          persistTimer();
          document.title = baseTitle;
          render();
        }
        function updateTimerDisplay(left) {
          const total = focusModeSeconds();
          const ratio = total ? Math.max(0, Math.min(1, left / total)) : 0;
          const ring = document.getElementById('focusRing');
          if (ring) ring.style.strokeDashoffset = String(100 * (1 - ratio));
          const clock = document.getElementById('focusClock');
          if (clock) clock.textContent = clockText(left);
          document.title = focusTimer.running
            ? `${clockText(left)} · ${focusModeLabel()} — Evrida`
            : baseTitle;
        }
        function startFocusTimer() {
          let left = focusRemainingSeconds();
          if (left <= 0) {
            focusTimer.remaining = focusModeSeconds();
            left = focusTimer.remaining;
          }
          focusTimer.running = true;
          focusTimer.remaining = left;
          focusTimer.endsAt = Date.now() + left * 1000;
          persistTimer();
          stopFocusTicker();
          focusTicker = setInterval(tickFocus, 1000);
          render();
          updateTimerDisplay(left);
        }
        function pauseFocusTimer() {
          focusTimer.remaining = focusRemainingSeconds();
          focusTimer.running = false;
          focusTimer.endsAt = 0;
          stopFocusTicker();
          persistTimer();
          document.title = baseTitle;
          render();
        }
        function resetFocusTimer() {
          focusTimer.running = false;
          focusTimer.endsAt = 0;
          focusTimer.remaining = focusModeSeconds();
          stopFocusTicker();
          persistTimer();
          document.title = baseTitle;
          render();
        }
        function tickFocus() {
          if (!focusTimer.running) return;
          const left = focusRemainingSeconds();
          updateTimerDisplay(left);
          if (left <= 0) {
            stopFocusTicker();
            focusTimer.running = false;
            focusTimer.remaining = 0;
            focusTimer.endsAt = 0;
            completeFocusSession();
          }
        }
        function creditFocusSession(minutes) {
          const date = today();
          const h = focusHabit();
          const mins = Math.max(
            1,
            Math.min(1440, Math.round(Number(minutes) || 0))
          );
          state.sessions = Array.isArray(state.sessions) ? state.sessions : [];
          const id = `f${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
          state.sessions.push({
            id,
            habitId: h ? h.id : '',
            date,
            minutes: mins,
            at: Date.now(),
            kind: 'focus',
            note: ''
          });
          if (state.sessions.length > 3000)
            state.sessions = state.sessions.slice(-3000);
          if (h && date >= h.start) {
            const wasDone = completed(h, date);
            h.done = h.done || {};
            h.done[date] = Math.min(999, count(h, date) + mins);
            if (!wasDone && completed(h, date) && scheduled(h, date))
              addPetXP(h.id, 1);
          }
          lastSessionId = id;
          save();
          return id;
        }
        function chime() {
          if ((state.settings.focus || {}).sound === false) return;
          try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            if (!audioCtx) audioCtx = new AC();
            if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
            const ctx = audioCtx;
            const now = ctx.currentTime;
            [880, 1174.66].forEach((freq, i) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              const at = now + i * 0.18;
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, at);
              gain.gain.setValueAtTime(0.0001, at);
              gain.gain.exponentialRampToValueAtTime(0.12, at + 0.02);
              gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
              osc.connect(gain).connect(ctx.destination);
              osc.start(at);
              osc.stop(at + 0.55);
            });
          } catch (_) {}
        }
        function completeFocusSession(opts = {}) {
          const wasFocus = focusTimer.mode === 'focus';
          const minutes = Math.max(
            1,
            Math.round(focusModeSeconds('focus') / 60)
          );
          if (wasFocus) {
            creditFocusSession(minutes);
            const cfg = state.settings.focus || FOCUS_DEFAULTS;
            const every = Math.max(2, Number(cfg.every) || FOCUS_DEFAULTS.every);
            focusTimer.cycle = (focusTimer.cycle + 1) % every;
            focusTimer.mode = focusTimer.cycle === 0 ? 'long' : 'short';
          } else {
            focusTimer.mode = 'focus';
          }
          focusTimer.running = false;
          focusTimer.endsAt = 0;
          focusTimer.remaining = focusModeSeconds();
          stopFocusTicker();
          persistTimer();
          document.title = baseTitle;
          if (!opts.silent) chime();
          render();
          if (!opts.silent) {
            const habit = focusHabit();
            notify(
              wasFocus
                ? `${formatMinutes(minutes)} logged${habit ? ' to ' + habit.name : ''}. Time for a ${focusTimer.mode === 'long' ? 'long ' : 'short '}break.`
                : 'Break over. Ready when you are.',
              false
            );
          }
        }
        function restoreTimer() {
          let saved = null;
          try {
            const raw = localStorage.getItem(TIMER_KEY);
            saved = raw ? JSON.parse(raw) : null;
          } catch (_) {
            saved = null;
          }
          if (!saved || typeof saved !== 'object') {
            focusTimer.remaining = focusModeSeconds();
            return;
          }
          focusTimer.mode =
            saved.mode === 'short' || saved.mode === 'long'
              ? saved.mode
              : 'focus';
          focusTimer.habitId =
            typeof saved.habitId === 'string' ? saved.habitId : '';
          if (
            focusTimer.habitId &&
            !state.habits.some(h => h.id === focusTimer.habitId)
          )
            focusTimer.habitId = '';
          focusTimer.cycle = Number.isFinite(Number(saved.cycle))
            ? Math.max(0, Math.round(Number(saved.cycle)))
            : 0;
          focusTimer.remaining = Number.isFinite(Number(saved.remaining))
            ? Math.max(0, Math.round(Number(saved.remaining)))
            : focusModeSeconds();
          const endsAt = Number(saved.endsAt);
          focusTimer.running = saved.running === true && endsAt > 0;
          focusTimer.endsAt = focusTimer.running ? endsAt : 0;
          if (focusTimer.running) {
            if (focusTimer.endsAt <= Date.now()) {
              // Completed while the tab was closed or asleep: credit once.
              focusTimer.running = false;
              focusTimer.remaining = 0;
              completeFocusSession({ silent: true });
            } else {
              stopFocusTicker();
              focusTicker = setInterval(tickFocus, 1000);
            }
          } else if (!focusTimer.remaining) {
            focusTimer.remaining = focusModeSeconds();
          }
        }
        function lastPlayedDate(h) {
          let last = '';
          for (const [k, v] of Object.entries(h.done || {})) {
            if (Number(v) > 0 && k > last) last = k;
          }
          return last;
        }
        function sparkBars(h, days = 14) {
          const vals = [];
          let max = 1;
          for (let i = days - 1; i >= 0; i--) {
            const k = shift(today(), -i);
            const v = count(h, k);
            vals.push({ k, v });
            if (v > max) max = v;
          }
          return `<span class="spark" aria-hidden="true">${vals
            .map(
              ({ k, v }) =>
                `<i style="height:${Math.max(8, Math.round((v / max) * 100))}%" title="${esc(fmt(k))} · ${formatMinutes(v)}"></i>`
            )
            .join('')}</span>`;
        }
        function focusLibraryCard(h) {
          const minutes = habitMinutes(h);
          const sessions = (state.sessions || []).filter(
            s => s.habitId === h.id
          ).length;
          const last = lastPlayedDate(h);
          const lastLabel = last
            ? last === today()
              ? 'today'
              : last === shift(today(), -1)
                ? 'yesterday'
                : fmt(last)
            : 'not yet';
          const milestone = [...MILESTONES]
            .reverse()
            .find(m => minutes >= m * 60);
          const active = focusTimer.running && focusTimer.habitId === h.id;
          return `<article class="lib-card${active ? ' on-clock' : ''}" style="--hc:${h.color}"><div class="lib-cover" aria-hidden="true">${esc(h.icon)}</div><div class="lib-body"><div class="lib-head"><h4>${esc(h.name)}</h4><strong class="lib-hours">${hoursLabel(minutes)}</strong></div><p class="small-text">${esc(h.category || 'General')} · ${sessions} session${sessions === 1 ? '' : 's'} · last played ${lastLabel}</p>${sparkBars(h)}${milestone ? `<span class="lib-badge">${milestone} hour${milestone === 1 ? '' : 's'} milestone</span>` : ''}${active ? '<span class="lib-badge live">● on the clock</span>' : ''}</div><button type="button" class="btn small" data-action="focus-habit" data-id="${esc(h.id)}">${active ? 'Timing' : 'Focus'}</button></article>`;
        }
        function renderFocus() {
          if (!focusTimer.running) document.title = baseTitle;
          const cfg = state.settings.focus || FOCUS_DEFAULTS;
          const timeHabits = state.habits.filter(isTimeHabit);
          const habit = focusHabit();
          const left = focusRemainingSeconds();
          const total = focusModeSeconds();
          const ratio = total ? Math.max(0, Math.min(1, left / total)) : 0;
          const timeTotal =
            state.habits.reduce((n, h) => n + habitMinutes(h), 0) +
            unassignedMinutes();
          const weekTotal = timeHabits.reduce(
            (n, h) => n + minutesInLastDays(h, 7),
            0
          );
          const sessionCount = (state.sessions || []).filter(
            s => s.kind === 'focus'
          ).length;
          const modeBtn = (m, label) =>
            `<button type="button" data-action="focus-mode" data-mode="${m}" role="tab" aria-selected="${focusTimer.mode === m}" class="${focusTimer.mode === m ? 'active' : ''}">${label}</button>`;
          const habitOptions = timeHabits
            .map(
              h =>
                `<option value="${esc(h.id)}" ${focusTimer.habitId === h.id ? 'selected' : ''}>${esc(h.icon)} ${esc(h.name)}</option>`
            )
            .join('');
          const startLabel =
            left < total && left > 0 ? 'Resume' : 'Start';
          const startBtn = focusTimer.running
            ? '<button type="button" class="btn primary" data-action="focus-pause">Pause</button>'
            : `<button type="button" class="btn primary" data-action="focus-start">${startLabel}</button>`;
          let html = pageHead(
            'Time well spent',
            'Focus',
            'Work in focused blocks, log the time to a habit, and watch your hours add up. Hours are a record of effort, not a score.'
          );
          html += `<div class="panel focus-panel"><div class="seg focus-modes" role="tablist" aria-label="Timer mode">${modeBtn('focus', 'Focus')}${modeBtn('short', 'Short break')}${modeBtn('long', 'Long break')}</div><div class="focus-stage"><div class="focus-ring-wrap"><svg class="focus-ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="focus-ring-track" cx="60" cy="60" r="54"></circle><circle id="focusRing" class="focus-ring-fill" cx="60" cy="60" r="54" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${100 * (1 - ratio)}"></circle></svg><div class="focus-clock-wrap"><span id="focusClock" class="focus-clock" role="timer" aria-live="off">${clockText(left)}</span><span class="focus-phase">${focusModeLabel()}</span></div></div><div class="focus-controls">${startBtn}<button type="button" class="btn" data-action="focus-reset">Reset</button></div></div>`;
          if (!timeHabits.length) {
            html += `<p class="muted small-text">No time habits yet. Create one and choose “Time” under Track by to start logging hours.</p>`;
          } else {
            html += `<div class="field focus-pick"><label for="focusHabit">What are you working on?</label><select id="focusHabit"><option value="" ${!focusTimer.habitId ? 'selected' : ''}>No habit — just track time</option>${habitOptions}</select><p class="small-text muted">${habit ? `${formatMinutes(count(habit, today()))} logged today · target ${formatMinutes(goal(habit))}` : 'Choose a time habit to credit your minutes to it.'}</p></div>`;
          }
          html += `<p class="small-text focus-cycle">${focusTimer.cycle}/${Math.max(2, Number(cfg.every) || FOCUS_DEFAULTS.every)} focus blocks until a long break. Sessions log only when a focus block completes.</p></div>`;
          html += `<div class="stats">${statCard(hoursLabel(timeTotal), 'Hours invested')}${statCard(hoursLabel(weekTotal), 'Last 7 days')}${statCard(sessionCount, 'Focus sessions')}</div>`;
          const sortSelect = `<select id="focusSort"><option value="played" ${focusSort === 'played' ? 'selected' : ''}>Most played</option><option value="recent" ${focusSort === 'recent' ? 'selected' : ''}>Recently played</option><option value="name" ${focusSort === 'name' ? 'selected' : ''}>Name</option></select>`;
          html += `<div class="panel"><div class="habit-top"><h3>Your time library</h3><span class="grow"></span><div class="focus-sort"><label for="focusSort" class="sr-only">Sort time habits</label>${sortSelect}</div></div><p class="small-text">Every completed focus block and manual entry adds to a habit’s hours. This is a record of effort, not a score.</p>`;
          if (!timeHabits.length) {
            html += empty(
              'Your time library is waiting',
              'Create a habit with Track by set to Time, then the timer and its hours will appear here.'
            );
          } else {
            const sorted = [...timeHabits].sort((a, b) => {
              if (focusSort === 'name') return a.name.localeCompare(b.name);
              if (focusSort === 'recent')
                return (
                  (lastPlayedDate(b) || '').localeCompare(
                    lastPlayedDate(a) || ''
                  ) || a.name.localeCompare(b.name)
                );
              return (
                habitMinutes(b) - habitMinutes(a) ||
                a.name.localeCompare(b.name)
              );
            });
            html += `<div class="library">${sorted.map(focusLibraryCard).join('')}</div>`;
          }
          html += `</div>`;
          const recent = [...(state.sessions || [])]
            .sort(
              (a, b) =>
                (Number(b.at) || 0) - (Number(a.at) || 0) ||
                (b.date || '').localeCompare(a.date || '')
            )
            .slice(0, 8);
          html += `<div class="panel"><h3>Recent sessions</h3>`;
          if (!recent.length) {
            html += `<p class="muted small-text">Completed focus blocks and manual entries will appear here.</p>`;
          } else {
            html += `<div class="session-list">${recent
              .map(s => {
                const sh = state.habits.find(h => h.id === s.habitId);
                const when = s.date === today() ? 'today' : fmt(s.date);
                return `<div class="session-row"><span class="session-ico" style="--hc:${sh ? sh.color : 'var(--slate)'}" aria-hidden="true">${sh ? esc(sh.icon) : '◷'}</span><div class="session-copy"><strong>${sh ? esc(sh.name) : 'Unassigned time'}</strong><span class="small-text">${when} · ${s.kind === 'manual' ? 'manual entry' : 'focus block'}</span></div><span class="session-mins">${formatMinutes(s.minutes)}</span></div>`;
              })
              .join('')}</div>`;
          }
          html += `</div>`;
          html += `<div class="panel"><h3>Log time manually</h3><p class="small-text">Forgot to run the timer? Add minutes to a time habit.</p>`;
          if (!timeHabits.length) {
            html += `<p class="muted small-text">Create a time habit first.</p>`;
          } else {
            html += `<form id="manualLogForm" class="manual-log"><div class="two"><div class="field"><label for="manualHabit">Habit</label><select id="manualHabit">${timeHabits.map(h => `<option value="${esc(h.id)}">${esc(h.icon)} ${esc(h.name)}</option>`).join('')}</select></div><div class="field"><label for="manualDate">Date</label><input id="manualDate" type="date" max="${today()}" value="${today()}"></div></div><div class="two"><div class="field"><label for="manualMinutes">Minutes</label><input id="manualMinutes" type="number" min="1" max="1440" step="1" value="30" required></div><div class="field"><label for="manualNote">Note (optional)</label><input id="manualNote" type="text" maxlength="200"></div></div><div class="card-actions"><span class="grow"></span><button class="btn primary" type="submit">Log time</button></div></form>`;
          }
          html += `</div>`;
          html += `<div class="panel"><div class="habit-top"><h3>Timer settings</h3><span class="grow"></span><button type="button" class="btn small" data-action="toggle-focus-settings" aria-expanded="${focusCfgOpen}">${focusCfgOpen ? 'Hide' : 'Edit'}</button></div>`;
          if (focusCfgOpen) {
            html += `<form id="focusCfgForm"><div class="two"><div class="field"><label for="focusLen">Focus length (minutes)</label><input id="focusLen" type="number" min="1" max="180" value="${cfg.focus}" required></div><div class="field"><label for="shortLen">Short break (minutes)</label><input id="shortLen" type="number" min="1" max="60" value="${cfg.short}" required></div></div><div class="two"><div class="field"><label for="longLen">Long break (minutes)</label><input id="longLen" type="number" min="1" max="90" value="${cfg.long}" required></div><div class="field"><label for="longEvery">Long break every</label><input id="longEvery" type="number" min="2" max="8" value="${cfg.every}" required></div></div><label class="check-row"><input type="checkbox" id="focusSound" ${cfg.sound !== false ? 'checked' : ''}> Play a soft chime when a block ends</label><div class="card-actions"><span class="grow"></span><button class="btn primary" type="submit">Save settings</button></div></form>`;
          }
          html += `</div>`;
          return html;
        }
        function wireFocus() {
          const pick = $('#focusHabit');
          if (pick)
            pick.onchange = e => {
              focusTimer.habitId = e.target.value;
              persistTimer();
              render();
            };
          const sort = $('#focusSort');
          if (sort)
            sort.onchange = e => {
              focusSort = e.target.value;
              render();
            };
          const manual = $('#manualLogForm');
          if (manual)
            manual.onsubmit = e => {
              e.preventDefault();
              const habitId = $('#manualHabit').value;
              const date = $('#manualDate').value || today();
              const minutes = Number($('#manualMinutes').value);
              const note = String($('#manualNote').value || '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 200);
              const h = state.habits.find(x => x.id === habitId);
              if (!h || !isTimeHabit(h)) {
                notify('Choose a time habit to log time.', false);
                return;
              }
              if (date > today() || date < h.start) {
                notify('Choose a date within the habit’s timeline.', false);
                return;
              }
              if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
                notify('Enter between 1 and 1440 minutes.', false);
                return;
              }
              const wasDone = completed(h, date);
              state.sessions = Array.isArray(state.sessions)
                ? state.sessions
                : [];
              state.sessions.push({
                id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
                habitId: h.id,
                date,
                minutes,
                at: Date.now(),
                kind: 'manual',
                note
              });
              if (state.sessions.length > 3000)
                state.sessions = state.sessions.slice(-3000);
              h.done = h.done || {};
              h.done[date] = Math.min(999, count(h, date) + minutes);
              if (!wasDone && completed(h, date) && scheduled(h, date))
                addPetXP(h.id, 1);
              save();
              render();
              notify(`${formatMinutes(minutes)} logged to ${h.name}.`, false);
            };
          const cfgForm = $('#focusCfgForm');
          if (cfgForm)
            cfgForm.onsubmit = e => {
              e.preventDefault();
              const clamp = (v, lo, hi, d) => {
                const n = Math.round(Number(v));
                return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
              };
              state.settings.focus = {
                focus: clamp($('#focusLen').value, 1, 180, FOCUS_DEFAULTS.focus),
                short: clamp($('#shortLen').value, 1, 60, FOCUS_DEFAULTS.short),
                long: clamp($('#longLen').value, 1, 90, FOCUS_DEFAULTS.long),
                every: clamp(
                  $('#longEvery').value,
                  2,
                  8,
                  FOCUS_DEFAULTS.every
                ),
                sound: $('#focusSound').checked
              };
              if (!focusTimer.running)
                focusTimer.remaining = focusModeSeconds();
              persistTimer();
              save();
              render();
              notify('Timer settings saved.', false);
            };
        }
        function renderSettings() {
          return (
            pageHead(
              'Your preferences',
              'Settings',
              'Keep Evrida comfortable, private, and backed up.'
            ) +
            `<div class="panel"><h3>Appearance</h3><div class="setting-row"><div class="setting-copy"><h4>Theme</h4><p>Choose the appearance that feels right for you.</p></div><div style="width:135px"><select id="themeSelect"><option value="system" ${state.settings.theme === 'system' ? 'selected' : ''}>System</option><option value="light" ${state.settings.theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${state.settings.theme === 'dark' ? 'selected' : ''}>Dark</option></select></div></div></div><div class="panel"><h3>Journal &amp; reflections</h3><p class="muted small-text">A private, optional space for dated notes, what went well, challenges, gratitude, and mood. Entries stay in this browser and travel with your backups.</p><div class="setting-row"><div class="setting-copy"><h4>Open your journal</h4><p>Write, search, and revisit past entries.</p></div><button class="btn" data-action="open-journal-view">Open journal</button></div></div><div class="panel"><h3>Backup and restore</h3><p class="muted small-text">Export a backup regularly. It includes your habits, schedules, completion history, journal entries, saved quotes, daily intentions, and preferences. The file is saved wherever your browser downloads files.</p><div class="setting-row"><div class="setting-copy"><h4>Export backup</h4><p>Download a JSON copy of your data.</p></div><button class="btn primary" data-action="export">Export</button></div><div class="setting-row"><div class="setting-copy"><h4>Import backup</h4><p>Validates a backup before replacing your data. A safety copy downloads first.</p></div><button class="btn" data-action="import">Import</button></div></div><div class="panel"><h3>Privacy and storage</h3><div class="privacy-note">🔒 <strong>Your data stays in this browser.</strong> Evrida does not create an account or send your habits to a server. Anyone with access to this browser profile may be able to see the data. Browser storage can be cleared by device cleanup or browser settings, so keep a backup if your history matters.</div><div class="setting-row danger-zone"><div class="setting-copy"><h4>Delete all local data</h4><p>Permanently remove habits, completion history, journal entries, and saved quotes from this browser.</p></div><button class="btn danger" data-action="clear">Delete all</button></div></div><p class="small-text">Evrida ${VERSION}. Stored locally using browser localStorage. No analytics or third-party font requests.</p>`
          );
        }
        function wireJournal() {
          document.querySelectorAll('[data-mood]').forEach(
            b =>
              (b.onclick = () => {
                document.querySelectorAll('[data-mood]').forEach(x => {
                  x.classList.toggle('selected', x === b);
                  x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
                });
              })
          );
          const date = $('#journalDate');
          if (date)
            date.onchange = e => {
              journalDate = e.target.value || today();
              render();
            };
          const search = $('#journalSearch');
          if (search)
            search.oninput = e => {
              const pos = e.target.selectionStart;
              const draft = {
                note: $('#journalNote')?.value || '',
                wentWell: $('#journalWell')?.value || '',
                challenge: $('#journalChallenge')?.value || '',
                grateful: $('#journalGrateful')?.value || '',
                mood:
                  document.querySelector('[data-mood].selected')?.dataset
                    .mood || ''
              };
              journalSearch = e.target.value;
              render();
              $('#journalNote').value = draft.note;
              $('#journalWell').value = draft.wentWell;
              $('#journalChallenge').value = draft.challenge;
              $('#journalGrateful').value = draft.grateful;
              document.querySelectorAll('[data-mood]').forEach(x => {
                x.classList.toggle('selected', x.dataset.mood === draft.mood);
                x.setAttribute(
                  'aria-pressed',
                  x.dataset.mood === draft.mood ? 'true' : 'false'
                );
              });
              const input = $('#journalSearch');
              input.focus();
              input.setSelectionRange(pos, pos);
            };
        }
        function render() {
          applyTheme();
          renderNav();
          const root = $('#main');
          // Journal is now accessed via Settings; History is now an Insights tab.
          // Redirect legacy deep links to their new homes.
          if (activePage === 'journal') {
            activePage = 'settings';
            settingsView = 'journal';
          }
          if (activePage === 'history') {
            activePage = 'insights';
            insightView = 'history';
          }
          root.innerHTML =
            activePage === 'today'
              ? renderToday()
              : activePage === 'habits'
                ? renderHabits()
                : activePage === 'insights'
                  ? renderInsights()
                  : activePage === 'focus'
                    ? renderFocus()
                    : settingsView === 'journal'
                      ? renderJournal()
                      : renderSettings();
          root
            .querySelectorAll('[data-action]')
            .forEach(b => b.addEventListener('click', handleAction));
          // Press-and-hold subtracts one on the habit counter; the OS
          // long-press menu is suppressed so the gesture stays ours.
          root.querySelectorAll('[data-action="count"]').forEach(b => {
            b.addEventListener('pointerdown', startCountHold);
            b.addEventListener('pointerup', endCountHold);
            b.addEventListener('pointerleave', endCountHold);
            b.addEventListener('pointercancel', endCountHold);
            b.addEventListener('contextmenu', (ev) => ev.preventDefault());
          });
          root.querySelectorAll('[data-page]').forEach(b =>
            b.addEventListener('click', () => {
              insightView = b.dataset.insightsView || 'trends';
              activePage = b.dataset.page;
              settingsView = activePage === 'journal' ? 'journal' : 'main';
              render();
            })
          );
          root.querySelectorAll('[data-insight-view]').forEach(b =>
            b.addEventListener('click', () => {
              insightView = b.dataset.insightView;
              render();
            })
          );
          root.querySelectorAll('[data-habitat-mode]').forEach(b =>
            b.addEventListener('click', () => {
              habitatMode = b.dataset.habitatMode;
              render();
            })
          );
          if (activePage === 'settings' && settingsView !== 'journal')
            $('#themeSelect').onchange = e => {
              state.settings.theme = e.target.value;
              save();
              render();
            };
          if (activePage === 'insights' && insightView === 'trends') {
            $('#insightPeriod').onchange = e => {
              insightPeriod = Number(e.target.value);
              render();
            };
            $('#insightCategory').onchange = e => {
              insightCategory = e.target.value;
              render();
            };
          }
          if (activePage === 'settings') {
            wireJournal();
          }
          if (activePage === 'focus') {
            wireFocus();
          }
          if (activePage === 'today') {
            root.querySelectorAll('.task-label[data-task-id]').forEach(label => {
              label.addEventListener('dblclick', () => beginTaskEdit(label));
              label.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === 'F2') {
                  e.preventDefault();
                  beginTaskEdit(label);
                }
              });
              // Touch has no dependable double-click. A short hold opens the
              // editor instead, and any movement cancels it so starting a
              // scroll on the text still scrolls the page.
              let holdTimer = null,
                startX = 0,
                startY = 0,
                touchPointer = false;
              const cancelHold = () => {
                if (holdTimer !== null) {
                  clearTimeout(holdTimer);
                  holdTimer = null;
                }
              };
              const stopTouch = () => {
                touchPointer = false;
                cancelHold();
              };
              label.addEventListener('pointerdown', e => {
                if (e.pointerType === 'mouse') return;
                touchPointer = true;
                startX = e.clientX;
                startY = e.clientY;
                cancelHold();
                holdTimer = setTimeout(() => {
                  holdTimer = null;
                  beginTaskEdit(label);
                }, TASK_EDIT_HOLD);
              });
              label.addEventListener('pointermove', e => {
                if (holdTimer === null) return;
                if (
                  Math.abs(e.clientX - startX) > 8 ||
                  Math.abs(e.clientY - startY) > 8
                )
                  cancelHold();
              });
              label.addEventListener('pointerup', stopTouch);
              label.addEventListener('pointercancel', stopTouch);
              label.addEventListener('pointerleave', cancelHold);
              // The hold must not also open the OS selection/callout sheet.
              // A mouse keeps its context menu so the text stays copyable.
              label.addEventListener('contextmenu', e => {
                if (touchPointer) e.preventDefault();
              });
            });
            const form = $('#taskForm');
            // Character-limit feedback for intentions: a quiet counter appears
            // as the input nears its 120-character cap, and the cap itself is
            // announced once through a polite status region instead of on
            // every keystroke.
            const input = $('#taskInput'),
              hint = $('#taskHint'),
              limitStatus = $('#taskLimitStatus');
            if (input && hint) {
              const limit = Number(input.maxLength) || 120;
              let atLimit = false;
              const syncHint = () => {
                const left = Math.max(0, limit - input.value.length),
                  hit = left === 0;
                hint.classList.toggle('hidden', left > 20);
                hint.textContent = hit
                  ? `${limit} character limit reached.`
                  : `${left} character${left === 1 ? '' : 's'} left`;
                if (hit !== atLimit) {
                  atLimit = hit;
                  if (limitStatus)
                    limitStatus.textContent = hit
                      ? `Character limit reached: ${limit} characters.`
                      : '';
                }
              };
              input.addEventListener('input', syncHint);
              syncHint();
            }
            if (form)
              form.onsubmit = e => {
                e.preventDefault();
                const input = $('#taskInput'),
                  value = input.value.trim();
                if (!value) return;
                state.tasks = state.tasks || {};
                state.tasks[today()] = state.tasks[today()] || [];
                if (state.tasks[today()].length >= 100) {
                  notify('You can add up to 100 intentions per day.', false);
                  return;
                }
                state.tasks[today()].push({
                  id: `t${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
                  text: value.slice(0, 120),
                  done: false
                });
                save();
                render();
                $('#taskInput')?.focus();
                notify('Intention added.', false);
              };
          }
        }
        // Keeps the target field, its label, and hint in step with the chosen
        // tracking type. Time habits allow up to 600 minutes (10 hours).
        function syncHabitUnit() {
          const time = $('#habitUnit').value === 'minutes';
          const goalInput = $('#habitGoal');
          goalInput.max = time ? 600 : 99;
          if (Number(goalInput.value) > Number(goalInput.max))
            goalInput.value = goalInput.max;
          const label = $('#habitGoalLabel');
          if (label)
            label.textContent = time ? 'Daily target (minutes)' : 'Daily target';
          const hint = $('#habitUnitHint');
          if (hint) hint.hidden = !time;
        }
        function openHabit(id = null) {
          editingId = id;
          const h = state.habits.find(x => x.id === id);
          $('#dialogTitle').textContent = h ? 'Edit habit' : 'Create a habit';
          $('#habitName').value = h?.name || '';
          $('#petName').value = h?.petName || '';
          $('#habitWhen').value = h?.when || '';
          $('#habitWhere').value = h?.where || '';
          $('#habitUnit').value = h ? habitUnit(h) : 'count';
          syncHabitUnit();
          $('#habitGoal').value = h ? goal(h) : 1;
          $('#habitStart').value = h?.start || today();
          $('#habitStart').max = today();
          const category = h?.category || 'General';
          $('#habitCategory').value = CATEGORIES.includes(category)
            ? category
            : '__custom__';
          $('#customCategory').value = CATEGORIES.includes(category)
            ? ''
            : category;
          $('#customCategoryWrap').classList.toggle(
            'hidden',
            $('#habitCategory').value !== '__custom__'
          );
          pickedEmoji = h?.icon || EMOJIS[0];
          pickedColor = h?.color || COLORS[state.habits.length % COLORS.length];
          pickedDays = h ? [...h.days] : [0, 1, 2, 3, 4, 5, 6];
          $('#deleteHabit').hidden = !h;
          renderPicks();
          $('#habitDialog').showModal();
          setTimeout(() => $('#habitName').focus(), 50);
        }
        function renderPicks() {
          $('#emojiPick').innerHTML = EMOJIS.map(
            e =>
              `<button type="button" class="${e === pickedEmoji ? 'selected' : ''}" data-emoji="${e}" aria-label="Choose ${e}" aria-pressed="${e === pickedEmoji}">${e}</button>`
          ).join('');
          $('#colorPick').innerHTML = COLORS.map(
            c =>
              `<button type="button" class="${c === pickedColor ? 'selected' : ''}" data-color="${c}" style="background:${c}" aria-label="Choose color ${c}" aria-pressed="${c === pickedColor}"></button>`
          ).join('');
          $('#weekdayPick').innerHTML = DAYS.map(
            (d, i) =>
              `<button type="button" class="${pickedDays.includes(i) ? 'selected' : ''}" data-weekday="${i}" aria-label="${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]}" aria-pressed="${pickedDays.includes(i)}">${d}</button>`
          ).join('');
        }
        $('#emojiPick').onclick = e => {
          const b = e.target.closest('[data-emoji]');
          if (b) {
            pickedEmoji = b.dataset.emoji;
            renderPicks();
          }
        };
        $('#colorPick').onclick = e => {
          const b = e.target.closest('[data-color]');
          if (b) {
            pickedColor = b.dataset.color;
            renderPicks();
          }
        };
        $('#weekdayPick').onclick = e => {
          const b = e.target.closest('[data-weekday]');
          if (b) {
            const d = Number(b.dataset.weekday);
            pickedDays = pickedDays.includes(d)
              ? pickedDays.filter(x => x !== d)
              : [...pickedDays, d];
            renderPicks();
          }
        };
        $('#habitUnit').onchange = syncHabitUnit;
        $('#habitCategory').onchange = () => {
          $('#customCategoryWrap').classList.toggle(
            'hidden',
            $('#habitCategory').value !== '__custom__'
          );
          if ($('#habitCategory').value === '__custom__')
            $('#customCategory').focus();
        };
        $('#habitForm').onsubmit = e => {
          e.preventDefault();
          const name = $('#habitName').value.trim(),
            unit = $('#habitUnit').value === 'minutes' ? 'minutes' : 'count',
            g = Number($('#habitGoal').value),
            start = $('#habitStart').value,
            when = $('#habitWhen').value.replace(/\s+/g, ' ').trim().slice(0, 60),
            where = $('#habitWhere').value.replace(/\s+/g, ' ').trim().slice(0, 60),
            petName = $('#petName').value.replace(/\s+/g, ' ').trim().slice(0, 20),
            category =
              $('#habitCategory').value === '__custom__'
                ? $('#customCategory').value.trim()
                : $('#habitCategory').value;
          if (
            !name ||
            !Number.isInteger(g) ||
            g < 1 ||
            g > (unit === 'minutes' ? 600 : 99) ||
            !start ||
            start > today() ||
            !pickedDays.length ||
            !category ||
            category.length > 32
          ) {
            notify(
              'Check the name, target, category, start date, and scheduled days.',
              false
            );
            return;
          }
          if (editingId) {
            const h = state.habits.find(x => x.id === editingId);
            Object.assign(h, {
              name,
              category,
              goal: g,
              start,
              days: [...pickedDays],
              icon: pickedEmoji,
              color: pickedColor
            });
            if (unit === 'minutes') h.unit = 'minutes';
            else delete h.unit;
            if (when) h.when = when;
            else delete h.when;
            if (where) h.where = where;
            else delete h.where;
            if (petName) h.petName = petName;
            else delete h.petName;
          } else
            state.habits.push({
              id: `h${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
              name,
              category,
              goal: g,
              start,
              days: [...pickedDays],
              icon: pickedEmoji,
              color: pickedColor,
              ...(unit === 'minutes' ? { unit } : {}),
              done: {},
              ...(when ? { when } : {}),
              ...(where ? { where } : {}),
              ...(petName ? { petName } : {})
            });
          save();
          $('#habitDialog').close();
          render();
          notify(editingId ? 'Habit updated.' : 'Habit created.', false);
        };
        $('#cancelHabit').onclick = () => $('#habitDialog').close();
        $('#deleteHabit').onclick = async () => {
          const h = state.habits.find(x => x.id === editingId);
          if (!h) return;
          const ok = await openConfirm(
            'Delete this habit?',
            `“${h.name}” and its completion history will be removed from this browser.`,
            'Delete habit'
          );
          if (!ok) return;
          const index = state.habits.findIndex(x => x.id === editingId);
          const removed = state.habits.splice(index, 1)[0];
          save();
          $('#habitDialog').close();
          render();
          snapshotUndo('Habit deleted.', () => {
            state.habits.splice(index, 0, removed);
          });
        };
        function changeCount(h, k, next) {
          if (k > today()) {
            notify('Future days cannot be logged.', false);
            return;
          }
          if (k < h.start) {
            notify('This date is before the habit start date.', false);
            return;
          }
          const prev = count(h, k);
          const wasDone = completed(h, k);
          if (next <= 0) delete h.done[k];
          else h.done[k] = Math.min(999, next);
          const nowDone = completed(h, k);
          if (nowDone && !wasDone && scheduled(h, k)) {
            addPetXP(h.id, 1);
          }
          save();
          render();
          snapshotUndo(`${h.name}: ${Math.max(0, next)} recorded.`, () => {
            if (prev) h.done[k] = prev;
            else delete h.done[k];
            render();
          });
        }
        // Habit counter gestures: tap adds one toward the target, press and
        // hold subtracts one. Module-level state is required because
        // changeCount() re-renders the card, replacing the button mid-gesture.
        const COUNT_HOLD_MS = 600,
          COUNT_TAP_DEBOUNCE_MS = 400,
          COUNT_CLICK_SUPPRESS_MS = 700;
        let countHoldTimer = null,
          suppressCountClickUntil = 0,
          lastCountTapAt = 0;
        function startCountHold(e) {
          if (e.button) return; // primary mouse button or touch only
          const btn = e.currentTarget;
          btn.classList.add('holding');
          clearTimeout(countHoldTimer);
          countHoldTimer = setTimeout(() => {
            countHoldTimer = null;
            suppressCountClickUntil = performance.now() + COUNT_CLICK_SUPPRESS_MS;
            const h = state.habits.find(x => x.id === btn.dataset.id);
            if (h && count(h, today()) > 0) {
              changeCount(h, today(), count(h, today()) - 1);
            }
          }, COUNT_HOLD_MS);
        }
        function endCountHold(e) {
          if (e && e.currentTarget) e.currentTarget.classList.remove('holding');
          clearTimeout(countHoldTimer);
          countHoldTimer = null;
        }
        // Today-section disclosure: session-only UI state, never persisted.
        const COMPLETED_PREVIEW = 3;
        let todaySections = { completedExpanded: false, notTodayExpanded: false };
        // Habits-page category disclosure. Below this many habits the page stays
        // fully expanded, so a small routine never gets fiddlier to read. State
        // is session-only and keyed by category name; it is not persisted and
        // not included in backups, matching the Today sections and the Insights
        // view switcher.
        const CATEGORY_COLLAPSE_THRESHOLD = 8;
        let habitSections = { collapsed: new Set() };
        async function exportData() {
          const data = JSON.stringify(
            { ...state, app: 'Evrida', exportedAt: new Date().toISOString() },
            null,
            2
          );
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `evrida-backup-${today()}.json`;
          document.body.append(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          notify('Backup exported. Keep it somewhere safe.', false);
        }
        function importData() {
          const f = $('#backupFile');
          f.value = '';
          f.click();
        }
        $('#backupFile').onchange = async e => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            notify('Backup is too large (maximum 5 MB).', false);
            return;
          }
          try {
            const parsed = JSON.parse(await file.text());
            const candidate = normalize(parsed);
            const ok = await openConfirm(
              'Replace local data?',
              `This backup contains ${candidate.habits.length} habit(s). Importing replaces your current habits and history. A safety copy of the current data will be downloaded first.`,
              'Import backup'
            );
            if (!ok) return;
            await exportData();
            state = candidate;
            save();
            render();
            notify('Backup imported successfully.', false);
          } catch (err) {
            notify(
              `Import failed: ${err.message || 'Invalid backup file.'}`,
              false
            );
          }
        };
        async function handleAction(e) {
          const b = e.currentTarget,
            action = b.dataset.action,
            id = b.dataset.id,
            h = state.habits.find(x => x.id === id);
          if (action === 'task-toggle') {
            const list = state.tasks?.[today()] || [],
              task = list.find(t => t.id === id);
            if (task) {
              task.done = b.checked;
              save();
              render();
            }
            return;
          }
          if (action === 'task-delete') {
            const list = state.tasks?.[today()] || [],
              idx = list.findIndex(t => t.id === id);
            if (idx >= 0) {
              const removed = list.splice(idx, 1)[0];
              if (removed && removed.text) {
                state.dismissedCarries = state.dismissedCarries || {};
                const norm = String(removed.text || '').trim().toLowerCase();
                if (norm) {
                  const maxDays = 7;
                  for (let i = 1; i <= maxDays; i++) {
                    const key = shift(today(), -i);
                    if (Array.isArray(state.tasks?.[key])) {
                      const found = state.tasks[key].some(
                        t =>
                          !t.done &&
                          String(t.text || '').trim().toLowerCase() === norm
                      );
                      if (found) {
                        state.dismissedCarries[`${key}::${norm}`] = true;
                      }
                    }
                  }
                }
              }
              if (!list.length) delete state.tasks[today()];
              save();
              render();
              snapshotUndo('Intention removed.', () => {
                state.tasks = state.tasks || {};
                state.tasks[today()] = state.tasks[today()] || [];
                state.tasks[today()].splice(
                  Math.min(idx, state.tasks[today()].length),
                  0,
                  removed
                );
                if (removed && removed.text) {
                  state.dismissedCarries = state.dismissedCarries || {};
                  const norm = String(removed.text || '').trim().toLowerCase();
                  if (norm) {
                    const maxDays = 7;
                    for (let i = 1; i <= maxDays; i++) {
                      const key = shift(today(), -i);
                      const dk = `${key}::${norm}`;
                      if (state.dismissedCarries[dk]) {
                        delete state.dismissedCarries[dk];
                      }
                    }
                  }
                }
                save();
                render();
              });
            }
            return;
          }
          if (action === 'task-carry') {
            const old = carryPending();
            if (!old.length) {
              notify(
                "Unfinished intentions from the past week are already here.",
                false
              );
              return;
            }
            state.tasks = state.tasks || {};
            state.tasks[today()] = state.tasks[today()] || [];
            const room = Math.max(0, 100 - state.tasks[today()].length);
            const copies = old.slice(0, room).map(t => ({
              id: `t${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
              text: t.text,
              done: false
            }));
            state.tasks[today()].push(...copies);
            save();
            render();
            notify(
              copies.length
                ? `${copies.length} intention${copies.length === 1 ? '' : 's'} brought forward.`
                : 'Today already has the maximum number of intentions.',
              false
            );
            return;
          }
          if (action === 'save-quote') {
            const i = Number(b.dataset.quote);
            if (!Number.isInteger(i) || !QUOTES[i]) return;
            state.savedQuotes = state.savedQuotes || [];
            const wasSaved = state.savedQuotes.includes(i);
            state.savedQuotes = wasSaved
              ? state.savedQuotes.filter(x => x !== i)
              : [...state.savedQuotes, i];
            save();
            render();
            notify(
              wasSaved ? 'Quote removed from saved quotes.' : 'Quote saved.',
              false
            );
            return;
          }
          if (action === 'save-journal') {
            const entry = {
              note: $('#journalNote').value.trim(),
              wentWell: $('#journalWell').value.trim(),
              challenge: $('#journalChallenge').value.trim(),
              grateful: $('#journalGrateful').value.trim(),
              mood:
                document.querySelector('[data-mood].selected')?.dataset.mood ||
                ''
            };
            if (Object.values(entry).some(v => String(v).trim()))
              state.journal[journalDate] = entry;
            else delete state.journal[journalDate];
            save();
            render();
            notify('Journal entry saved on this device.', false);
            return;
          }
          if (action === 'clear-journal') {
            if (!state.journal[journalDate]) {
              notify('There is no saved entry for this date.', false);
              return;
            }
            const ok = await openConfirm(
              'Clear this journal entry?',
              `The entry for ${fmt(journalDate)} will be removed from this browser.`,
              'Clear entry'
            );
            if (ok) {
              delete state.journal[journalDate];
              save();
              render();
              notify('Journal entry cleared.', false);
            }
            return;
          }
          if (action === 'open-journal') {
            journalDate = b.dataset.date;
            render();
            return;
          }
          if (action === 'new') return openHabit();
          if (action === 'edit' && h) return openHabit(id);
          if (action === 'export') return exportData();
          if (action === 'import') return importData();
          if (action === 'clear') {
            const ok = await openConfirm(
              'Delete all local data?',
              `This permanently removes ${state.habits.length} habit(s), all history, journal entries, saved quotes, daily intentions, habitat companions, and gallery data from this browser. Export a backup first if you may want it later.`,
              'Delete everything'
            );
            if (ok) {
              const old = state;
              state = defaultState();
              save();
              render();
              snapshotUndo('Local data deleted.', () => {
                state = old;
              });
            }
            return;
          }
          if (action === 'count' && h) {
            const g = goal(h),
              c = count(h, today());
            if (e.shiftKey) {
              if (c > 0) changeCount(h, today(), c - 1);
              return;
            }
            // The click that ends a long-press must not also add one.
            if (performance.now() < suppressCountClickUntil) return;
            // Swallow accidental double-taps; real counting is paced slower.
            if (performance.now() - lastCountTapAt < COUNT_TAP_DEBOUNCE_MS)
              return;
            lastCountTapAt = performance.now();
            changeCount(h, today(), c + 1);
            return;
          }
          if (action === 'toggle-completed') {
            todaySections.completedExpanded = !todaySections.completedExpanded;
            render();
            return;
          }
          if (action === 'toggle-not-today') {
            todaySections.notTodayExpanded = !todaySections.notTodayExpanded;
            render();
            return;
          }
          if (action === 'toggle-category') {
            const category = b.dataset.category;
            if (habitSections.collapsed.has(category))
              habitSections.collapsed.delete(category);
            else habitSections.collapsed.add(category);
            render();
            // The toggle is rebuilt on every render, so restore focus to the
            // matching control instead of letting focus fall to the document.
            const again = document.querySelector(
              `[data-action="toggle-category"][data-category="${CSS.escape(category)}"]`
            );
            if (again) again.focus();
            return;
          }
          if (action === 'focus-mode') {
            setFocusMode(b.dataset.mode);
            return;
          }
          if (action === 'focus-start') {
            startFocusTimer();
            return;
          }
          if (action === 'focus-pause') {
            pauseFocusTimer();
            return;
          }
          if (action === 'focus-reset') {
            resetFocusTimer();
            return;
          }
          if (action === 'focus-habit') {
            focusTimer.habitId = id || '';
            activePage = 'focus';
            persistTimer();
            render();
            return;
          }
          if (action === 'toggle-focus-settings') {
            focusCfgOpen = !focusCfgOpen;
            render();
            return;
          }
          if (action === 'open-journal-view') {
            activePage = 'settings';
            settingsView = 'journal';
            render();
            return;
          }
          if (action === 'close-journal-view') {
            settingsView = 'main';
            render();
            return;
          }
          if (action === 'history' && h) {
            activePage = 'insights';
            insightView = 'history';
            render();
            return;
          }
          if (action === 'day' && h) {
            const k = b.dataset.date;
            if (k > today()) return;
            const prev = count(h, k);
            const next = completed(h, k) ? 0 : goal(h);
            changeCount(h, k, next);
            return;
          }
        }
        $('#headerAdd').onclick = () => openHabit();
        $('#headerExport').onclick = exportData;
        $('#headerTheme').onclick = () => {
          const order = ['system', 'light', 'dark'];
          state.settings.theme =
            order[(order.indexOf(state.settings.theme) + 1) % order.length];
          save();
          render();
          notify(`Theme: ${state.settings.theme}.`, false);
        };
        window.addEventListener('storage', e => {
          if (e.key === KEY && e.newValue) {
            try {
              state = normalize(JSON.parse(e.newValue));
              render();
            } catch (_) {}
          }
        });
        load();
        restoreTimer();
        applyTheme();
        render();
        // A backgrounded tab throttles timers; recompute from the wall clock
        // as soon as it becomes visible again.
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden && focusTimer.running) tickFocus();
        });
        // Offline app shell (PWA). Registers only over http(s) on localhost or
        // a secure origin — opening index.html from file:// is unaffected and
        // never produces console errors. Failures are silent so the console
        // stays clean on hosts that disallow service workers. The worker
        // caches static app files only; user data stays in localStorage.
        if (
          typeof navigator !== 'undefined' &&
          'serviceWorker' in navigator &&
          typeof location !== 'undefined' &&
          (location.protocol === 'https:' ||
            location.hostname === 'localhost' ||
            location.hostname === '127.0.0.1')
        ) {
          window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(() => {});
          });
        }
      })();