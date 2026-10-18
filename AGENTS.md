# AGENTS.md — Evrida

This file provides instructions for AI coding agents and maintainers working on Evrida. Follow these instructions in addition to the user's specific request.

## 1. Project identity and purpose

- Product name: **Evrida**
- Tagline: **Every day, a little more you.**
- Primary artifact: `index.html` (formerly `Evrida.html`; do not rename it back or to another name without a documented reason)
- License: MIT (chosen by the project owner; see `LICENSE` and README)
- Product: a free, local-first habit tracker and personal-growth app.
- Product principle: support progress without guilt. Do not introduce shame-based streak messaging, punitive scoring, or copy that treats missed days as personal failure.

The current application is intentionally a self-contained HTML file. HTML, CSS, and JavaScript live together in `index.html`. Do not assume a framework, package manager, bundler, backend, or API exists. The only tooling is a zero-dependency Node test suite in `tests/` (see section 12), which does not affect how the app is shipped.

## 2. Mandatory workflow

Before editing:

1. Inspect the current repository tree and read the relevant source in full enough to understand the feature.
2. Read `README.md` and this `AGENTS.md`.
3. Locate the relevant state fields, helper functions, render functions, event handlers, CSS tokens, and import/export logic.
4. Identify whether the change affects persisted data, old backups, the storage key, schema version, privacy statements, or accessibility.
5. Make the smallest coherent change that satisfies the request.

After editing:

1. Review the diff and search for unintended brand remnants, broken IDs, duplicate IDs, stale documentation, and accidental external dependencies.
2. Run the automated test suite (`node --test` from the project root; requires Node.js 20+). Run applicable static checks too. If a browser test cannot be run, state that explicitly; do not claim it passed.
3. Update `README.md` when user-visible behavior, features, data storage, backup semantics, limitations, or developer workflow changes.
4. Summarize what changed, which checks actually ran, and any remaining risks.

Do not overwrite user changes or replace the application wholesale when a focused patch is sufficient.

## 3. Architecture constraints

- Prefer vanilla HTML, CSS, and JavaScript for normal feature work.
- Preserve the single-file deployment model unless the user explicitly approves a structural change.
- Do not add frameworks, packages, CDNs, remote fonts, analytics, telemetry, external APIs, or network calls without explaining the need and obtaining approval when appropriate.
- Do not introduce a server, account requirement, or cloud storage as an incidental part of a feature.
- Avoid broad refactors of rendering, persistence, or date logic unless the task requires them.
- Keep the app usable as a static file and from a simple static HTTP host.

## 4. Persistence and migration safety

The current persistence constants are:

- localStorage key: `streakgrid`
- schema version: `6`

The key name is a deliberate compatibility choice from the app's previous Streakgrid branding. **Do not rename the key to `evrida` just to match the new brand.** That could make existing local data appear lost. If a storage-key migration is explicitly requested, read the old key, validate and migrate its contents, save the new state safely, and preserve a recovery path.

Current root state includes:

- `version`
- `habits`
- `gallery`
- `journal`
- `savedQuotes`
- `tasks`
- `settings.theme`

Exports add `app: "Evrida"` and `exportedAt` metadata. Current normalization uses version 6 and validates the principal data fields.

Rules:

- Treat `localStorage` and imported backups as untrusted inputs.
- Keep normalization idempotent where practical.
- Provide defaults for optional or missing fields.
- Validate object/array shape, strings, date keys, enum values, and numeric ranges.
- Do not silently discard valid user history during a migration.
- When changing persisted schema, update normalization, export/import tests, and README's data model.
- Preserve import's safety-copy and confirmation behavior unless the user explicitly asks to change it.
- Import is currently a replacement of the whole state, not a merge. Keep the UI copy accurate.
- Never execute code from a backup or pass imported values to `eval`/`Function`.
- Keep the existing 5 MB import-file limit unless a deliberate change is requested and documented.

## 5. Date, schedule, and progress rules

Habit logic depends on calendar dates, scheduled weekdays, start dates, goals, and completion counts.

- Date keys use `YYYY-MM-DD`.
- Weekday numbers are `0`–`6`, Sunday through Saturday.
- A habit cannot be logged before its start date or in the future.
- A day contributes to scheduled metrics only when the date is on/after the habit start and matches the habit's schedule.
- Partial counts must remain distinguishable from reaching the daily goal.
- Unscheduled days and pre-start dates must not be treated as failed scheduled days.
- Streak calculations must respect the habit's schedule; do not simply count adjacent calendar dates when rest days are involved.
- Be careful with JavaScript date parsing and timezone conversions. Date-only values should not shift to a neighboring day.
- Keep goal validation consistent with the UI: integer from 1 through 99.
- Completion counts are bounded by existing validation/normalization. Preserve sensible bounds when changing count logic.

