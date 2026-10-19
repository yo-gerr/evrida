# Evrida

> **Every day, a little more you.**

Evrida is a free, private, local-first habit tracker and personal-growth journal delivered as a single HTML file. It helps people build routines, record small daily intentions, reflect through journaling, and review progress over time—without turning consistency into a source of guilt.

Evrida is designed to run directly in a modern web browser. It does not require an account, server, build process, package manager, database service, analytics SDK, or third-party font request.

---

## Table of contents

- [Project overview](#project-overview)
- [Guiding principles](#guiding-principles)
- [Features](#features)
- [Technology and architecture](#technology-and-architecture)
- [Quick start](#quick-start)
- [Using Evrida](#using-evrida)
- [Data, storage, and privacy](#data-storage-and-privacy)
- [Backup and restore](#backup-and-restore)
- [Data model](#data-model)
- [Project structure](#project-structure)
- [Development workflow](#development-workflow)
- [Testing and quality checks](#testing-and-quality-checks)
- [Accessibility and responsive design](#accessibility-and-responsive-design)
- [Design system](#design-system)
- [Security considerations](#security-considerations)
- [Known limitations](#known-limitations)
- [Roadmap ideas](#roadmap-ideas)
- [Contribution guidelines](#contribution-guidelines)
- [Release checklist](#release-checklist)
- [License](#license)

---

## Project overview

Evrida brings several lightweight personal-growth tools together in one place:

- Track habits with daily targets and custom schedules.
- Record partial progress as well as completed goals.
- Review historical activity using calendars and progress mosaics.
- Explore completion trends and streaks without treating them as a judgment.
- Write optional journal entries and track a simple mood.
- Maintain a small list of daily intentions.
- Save inspirational quotes for later.
- Switch between system, light, and dark appearance.
- Export and import a JSON backup.

The project intentionally favors a portable, understandable implementation over a large framework. The current application is a self-contained `index.html` document with its HTML, CSS, and JavaScript in the same file.

### Intended audience

People who want a private, low-friction way to keep track of habits and reflect on their days, and developers who want to inspect or adapt a small browser-based application without installing a development stack.

### Product status

This README documents the current single-file implementation. It does not imply that features such as cloud synchronization, user accounts, encryption, automated reminders, or cross-device sync exist.

---

## Guiding principles

1. **Progress without guilt.** The interface should help people notice patterns and restart, not shame them for missing a day.
2. **Local-first by default.** Application data is stored in the browser's `localStorage`; the app does not require a remote service.
3. **User-owned data.** Users should be able to export a portable JSON backup and restore it later.
4. **Low friction.** The app should open quickly and remain usable without installation or a build step.
5. **Respectful privacy language.** Explain what local storage does and does not protect. Do not claim that browser data is encrypted.
6. **Accessible, responsive UI.** Core actions should be operable with a keyboard and remain usable on small screens.
7. **Preserve existing data.** Storage-key, schema, and import changes require particular care because user history may exist only in the browser.

---

## Features

### 1. Today dashboard

- Shows habits applicable to the current date.
- Allows users to mark a habit complete or record incremental progress toward its target.
- Displays progress toward the daily target.
- Includes a daily inspirational quote, with the ability to save or unsave it.
- Provides daily intentions: a lightweight checklist separate from habits.
- Supports bringing forward unfinished intentions from the previous day, subject to the daily item limit.
- Limits each intention to 120 characters and each date to 100 intentions; a remaining-character count appears as the limit approaches, and reaching 120 is announced for screen readers.

A habit can have a target greater than one. Reaching the target marks the day complete; partial progress remains visible.

### 2. Habit management

Each habit can include:

- Name (up to 60 characters).
- Daily target (integer from 1 to 99).
- Start date, not later than today.
- Category, including a custom category.
- Scheduled weekdays.
- Emoji icon.
- Color.
- Date-indexed completion counts.

The current predefined categories are Health & Fitness, Learning, Productivity, Mindfulness, Home, Relationships, Finance, and General. Users can also supply a custom category.

Habit creation requires at least one scheduled weekday. A day before the habit's start date is not eligible for completion logging.

Deleting a habit removes that habit and its associated completion history from the current local dataset. Confirm destructive actions and preserve the app's undo behavior where it is available.

### 3. History and heatmaps

The History area presents habit history and allows users to inspect prior dates. Progress is represented in a calendar-style grid of day cells:

- A filled cell indicates the daily target was reached.
- A lighter filled cell indicates progress was recorded but the target was not reached.
- A hollow, outlined cell indicates a scheduled day with no completion recorded.
- A neutral muted cell indicates a rest or unscheduled day.
- A blank placeholder indicates a day before the habit's start date.
- A faded cell indicates a future date; future dates cannot be logged.

Every cell carries an accessible date label, and each grid is accompanied by a legend that lists all of the states above, so completion state is never communicated by color alone.

Avoid presenting rest days or unscheduled days as failures.

### 4. Insights

Insights summarize progress over a selectable time period and category. Depending on the selected filters, the view includes completion rates, scheduled/completed day counts, habit-level comparisons, and streak information.

These values are descriptive aids, not grades. When changing calculations, account for the habit's start date, scheduled weekdays, partial completions, and the current date.

### 5. Journal

Journal entries are optional and stored locally. A dated entry can contain:

- A free-form note (up to 5,000 characters).
- What went well (up to 1,500 characters).
- A challenge or difficulty (up to 1,500 characters).
- Something the user is grateful for (up to 1,500 characters).
- One mood selection: Great, Good, Okay, Low, or Rough.

Users can select an entry date, search saved entries, reopen an entry, clear an entry, view saved inspiration, and see a read-only snapshot of habits for the selected date.

Journal content is personal information. The interface must continue to explain that local browser storage is not encrypted by default and can be read by someone with access to the same browser profile or device.

### 6. Gallery

Gallery creates a 13-week (91-day) visual mosaic for each habit: one small square per day. It distinguishes completed, partial, scheduled-with-no-completion, unscheduled/rest, pre-start, and future dates, with the same legend used by History. The mosaic is generated from habit history; it is not a separate source of completion truth.

Mosaic squares scale with their card. On narrow screens the gallery cards stack into a single column so the mosaic stays legible rather than squeezing thirteen columns into a small card.

### 7. Appearance

The appearance setting supports:

- **System** — follows the browser/operating-system color preference.
- **Light**
- **Dark**

Theme styles are implemented with CSS custom properties and the document's `data-theme` attribute. Keep both explicit themes and system preference behavior working when updating the UI. Selecting System resolves the actual preference at load time and updates the browser `theme-color` meta accordingly; the light theme uses a warm ivory background and the dark theme a green-tinted charcoal.

### 8. Backup and restore

- Export downloads a JSON backup named `evrida-backup-YYYY-MM-DD.json`.
- The exported object includes the app identifier (`app: "Evrida"`), an export timestamp, and application state.
- Import accepts a JSON file, validates and normalizes its contents, asks for confirmation, and downloads a safety copy before replacing the current state.
- Import rejects files larger than 5 MB.
- The application normalizes imported data rather than trusting arbitrary fields.

Users should keep backups somewhere separate from the browser profile. A backup may contain sensitive journal content and should be protected accordingly.

### 9. Delete local data and undo

Settings includes a destructive action to remove local application data after confirmation. The app also provides an undo mechanism for supported actions, such as some habit-progress changes, habit deletion, intention removal, and clearing local data. Undo availability is action-specific; do not promise that every action can be undone.

---

## Technology and architecture

### Runtime stack

| Area | Current implementation |
|---|---|
| Markup | HTML5 |
| Styling | Inline CSS in `index.html` |
| Application logic | Vanilla JavaScript in `index.html` |
| Persistence | Browser `localStorage` |
| Import/export | JSON, `Blob`, object URLs, browser file input |
| Dialogs | Native HTML `<dialog>` elements |
| Icons/illustrations | Emoji, CSS, and inline/data-URI SVG |
| Dependencies | No runtime package dependencies |
| Build step | None required |
| Server/API | None required |

The application is an immediately invoked JavaScript function. Its main state is normalized when loaded and saved as JSON. Rendering is performed by JavaScript functions that construct the relevant page markup and attach event handlers.

### High-level flow

1. Initialize default application state.
2. Load the saved JSON value from browser storage.
3. Normalize and validate the stored data.
4. Apply the selected theme.
5. Render navigation and the active page.
6. Handle user actions, update state, persist it, and re-render as appropriate.
7. Export or import a JSON backup when requested.

### Important implementation constants

The current implementation includes these concepts:

- `KEY`: localStorage key. It is currently `streakgrid` for backward compatibility with earlier versions.
- `VERSION`: current persisted schema version, currently `6`.
- `CATEGORIES`, `COLORS`, `EMOJIS`, `DAYS`, `NAV`, and `QUOTES`: application configuration and built-in content.

Do not rename the storage key merely because the product has been rebranded. Doing so can make existing data appear to have disappeared. If the key is ever changed, implement a tested migration that reads the previous key and preserves data.

### Browser compatibility

Use a modern browser with support for the APIs and CSS used by the application, including `localStorage`, `Blob`, `URL.createObjectURL`, `<dialog>`, CSS custom properties, CSS `color-mix()`, and modern JavaScript syntax. `color-mix()` is used for habit tints, note surfaces, and progress fills; it is available in Chromium 111+, Safari 16.2+, and Firefox 113+ (all released in 2023), and there is no JavaScript color fallback. Exact minimum browser versions have not otherwise been established as part of the current project.

---

## Quick start

### Option A: Open the file directly

1. Download or clone the project files.
2. Keep `index.html` in a local folder.
3. Open `index.html` in a modern browser.
4. Create a habit and try recording progress.
5. Export a backup before clearing browser data or moving to another device.

No `npm install`, compilation, environment variables, or server account is required for basic local use.

### Option B: Serve it locally

A local static HTTP server can be useful for development and browser testing. For example, if Python is installed, open a terminal in the directory containing the HTML file and run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000/`.

This command is only a development convenience; Python is not an application dependency. If using a different static server, serve the file without rewriting its contents.

### Option C: Host as a static page

The file can be deployed to a static web host. There is no backend to deploy. The project ships as `index.html`, which static hosts serve by default at the site root. If you prefer a different filename such as `Evrida.html`, rename or copy the file and configure the host accordingly.

**Important:** browser storage is origin-specific. Data saved when opening a `file://` URL may not be available when opening the app from `http://localhost`, a different port, or a deployed domain. Export a backup before changing the app's origin, then import it from the new origin.

---

## Using Evrida

### Create a habit

1. Choose **New habit**.
2. Enter a descriptive name.
3. Set the daily target.
4. Select the start date.
5. Choose a category or enter a custom category.
6. Select one or more weekdays.
7. Choose an emoji and color.
8. Save the habit.

Prefer small, measurable targets. For example, “Read 10 pages” is more actionable than “Read more.”

### Record progress

Use the habit's completion control to mark the target complete, or use the incremental controls when the target represents multiple repetitions. Progress cannot be recorded for future dates or dates before the habit's start date.

### Review trends

Use History to inspect individual dates, Insights to compare completion patterns, and Gallery to view the 13-week mosaic. Interpret metrics in context: new habits and intentionally infrequent schedules can have different-looking rates.

### Journal

Choose a date, optionally select a mood, and fill in any reflection fields that feel useful. Save the entry on the device. Journal entries are optional and are not required for habit completion.

### Back up data

Open Settings or use the header Export action. Store the downloaded JSON file somewhere safe. To restore, choose Import and select the backup. Import replaces the current application state, so verify the selected file and keep the safety copy.

---

## Data, storage, and privacy

### Where data lives

The application saves its state in browser `localStorage` under the key `streakgrid`. The key name is intentionally retained for compatibility with earlier Streakgrid-branded builds. Data is scoped to the browser's origin and profile.

### What this means

- No account is created by the current app.
- There is no application server or cloud synchronization in the current implementation.
- Habit records, progress, journal entries, saved quotes, daily intentions, and theme preferences remain in local browser storage unless a user exports them.
- Browser cleanup, clearing site data, changing browser profiles, or moving to another origin can make the data unavailable.
- Local storage is **not encrypted by the application**. Anyone with access to the same browser profile or device may be able to inspect it.
- A downloaded JSON backup contains the exported application data in readable form. Treat it as sensitive if it includes journal entries.

Do not describe “local-first” as equivalent to encrypted, password-protected, or guaranteed-private storage.

### Data-loss prevention

Recommend regular exports, particularly before:

- Clearing browser data.
- Reinstalling a browser or operating system.
- Switching browsers or devices.
- Changing from `file://` to HTTP/HTTPS hosting.
- Testing import, migrations, or destructive actions.

### Cross-tab behavior

The app listens for the browser `storage` event for its storage key and attempts to normalize and render changes from another tab. Changes made in the same tab do not trigger that event; the app persists its own state directly.

---

## Backup and restore

### Export format

The exported JSON is a snapshot of the current normalized state plus metadata. Its general shape is:

```json
{
  "version": 6,
  "habits": [],
  "gallery": [],
  "journal": {},
  "savedQuotes": [],
  "tasks": {},
  "settings": {
    "theme": "system"
  },
  "app": "Evrida",
  "exportedAt": "ISO-8601 timestamp"
}
```

This is an illustrative schema outline, not a complete sample backup. Actual exports contain the user's data.

### Import behavior

Import should be treated as a full state replacement, not a merge. The current implementation validates key fields and normalizes habits, dates, schedules, completion counts, journal fields, saved quote indexes, tasks, and theme preferences. It also limits the number of habits and file size.

When changing the schema:

1. Update normalization deliberately.
2. Preserve compatibility with valid existing exports.
3. Define defaults for missing fields.
4. Reject malformed or out-of-range values safely.
5. Test old exports as well as newly exported files.
6. Keep the safety-copy behavior before replacement.
7. Never execute imported content as code.

Do not include secrets, credentials, or unnecessary metadata in backups.

Backups are plain, readable JSON files that can contain sensitive journal text. Do not commit exported `evrida-backup-*.json` files to a repository; the project `.gitignore` excludes them for that reason.

---

## Data model

The following describes the current logical state. It is documentation for the current implementation, not a promise that the schema will never change.

### Root state

| Property | Purpose |
|---|---|
| `version` | Persisted schema version (`6` in the current build) |
| `habits` | Array of habit records |
| `gallery` | Array of optional gallery-related records retained by normalization |
| `journal` | Object keyed by date (`YYYY-MM-DD`) |
| `savedQuotes` | Array of indexes into the built-in quote list |
| `tasks` | Object keyed by date; each value is a daily intention list |
| `settings.theme` | `system`, `light`, or `dark` |

Exports additionally include `app` and `exportedAt` metadata.

### Habit record

| Property | Purpose |
|---|---|
| `id` | Local record identifier |
| `name` | Display name |
| `category` | Built-in or custom category |
| `goal` | Daily target from 1 to 99 |
| `start` | Start date (`YYYY-MM-DD`) |
| `days` | Scheduled weekdays, represented as integers `0`–`6` (Sunday–Saturday) |
| `icon` | Emoji selected for the habit |
| `color` | Selected color from the app palette; values outside the palette are reassigned by habit position during normalization |
| `done` | Object mapping dates to recorded counts |
| `art` | Optional legacy/additional object retained when present by normalization |

A completion count is capped at 999 during normalization and normal interaction. A date only contributes to scheduled-day metrics when it is on or after the start date and matches the habit's schedule.

### Journal record

A date-keyed journal entry contains `note`, `wentWell`, `challenge`, `grateful`, and `mood`. The mood is one of `great`, `good`, `okay`, `low`, `rough`, or an empty string.

### Daily intention record

Each task has an `id`, `text`, and `done` boolean. Text is limited to 120 characters by normalization and the UI limits each date to 100 intentions.

### Date conventions

Dates are represented as date-only strings in `YYYY-MM-DD` format. Preserve this convention for storage and export. Be careful when converting dates to timestamps: timezone offsets can otherwise shift the intended calendar day.

---

## Project structure

The current project is intentionally a single-file application:

```text
project/
├── index.html    # HTML structure, styles, application state, UI rendering, and behavior
├── README.md     # Project overview and developer/user documentation
├── AGENTS.md     # Instructions for AI coding agents and maintainers
└── tests/        # Zero-dependency Node test suite for the app's pure logic
    ├── helpers/
    │   └── load-app.js   # Extracts the inline script and exposes internal helpers
    ├── dates.test.js     # Date math, boundaries, and percentage rounding
    ├── schedule.test.js  # Scheduled days, eligibility, partial completion
    ├── streaks.test.js   # Current and best streak calculations
    ├── insights.test.js  # Completion, recovery, and summary statistics
    ├── normalize.test.js # Backup/localStorage validation and sanitization
    └── escaping.test.js  # HTML escaping of user-controlled strings
```

The application file was previously named `Evrida.html`; the rename to `index.html` does not affect stored data, backups, or the `streakgrid` localStorage key.

If tests or additional documentation are introduced, keep this tree updated. There is currently no separate source directory, package manifest, bundler configuration, or automated test suite documented as part of the single-file app.

---

## Development workflow

### Before changing code

1. Keep a backup of `index.html`.
2. Export a backup from the app if testing with real user data.
3. Read the complete file before making broad changes.
4. Identify state, persistence, normalization, rendering, event handlers, and related CSS.
5. Decide whether a change affects existing saved data or JSON backups.

### Make focused changes

- Keep changes small and coherent.
- The project is version-controlled with git; review `git diff` before committing and keep commits small and focused.
- Preserve the standalone-file behavior unless a deliberate architectural change is approved.
- Use the existing vanilla JavaScript and CSS patterns for small changes.
- Avoid adding frameworks, CDNs, analytics, external fonts, or network dependencies without a clear product decision.
- Update user-facing copy and this README when behavior changes.
- Keep all destructive operations behind clear confirmation.
- Escape user-provided strings before interpolating them into HTML.
- Maintain schema compatibility and migration behavior.

### Local review

A useful manual development cycle is:

1. Run the automated test suite: `node --test`.
2. Open the app in a modern browser.
3. Check the console for errors.
4. Test the changed feature in both light and dark themes.
5. Test at desktop and mobile viewport widths.
6. Export data before testing import or destructive flows.
7. Verify saved data after refresh.
8. Verify existing backup files remain importable.

---

## Testing and quality checks

The application's pure logic has an automated test suite that runs in Node.js with no additional dependencies. Interactive UI behavior still requires manual testing. Use a combination of the automated suite, static checks, and manual regression tests.

### Automated tests

- **Location:** `tests/`
- **Runner:** Node's built-in `node:test` module (Node.js 20 or newer; developed against Node 24). There are no npm packages, no `package.json`, and no build step.
- **Command:** run `node --test` from the project directory.
- **Coverage:** date parsing, formatting, and shifting (including month, year, and leap-day boundaries); scheduled-day and start-date eligibility; partial versus completed progress; current and best streaks (including rest-day handling and grace for an incomplete today); insight and recovery statistics; HTML escaping of user-controlled strings; and `normalize()` as the validation boundary for `localStorage` data and imported backups, including rejection of malformed input.
- **How it works:** `tests/helpers/load-app.js` reads `index.html`, extracts the inline script, and appends a test-only export hook to the extracted text before evaluating it with minimal DOM stubs. The application file itself is not modified for testability.
- **Scope:** pure logic only. Rendering, dialogs, undo toasts, file import/export flows, themes, and cross-tab synchronization are not covered and remain manual checks.

### Static checks

- Parse the HTML and verify tags are properly structured.
- Extract the inline JavaScript and run a syntax check with Node.js, if available.
- Check for duplicate element IDs.
- Search for stale product names and outdated privacy claims.
- Verify that all referenced element IDs exist.
- Confirm the app can run without network requests.
- Review any new HTML string interpolation for escaping and injection risks.

Example JavaScript syntax check (requires Node.js and a temporary extracted JS file):

```bash
node --check app.js
```

The application currently embeds JavaScript in `index.html`, so `app.js` must be extracted from the HTML first; it is not a file that currently exists in the project.

### Manual regression checklist

- [ ] App opens with no JavaScript errors.
- [ ] Empty state is clear and allows a habit to be created.
- [ ] A habit can be created, edited, and deleted.
- [ ] Invalid targets, names, categories, start dates, and empty schedules are rejected.
- [ ] Daily progress supports partial counts and target completion.
- [ ] Future dates and pre-start dates cannot be logged.
- [ ] Scheduled weekdays are respected by history, streaks, and completion rates.
- [ ] History and gallery show full, partial, scheduled-with-no-completion, unscheduled, pre-start, and future dates appropriately, and each grid shows its legend.
- [ ] Gallery mosaics stay legible, do not overflow their cards, and stack to one column on narrow screens.
- [ ] Insight period and category filters work.
- [ ] Journal entries save, reload, search, reopen, and clear correctly.
- [ ] Mood selection persists.
- [ ] Saved quotes persist and can be removed.
- [ ] Daily intentions can be added, completed, deleted, and carried forward.
- [ ] Daily intention count and text limits are enforced, and the character count appears as the 120-character limit nears.
- [ ] System, light, and dark themes work.
- [ ] Export downloads valid JSON.
- [ ] Import handles a valid backup, malformed JSON, invalid data, and files larger than 5 MB.
- [ ] Import creates a safety copy and requires confirmation before replacement.
- [ ] Delete-all requires confirmation and produces the intended reset.
- [ ] Undo works for actions that advertise it.
- [ ] Data survives refresh in the same browser origin.
- [ ] Existing `streakgrid` local data and earlier valid backups remain usable.
- [ ] Layout and keyboard focus remain usable on small screens.
- [ ] No horizontal scrolling appears at phone, tablet, or desktop widths.
- [ ] Editorial serif titles and quotes and UI-font controls render as intended in both themes.
- [ ] Completed state stays distinguishable without relying on color alone.

### Browser testing note

A successful syntax or HTML parse check is not equivalent to a successful interactive browser test. Record which browsers and flows were actually tested when preparing a release. Where a Chromium-based browser is available, layout and computed-style properties (horizontal overflow, touch-target size, resolved theme tokens, and page structure) can be checked automatically with a headless run, but visual styling still needs a human reviewer.

---

## Accessibility and responsive design

The current implementation includes semantic page regions, labels for form fields, focus-visible styling, accessible names for several icon-only controls, live-region toast feedback, native dialogs, and both top and mobile navigation. Heatmap and mosaic day cells carry accessible date labels, state is never communicated by color alone, and controls meet a 44px touch target where they are primary (smaller swatches remain at or above the 24px WCAG 2.5.8 minimum). Motion is limited and respects `prefers-reduced-motion`.

When changing the UI:

- Keep form labels programmatically associated with inputs.
- Preserve keyboard focus visibility.
- Make interactive controls keyboard operable.
- Use meaningful accessible names for icon-only buttons.
- Maintain readable contrast in light and dark themes.
- Do not rely on color alone to communicate completion.
- Ensure dialogs can be dismissed and do not trap users unexpectedly.
- Avoid removing `aria-label`, `aria-pressed`, or live-region semantics without an equivalent.
- Test narrow screens and browser zoom.
- Respect reduced-motion preferences where animations are added.

---

## Design system

### Brand

- **Name:** Evrida
- **Tagline:** Every day, a little more you.
- **Visual direction:** calm, supportive, clean, and personal; progress should feel encouraging rather than competitive. The interface follows an editorial wellness-journal direction: warm ivory surfaces, forest-green accents, rounded cards, restrained shadows, clear hierarchy, and serif type reserved for editorial content.
- **Brand mark:** forest-green rounded square with a white `E` and a gold accent dot.

### Light theme tokens

| Token | Value |
|---|---|
| Background (`--bg`) | `#F7F5EF` |
| Surface/card (`--card`) | `#FFFFFF` |
| Soft surface (`--soft`) | `#EAEDE5` |
| Primary text (`--ink`) | `#25352B` |
| Muted text (`--muted`) | `#59665B` |
| Border (`--line`) | `#DCDDD3` |
| Accent (`--accent`) | `#496B50` |
| Accent text (`--accentInk`) | `#FFFFFF` |
| Positive status (`--good`) | `#356747` |
| Sage surface (`--sage`) | `#C7D7C1` |
| Terracotta (`--terracotta`) | `#C8795A` |
| Gold (`--gold`) | `#D8B66A` |
| Slate (`--slate`) | `#788A9A` |
| Danger (`--danger`) | `#A4443A` |
| Focus ring (`--focus`) | `#496B50` |
| Progress track (`--progress-track`) | `#C7D7C1` |

### Dark theme tokens

| Token | Value |
|---|---|
| Background (`--bg`) | `#171D19` |
| Surface/card (`--card`) | `#232C25` |
| Soft surface (`--soft`) | `#2B362D` |
| Primary text (`--ink`) | `#F0EEE5` |
| Muted text (`--muted`) | `#B8C2B5` |
| Border (`--line`) | `#39463B` |
| Accent (`--accent`) | `#A9C49F` |
| Accent text (`--accentInk`) | `#171D19` |
| Positive status (`--good`) | `#A9C49F` |
| Sage surface (`--sage`) | `#3A4A3D` |
| Terracotta (`--terracotta`) | `#DE9B7E` |
| Gold (`--gold`) | `#E0C283` |
| Slate (`--slate`) | `#9DB0BF` |
| Danger (`--danger`) | `#E89484` |
| Focus ring (`--focus`) | `#C1D5B8` |
| Progress track (`--progress-track`) | `#2F3B31` |

The actual source of truth for the current design tokens is the CSS in `index.html`; update these tables if those tokens change.

### Typography

- Interface text uses the platform UI font stack (`system-ui` plus common system fallbacks). No web font is downloaded or required.
- Editorial content — page titles, the daily quote, journal prompts, and panel notes — uses a serif stack (`Georgia`, `'Times New Roman'`, serif).
- Numeric readouts such as statistics stay in the UI font stack so figures remain unambiguous.
- Small section labels ("eyebrows") use sentence case rather than uppercase transforms.

### Habit colors

Habits are colored from a fixed nature palette: `#496B50`, `#C8795A`, `#788A9A`, `#A67C29`, `#5F8A6E`, `#3F6D7A`, `#B4707C`, `#6E7F4E`. Each theme derives two presentation colors per habit from the stored hex: a deepened ink for text and outlines, and a fill for completed states. Both are produced with `color-mix()` so one palette works on the ivory light surface and the green-tinted dark surface.

Habit `color` values are validated against the palette during normalization. A habit whose stored color is not in the current palette is reassigned deterministically by its position in the habit list. Color is presentation only; no habit history is lost when the palette changes.

### UI conventions

- Use rounded surfaces and restrained shadows.
- Use the accent color for primary actions, not every control.
- Keep secondary actions visually quieter.
- Use consistent spacing, borders, and rounded corners.
- Preserve legible contrast and focus indicators in both themes.
- Habit colors are selected from a coordinated palette and should remain distinguishable against both surfaces.
- Communicate state with text, outlines, or shape as well as color: completed cells use a filled square, scheduled-but-unlogged cells use a hollow ring, and future cells are faded.
- Keep editorial serif styling for content and titles, and the UI font for controls so interactive text stays crisp.

---

## Security considerations

Even though the app is local-only, browser-side security still matters.

- Treat all imported JSON as untrusted input.
- Do not use `eval`, `Function`, or execute imported strings.
- Escape user-controlled strings before inserting them into HTML. Review all template literals that render habit names, journal text, task text, category names, and imported values.
- Validate types, lengths, ranges, date formats, and array sizes at import boundaries.
- Avoid unsafe URL or CSS construction from untrusted values.
- Do not add remote telemetry or transmit journal/habit data without an explicit, documented product decision and informed user consent.
- Never claim localStorage is encrypted.
- Warn users that anyone with access to the same browser profile can potentially access local data.
- Treat exported JSON as sensitive user data.
- Keep destructive actions explicit and confirmed.
- Do not log journal contents or other personal entries to the console.

---

## Known limitations

- Data is tied to a specific browser profile and origin.
- There is no cloud sync, account system, collaboration, or remote recovery.
- Data in `localStorage` is not encrypted by the app.
- Clearing browser data can permanently remove unexported history.
- JSON import replaces current state rather than merging records.
- Automated tests cover the app's pure logic (dates, schedules, streaks, statistics, escaping, and backup normalization), but interactive UI flows still rely on manual testing; there is no end-to-end suite.
- Browser support has not been formalized into a minimum-version matrix. `color-mix()` is required for habit tints and note surfaces, which excludes pre-2023 browser engines.
- In the light theme, some habit colors are close in luminance to the pale sage progress track and to the soft surface used by heatmap and mosaic cells. Those adjacent-state pairs are distinguished by hue, shape (filled square versus hollow outline), numeric labels, and the on-screen legend rather than by luminance contrast alone, so automated contrast checks report them as informational rather than as failures. Primary text, controls, borders, and focus rings meet WCAG AA.
- Notifications, scheduled reminders, and native mobile packaging are not part of the current implementation.

---

## Roadmap ideas

These are possibilities, not promises or implemented features:

- Add a documented schema-migration strategy for future versions.
- Add optional installability/PWA support, with a careful offline and storage policy.
- Add an optional encrypted backup format, with clear key-loss warnings.
- Improve data portability and offer a backup-restore walkthrough.
- Add more robust keyboard and screen-reader testing.
- Split the single HTML file into modules only if maintainability needs justify the added build or deployment complexity.

Any roadmap item should preserve the core principles of local-first operation, transparent privacy, and progress without guilt.

---

## Contribution guidelines

Contributions should:

1. Explain the user problem and expected behavior.
2. Keep the implementation aligned with the product principles.
3. Preserve existing data and backup compatibility.
4. Include relevant manual test steps.
5. Update README documentation when features, limits, storage, or behavior change.
6. Avoid unrelated refactors in behavior-sensitive code.
7. Avoid adding dependencies or network requests without explaining the trade-off.
8. Include accessible labels, focus behavior, and responsive handling for new controls.

For bug reports, include browser/version, steps to reproduce, expected behavior, actual behavior, and whether the issue survives a refresh. Do not attach personal backups or journal exports unless their sensitive content has been removed.

---

## Release checklist

- [ ] Confirm the correct `index.html` is being released.
- [ ] Review the diff for accidental data-model or storage-key changes.
- [ ] Run static HTML and JavaScript syntax checks.
- [ ] Run the automated test suite (`node --test`).
- [ ] Complete the relevant manual regression checklist.
- [ ] Test light, dark, and system themes.
- [ ] Test mobile and desktop layouts.
- [ ] Export a backup and verify it can be imported.
- [ ] Test a representative older backup if schema code changed.
- [ ] Confirm destructive actions require confirmation.
- [ ] Confirm there are no unintended external requests.
- [ ] Update the displayed app version and this README if the release changes them.
- [ ] Clearly record any checks that could not be performed.

---

## License

Evrida is open-source software released under the [MIT License](LICENSE). See the `LICENSE` file for the full license text. Copyright (c) 2026 the Evrida project owner.
