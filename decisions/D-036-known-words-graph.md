# D-036: Show how many deck words the learner knows, day by day, in a small graph

Status: in progress · Created: 2026-10-28 · Area: stats (`ui.js`: `renderStats`, `recordWordDay`, the words graph; `core.js`: `wordCounts`, `mergeSnapshots`), words run (end screen), tooling (`tools/anki_progress.py`: history from Anki)

## Context
Since D-035 the deck words are learned in Trakia. The Stats tab shows today's state of the word
cards, but not how the number of known words grows. The learner asked for that growth day by day,
as a small graph, to see their progress and stay motivated. Anki's own statistics showed this; the
learner stopped using Anki on 2026-10-28.

## Proposal
1. **Two numbers per day**:
   - *Known*: words whose Bulgarian → English card is in review with its next review at least 7
     days after the last one.
   - *Started*: words with any card.
2. **Stats tab**, a card *Words you know* under *Today*: "182 words known (+3 today) · 243 started", and a
   line graph of both numbers over the last 60 days (known solid, started dashed). Tapping or
   hovering shows the day's numbers.
3. **The end screen of a words run** says "You know 182 words (+3 today)".
4. **History from Anki**: the days since the learner started the deck in Anki (2026-10-14) come from
   Anki's review log, so the graph does not start empty.

Not proposed: a graph per direction, forecasts, goals or streak rewards.

## Design notes
- `C.wordCounts(progress)` (pure) → `{ started, known }`; `KNOWN_DAYS = 7`. Known uses the interval
  (`due − last`), not the stability, because Anki's review log stores intervals: the history and
  today's count then measure the same thing.
- **History** `wordDays`: `{ 'YYYY-MM-DD': [started, known, at] }`, saved in `localStorage`
  (`trakia.wordDays`) and part of the snapshot, so it syncs (D-025). `recordWordDay()` writes
  today's entry at load, after every word answer and after a sync. `mergeSnapshots` keeps, per day,
  the entry with the newer `at` and drops entries from before a full reset; the reset button clears
  it.
- Days without an entry carry the previous day's numbers in the graph.
- **The graph**: inline SVG (no canvas), colours from the theme tokens (`--correct`, `--primary`),
  so it follows dark mode. The table view lists the days, as the answers chart does.
- **Backfill**: `tools/anki_progress.py` adds `wordDays` to its snapshot from the `revlog` table:
  per day, *started* = notes with a review on or before that day; *known* = notes whose
  Bulgarian → English card's last review on or before that day set an interval of at least 7 days.
  The developer merges it into the learner's gist as in D-035.

## Acceptance criteria
- Unit tests: `wordCounts` (the threshold, the direction); `mergeSnapshots` keeps the newer entry
  per day and drops entries before a reset.
- A test of the tool's history on the fake collection.
- Smoke test: after a word answer today's entry exists; the Stats tab shows the known count and the
  graph; the end screen shows the known count.
- On the learner's phone: the graph shows the days since 2026-10-14.
- `npm test` and `check_decisions.py` pass.

## Effort and risks
About an hour. Risk: "known" is a definition; 7 days is a choice the learner may want to change
(open question).

## As built
Built and published; the check on the learner's phone is still to come.
- `core.js`: `KNOWN_DAYS`, `wordCounts`; `mergeSnapshots` merges `wordDays`. `ui.js`:
  `recordWordDay`, `knownNow`, `wordGraph` (inline SVG, 60 days, a table view), the card *Words you
  know* on the Stats tab under *Today*, and "You know N words" on the end screen of a words run.
- `tools/anki_progress.py`: `word_days` from the review log, in the snapshot as `wordDays`.

### Decisions taken
- Known is measured by the interval, not the stability (see Design notes). With the stability,
  the first day in Trakia showed a false jump of 48 words over the day before from Anki.
- The graph has its own card under *Today*, as the most motivating number on the tab.

### Measurements
- 2026-10-28: from the learner's Anki log, 15 days: started 7 → 243, known 0 → 120 (the first
  known words on 2026-10-22). Today's count in the app from the same cards: 120.

## Open questions
- Is a week until the next review the right line for "known", or should it be stricter (21 days,
  Anki's "mature")?