Any changes to streak, completion-rate, history, gallery, or date behavior should include tests or explicit manual verification for:
1. daily schedules,
2. non-daily schedules,
3. missed scheduled days,
4. unscheduled/rest days,
5. start dates,
6. partial completion,
7. today and future dates,
8. month/year boundaries where relevant.

## 6. User content, HTML safety, and validation

User-controlled content includes habit names, custom categories, journal text, task text, and imported data.

- Escape user-controlled strings before interpolating them into generated HTML.
- Review every template literal that includes user data, including attributes and text nodes.
- Do not assume data is safe because it originated from localStorage.
- Validate imported values at the normalization boundary and validate form values before saving.
- Avoid inserting raw user content via `innerHTML` unless it has been safely escaped and any attributes are correctly handled.
- Do not create event handlers by embedding user-provided text into inline JavaScript.
- Preserve field length limits and keep documentation synchronized with them.
- Do not log journal content or other personal data to the console.

## 7. Privacy and product language

Evrida currently has no account system, backend, analytics, or remote synchronization. Its main state is stored in browser `localStorage`.

Accurately describe privacy:

- Local storage is not encrypted by the app.
- Other people with access to the same browser profile/device may be able to inspect local data.
- Browser cleanup, profile changes, and origin changes can make data unavailable.
- JSON backups are readable files and may include sensitive journal content.
- Do not promise end-to-end encryption, guaranteed privacy, cloud recovery, or cross-device sync.
- Do not add network transmission of user data without explicit approval, informed consent, and updated documentation.

Privacy messaging is part of the product, not optional decoration. Keep the privacy note in the Journal and Settings accurate if storage behavior changes.

## 8. UI, brand, and design system

Use the Evrida brand and tone:

- Brand: Evrida
- Tagline: “Every day, a little more you.”
- Tone: calm, encouraging, respectful, non-judgmental.
- Visual direction: editorial wellness journal — warm ivory surfaces, forest-green accents, rounded cards, restrained shadows, coordinated habit colors, clear hierarchy, and responsive layout.
- Typography: system UI font stack for interface and numeric text; serif (`Georgia`, `'Times New Roman'`, serif) only for editorial content such as page titles, the daily quote, journal prompts, and panel notes. No web fonts.

Current CSS tokens:

### Light
- background `#F7F5EF`
- card `#FFFFFF`
- soft surface `#EAEDE5`
- text `#25352B`
- muted text `#59665B`
- border `#DCDDD3`
- accent `#496B50`
- accent text `#FFFFFF`
- positive status `#356747`
- sage surface `#C7D7C1`
- terracotta `#C8795A`
- gold `#D8B66A`
- slate `#788A9A`
- danger `#A4443A`
- progress track `#C7D7C1`

### Dark
- background `#171D19`
- card `#232C25`
- soft surface `#2B362D`
- text `#F0EEE5`
- muted text `#B8C2B5`
- border `#39463B`
- accent `#A9C49F`
- accent text `#171D19`
- positive status `#A9C49F`
- sage surface `#3A4A3D`
- terracotta `#DE9B7E`
- gold `#E0C283`
- slate `#9DB0BF`
- danger `#E89484`
- progress track `#2F3B31`

The focus indicator uses `#496B50` in light and `#C1D5B8` in dark. The source CSS in `index.html` is the implementation source of truth; update this file and README together if the tokens change.

Habit colors come from a fixed nature palette (`COLORS` in `index.html`): `#496B50`, `#C8795A`, `#788A9A`, `#A67C29`, `#5F8A6E`, `#3F6D7A`, `#B4707C`, `#6E7F4E`. Per-habit text and fill colors are derived with CSS `color-mix()`, so the app requires a browser from the 2023 generation or newer; there is no JavaScript color fallback. Because `normalize()` validates `color` against the palette, changing the palette reassigns non-matching stored colors by habit position — presentation only, with no history loss.

- Preserve system/light/dark theme behavior.
- Check new colors for sufficient contrast in both themes.
- Use existing CSS variables where possible rather than hard-coding theme-specific colors.
- Keep the app usable at mobile widths and with browser zoom.
- Do not use color as the sole signal for completion state.

