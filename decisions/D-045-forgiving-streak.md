# D-045: Show a forgiving streak on the Practise tab, with rest days, and count all study

Status: in progress · Created: 2026-11-03 · Area: practise home / stats / sync (`core.js`: `streak`, `studiedDays`, `mergeSnapshots`; `ui.js`: `renderHome`, `renderStats`, `markStudied`; `index.html`: `#home-streak`, `#set-restdays`), GitHub issue #2

## Context
The streak shows only on the Stats tab, and one missed day sets it to 0. Only typed answers and word
answers count, so a day of only grammar drills, reading, sneak peek or hands-free listening breaks it.
The count also steps back 24 hours per day, so a change to or from summer time can skip a day.

Evidence:
- Across seven studies, a broken logged streak reduced later engagement, and less so when people
  could repair it (Silverman & Barasch 2023, *Journal of Consumer Research*).
- Goals with built-in slack increased persistence (Sharif & Shu 2017, *Journal of Marketing Research*).
- Missing one opportunity did not significantly affect habit formation (Lally et al. 2010).
- Learners offered Duolingo's Weekend Amulet were 4% more likely to come back a week later and 5% less
  likely to lose their streak. Duolingo reports these figures itself.

## Proposal
1. **On the Practise tab**, one quiet line under the buttons: "12-day streak · 1 rest day left". There
   is no line while the streak is 0. The Stats tab shows the same number.
2. **All study counts**: sentence and word answers, grammar drills, sneak peek answers, a story marked
   as read, story questions, and at least 1 minute of hands-free listening.
3. **Rest days**: a day without study does not break the streak while any 7 days in a row hold no more
   missed days than the limit. New setting *Rest days in any 7 days* (`restDays`: 0, 1 or 2, default 2,
   shared). The learner does nothing to use a rest day.
4. **The number counts days with study.** A rest day keeps the streak but does not add to it. Today does
   not count against the streak before it ends.

Not proposed: rewards, points or goals (D-036 left those out), notifications (D-007), rest days the
learner must buy or switch on, or restoring a streak that has already ended.

## Design notes
- `core.js`: `streak(studied, now, restDays)` is a pure function that returns `{ days, restLeft }`. It
  walks back by calendar date, so summer time cannot skip a day. Missed days before the first day of
  the streak do not use up rest days.
- `core.js`: `studiedDays(state)` returns the set of days with study, from `log`, `drillLog`, the
  totals in `days`, and `studyDays`.
- **A new synced map `studyDays`** (`{ day: timestamp }`) holds the days of study that the logs do not
  keep: reading and peek records hold only their latest time, and listening time stays on the device.
  `ui.js`: `markStudied()` writes it. `mergeSnapshots` keeps the newer entry per day and drops entries
  from before a reset. The map is in the snapshot, so the export and the gist hold it. It holds only
  dates and times, and no token or other secret.
- History starts today for those study types. The streak of an existing learner cannot shrink: every
  day that counted before still counts.

## Acceptance criteria
- Unit tests: study days in a row; today not yet studied; rest days within and beyond the limit; the
  edge of the 7-day window; limit 0; no study at all; `restLeft`; a change to summer time;
  `studiedDays` from each source; the merge and a reset of `studyDays`.
- Smoke test: the Practise tab and the Stats tab show the same number, finishing the questions of a
  story notes today, and the setting changes the line.
- `npm test` passes.

## Effort and risks
About 60 lines. Risks:
- A streak that is easy to keep means less. The setting can go down to 0.
- Two rest days in a row every week still count as a streak. This is intended: the aim is to keep
  coming back, and two free days match the example of Sharif & Shu.

## As built
- As proposed. `core.js`: `streak`, `studiedDays`, `studyDays` in `mergeSnapshots`. `ui.js`:
  `markStudied`, the line on the Practise tab, the Stats number, the setting.

### Decisions taken
- The window is a rolling 7 days, not a calendar week. A calendar week would allow 4 missed days in a
  row across a weekend boundary.
- The explanation of rest days is in the help text of the setting, not a tooltip, because a phone has
  no hover.

## Open questions
None.
