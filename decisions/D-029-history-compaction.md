# D-029: Keep 30 days of answer history in full and older days as daily totals

Status: done (2026-10-27) · Created: 2026-10-26 · Area: storage / stats (`core.js`: `compactHistory`, `dayKey`, `mergeSnapshots`; `ui.js`: `renderStats`, load, sync)

## Context
Every answer appends an entry to `log` (`[ts, key, score, free, effective, rating]`, about 45
bytes) and every drill answer one to `drillLog`; every session start goes to `sessions`. These
lists only grow. The browser keeps them in `localStorage` (about 5 MB per site) and, since D-025,
in the synced gist, where a file over 1 MB needs a second, untested request.

The only bound today is a hard cap in `ui.js`: past 20,000 entries the oldest 5,000 are dropped.
That silently loses history: the streak and the all-time drill numbers on the Stats tab shrink,
and at 20,000 answers the log alone is about 900 KB. With progress records added, the gist
crosses 1 MB well before that.

Nothing in the app needs individual answers older than a few weeks: the chart shows 14 days, the
home screen and *Today* use today, the session builder works from the progress records. What the
older history is used for, the streak and the all-time drill score, needs only per-day counts.

## Proposal
1. Answers, drill answers and session starts of the **last 30 days** stay as they are.
2. Older days are folded into **daily totals**: per day the number of wrong / almost / correct
   answers, the same for drills, and the number of sessions. Nothing is thrown away any more; the
   20,000-entry cap goes.
3. The Stats tab reads the totals together with the recent entries, so the streak and the
   all-time drill numbers count every day ever practised.
4. Totals travel with sync and merge without counting a day twice.

Not proposed: compacting progress records (one per card, needed for scheduling), a size display,
exporting the full history.

## Design notes
- Snapshot field `days: {"YYYY-MM-DD": {a?: [wrong, almost, correct], d?: [wrong, almost, correct], s?: n}}`
  (`DaySummary` in `types.d.ts`); `C.dayKey(ts)` gives the local calendar day, and `ui.js`'s
  `dayKey` uses it.
- `C.compactHistory(state, now, keepDays = 30)` → `{log, drillLog, sessions, days}`: every entry of
  a day before the cutoff day is counted into that day's totals and removed. A day is always
  compacted whole. Folding takes, per number, the **maximum** of the existing total and the count
  from the entries, never the sum: when one device already compacted a day that another device
  still holds in full, the result is the same count, not twice it.
- `mergeSnapshots`: `days` merge per day and per number by maximum; days before the day of
  `stamps.wiped` are dropped (a reset clears them). Callers compact after merging: at load, after
  a sync merge, after a file import.
- Size: 30 days at 150 answers a day is about 200 KB of log; each older day costs about 40 bytes.
- Known limit: a day practised on two devices that never synced within 30 days counts the larger
  of the two devices' numbers for that day, not their sum.

## Acceptance criteria
- Unit tests: entries older than the cutoff become day totals and disappear; a day is compacted
  whole; compacting twice changes nothing; merging a compacted and an uncompacted copy of the
  same history gives the same totals as either alone; a reset drops older totals.
- The all-time drill numbers include the totals; the streak reads the same per-day counts.
- The smoke test brings in answers from 60 days ago (through sync) and finds them as day totals,
  in the gist too, and counted in the all-time drill number.
- `npm test` and `check_decisions.py` pass.

## Effort and risks
An hour or two. Risk: a mistake in folding loses counts for good; mitigated by the max rule, by
tests, and by compaction never touching the last 30 days.

## As built
- Built as proposed; not yet committed. `core.js`: `dayKey`, `compactHistory`, `normDay`, day
  totals in `mergeSnapshots`. `ui.js`: state `dayTotals` (storage key `days`), compaction at load,
  in `applySnapshot` (sync, file import) and on the merged state before a sync upload; the
  20,000-entry caps are gone; `renderStats` reads the totals for the chart's day counts, the
  streak and the all-time drill numbers. `ui.js`'s `dayKey` is now `C.dayKey`.
- Tests: a core group (folding, whole days, idempotence, merge of a compacted and an uncompacted
  copy, reset); in the smoke test the "other device" in the sync test holds answers from 60 days
  ago, which arrive as day totals, leave the gist compacted, and count in the all-time drill
  number. The streak's use of the totals is not tested on its own.

### Decisions taken
- The acceptance check runs through sync rather than a reload of a 60-day history, since the
  smoke test loads the app once; compaction at load uses the same function. The criterion about the
  streak was narrowed to match: the streak reads the per-day counts the chart uses, but has no
  test of its own.

## Open questions
- Show the total number of answers ever on the Stats tab, now that it can be counted?
