# D-043: Show how many sentences the learner knows, day by day, in a graph like the words graph

Status: in progress · Created: 2026-10-30 · Area: stats (`ui.js`: `renderStats`, `recordSentDay`, the known graph; `core.js`: `sentenceCounts`, `mergeSnapshots`), sentence session (end screen)

## Context
Since D-036 the Stats tab says "184 words known (+3 today)" and graphs the known and started words
over 60 days. For sentences it shows only stability bands per direction (learning, under 7 days,
7–30 days, 30 days or more). The bands are exact but do not read at a glance, and they do not show
growth. On 2026-10-30 the learner asked for a "sentences you know" number and graph, like the words.

## Proposal
1. **Two numbers per day**, with the rule of D-036:
   - *Known*: sentences whose reading card (Bulgarian → Dutch or English) is in review with its
     next review at least 7 days after the last one. Once dictation (D-005) takes the reading card's
     place, the dictation card counts the same way. A sentence counts once, whatever its cards.
   - *Started*: sentences with any card, in the current library (deleted sentences do not count).
2. **Stats tab**, a card *Sentences you know* under *Words you know*: "38 sentences known (+2 today)
   · 120 started", and the same graph as the words: the last 60 days, known solid, started dashed,
   the same axes, colours, key, tooltips and table view.
3. **The end screen of a sentence session** says "You know 38 sentences (+2 today)."
4. **History starts today.** No source holds past intervals (the answer log keeps 30 days and no
   intervals), so the graph shows from the second day; until then the card says so.

Not proposed: a known rule per direction, a stricter rule that also needs the production card,
a backfill of past days, goals or streaks.

## Design notes
- `C.sentenceCounts(progress, has)` (pure) → `{ started, known }`: skips `w:` keys; `has(id)` keeps
  sentences still in the library; known uses `isKnownWord` on `bg2nl`, `bg2en` and `listen` cards.
- **History** `sentDays`: `{ 'YYYY-MM-DD': [started, known, at] }`, the shape of `wordDays`, in
  `localStorage` (`trakia.sentDays`) and in the snapshot, so it syncs. `mergeSnapshots` merges it as
  `wordDays` (per day the newer `at`, nothing from before a reset); the reset button clears it.
  `recordSentDay()` runs at load, after every sentence answer and after a sync or import.
- **The graph**: `wordGraph` becomes `knownGraph(days, now, span, noun)`, used by both cards, so the
  two graphs look the same.
- `types.d.ts`: `Snapshot.sentDays`.

## Acceptance criteria
- Unit tests: `sentenceCounts` (the 7-day threshold; a production card alone does not count; the
  dictation card counts; a sentence with two known cards counts once; word cards and deleted
  sentences are left out); `mergeSnapshots` merges `sentDays`.
- Smoke test: after a sentence session today's `sentDays` entry matches `sentenceCounts`; the end
  screen says "You know N sentences"; the Stats tab shows the card with "sentences known".
- On the phone: the card and graph look like the words card, in light and dark mode.
- `npm test` passes.

## Effort and risks
About an hour. Risk: counting all of `progress` after every answer; it is a few thousand keys, so
it stays fast. Risk: the reading card is easier than production, so "known" is generous; the
per-direction bands below keep the strict view.

## As built
Built and published; the check on the learner's phone is still to come.
- `core.js`: `sentenceCounts`; `mergeSnapshots` merges `wordDays` and `sentDays` with one helper.
  `types.d.ts`: `Snapshot.sentDays`.
- `ui.js`: `sentDays` (stored, in the snapshot, cleared by the reset); `putDay` writes both
  histories; `recordSentDay` at load, after every sentence answer and after a sync or import;
  `wordGraph` became `knownGraph`, and `knownStats` draws the two numbers, for both cards;
  `renderSentsKnown`; the end screen of a sentence session (not a drill) ends with
  "You know N sentences (+k today)."
- `index.html`: the card *Sentences you know* under *Words you know*.
- Checked at 375 px (dark) and 1100 px (light) with 16 days of history: the two cards look the same.

### Decisions taken
- With one day of history the card shows "The graph starts tomorrow: one point a day." instead of
  nothing; the words card shows the same line in that case.
- Free practice sessions also show the known sentences on the end screen; a grammar drill does not.

## Open questions
- Should a sentence count as known only when its production card is also a week or more away?