## 9. Accessibility requirements

- Keep form labels associated with their controls.
- Preserve visible keyboard focus styles.
- Ensure interactive elements are keyboard-operable.
- Provide accessible names for icon-only controls.
- Preserve or replace useful `aria-label`, `aria-pressed`, `aria-live`, and semantic-region behavior.
- Keep dialog flows understandable and focus behavior usable.
- Make errors and save confirmations understandable without relying only on color.
- Respect `prefers-reduced-motion` if adding motion.
- Test desktop and narrow/mobile layouts for overflow and reachability.

## 10. Feature-specific behavior to preserve

The current app contains these areas:

- **Today:** current-day habit progress, daily quote, daily intentions.
- **Habits:** create, edit, delete, schedule, target, category, emoji, color.
- **History:** historical completion and date inspection.
- **Insights:** time-period/category summaries and habit comparisons.
- **Journal:** dated reflections, mood, search, saved quote access, habit snapshot.
- **Gallery:** 91-day/13-week progress mosaics.
- **Settings:** system/light/dark theme, export/import, local-data deletion, privacy notes.

When changing one area, check connected calculations and UI. For example, changing habit schedules may affect Today, History, Insights, streaks, and Gallery.

Daily intentions are separate from habits. Journal entries are optional and must not affect habit completion.

## 11. Backup/import/export requirements

- Exported filename currently follows `evrida-backup-YYYY-MM-DD.json`.
- Export includes `app: "Evrida"` and an ISO timestamp in `exportedAt`.
- The app's current root schema version is 6.
- Import must validate the selected JSON, normalize it, request confirmation, and create a safety export before replacing current state.
- Invalid JSON and invalid data must produce a useful message without corrupting current state.
- Keep file-size limits and array/field limits intentional and documented.
- Do not change backup format casually; users may rely on existing files.
- If export/import behavior changes, test round-trip export → import and at least one earlier compatible backup.

## 12. Testing expectations

The project has a zero-dependency automated test suite in `tests/`, using Node's built-in `node:test` runner (Node.js 20+). Run it with `node --test` from the project root. It covers the app's pure logic: date math and boundaries, scheduled-day and start-date eligibility, partial completion, streaks, insight and recovery statistics, HTML escaping, and `normalize()` as the untrusted-input boundary for `localStorage` and imported backups.

Rules for the test suite:

- Do not add npm packages, a `package.json`, or a build step for testing. Node's built-in modules only.
- Do not modify `index.html` to enable testing; the loader in `tests/helpers/load-app.js` extracts the inline script at runtime.
- When changing streak, completion-rate, history, gallery, or date behavior, extend the relevant test file.
- The suite covers pure logic only; it does not prove interactive browser behavior.

Run applicable checks that are available:

- Automated test suite: `node --test`.
- HTML parsing/structure check.
- Inline JavaScript syntax check (extract script contents to a temporary file if needed).
- Duplicate-ID scan.
- Search for stale branding and broken references.
- Manual browser testing for changed behavior.
- Console/network inspection when a browser is available.

For feature work, at minimum consider these regression flows:

- Create, edit, and delete a habit.
- Log partial and full progress.
- Respect schedule, start date, and future-date restrictions.
- Refresh and verify persisted state.
- Export/import valid data and reject invalid data.
- Confirm destructive actions.
- Verify journal search/save/clear if related.
- Verify daily intentions and limits if related.
- Verify light, dark, and system theme.
- Check keyboard operation, focus, and narrow viewport layout.

Report checks honestly. A syntax check does not prove that interactive browser behavior works. If browser automation is blocked or unavailable, say so.

## 13. Documentation and scope

Update `README.md` when a change affects:

- features or user workflows,
- schema or storage key,
- import/export semantics,
- privacy or security claims,
- dependencies or deployment,
- browser requirements,
- known limitations,
- testing procedures,
- design tokens or accessibility behavior.

Do not state planned features as implemented. Do not add a license declaration unless the project owner chooses a license. Do not invent contribution channels, issue trackers, support email addresses, release automation, or browser guarantees.

## 14. Final response format for coding tasks

At the end of a task, provide:

1. **Summary** — what changed and why.
2. **Files changed** — list paths.
3. **Validation** — exact checks that were run and their results.
4. **Limitations** — tests not run, assumptions, migration risks, or follow-up work.

Keep the final summary concise but specific. Never claim a test passed unless it was actually run.
