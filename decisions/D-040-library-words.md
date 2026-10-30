# D-040: List the deck words the learner knows and is learning in the Library, with their meaning

Status: in progress · Created: 2026-10-30 · Area: library (`ui.js`: `renderLibWords`, the Sentences / Words switch; `core.js`: `isKnownWord`, `wordList`; `index.html`: the Library tab)

## Context
Since D-035 the learner learns the deck words in Trakia, and since D-036 the app says "You know 184
words (−1 today)". But no screen shows *which* words those are, or which are still being learned.
The Library lists only sentences. On 2026-10-30 the known count fell by one after a full day of
reviews; the learner could not see which word they had forgotten and asked for a word list with
the translations.

Research on other apps:
- Duolingo had a word list with translations; users complain about its removal and built
  extensions to get the list back.
- Memrise shows a count of "difficult words" but not the words themselves; reviewers name that as
  a gap. Vocabulary.com lists "trouble words", most recent first.
- On a phone, a stacked list (two lines per row) reads better than a table with many columns;
  three to five filter chips fit a phone; a segmented control fits a choice of exactly one view.

## Proposal
1. **A Sentences / Words switch** at the top of the Library tab. The device remembers the last
   choice. Sentences is the current Library, unchanged.
2. **Words** lists every started deck word (a word with any card), one row per word:
   - the rank, the Bulgarian word and its English meaning;
   - a strength meter of four bars and a label: *known · 23 d*, *learning*, *relearning* or
     *young · 4 d* (the Bulgarian → English interval).
3. **Filter chips with counts**: *All*, *Learning*, *Known*, *Forgotten*. *Known* uses the rule of
   D-036 (the Bulgarian → English card in review, next review at least 7 days after the last one),
   so its count always equals "You know N words". *Learning* is every other started word.
   *Forgotten* is a word answered Again on either card in the last 14 days, most recent first.
4. **Sort**, beside the chips: deck order (default), weakest first, recently practised. Under
   *Forgotten* the sort hides: that list is always most recent first.
5. **Search**, a box of its own above the chips, matches the Bulgarian (with or without stress
   marks), the English and the rank.
6. **Tap a row** to open its details under it: a play button, part of speech, forms and topic, the plural,
   the deck's example sentence, both cards' progress (state, next review, stability, recall now,
   answers, lapses), the date it was last forgotten, and up to three practice sentences that use
   the word.
7. The Import sentences card shows only under Sentences.

Not proposed: words not yet started (Anki and the deck position cover those), a Dutch meaning (the
deck has only English), editing or resetting a word from the list, a practice run of the forgotten
words.

## Design notes
- `core.js`: `isKnownWord(p)` holds the D-036 rule; `wordCounts` uses it.
  `wordList(progress, words, log, now)` (pure) returns, per started word, `{ w, bg, en, known,
  state, ivl, lastSeen, forgot }` with `forgot` the time of the last Again answer (rating 1) within
  14 days, from `log` (kept 30 days by `compactHistory`).
- Strength meter: from the Bulgarian → English card; learning or relearning 1 bar, interval under
  7 days 2, under 30 days 3, 30 days or more 4. Colours from the theme tokens (`--wrong`,
  `--almost`, `--correct`), so it follows dark mode.
- `ui.js`: `renderLibWords(reset)` beside `renderLibrary`; the switch stores `trakia.libView` in
  `localStorage` (per device, not in the snapshot). It has its own search box (`lw-search`) and
  the "Show more" pattern of the sentences (60 rows, then 100 more). The rows are buttons in a list, not a table, so a phone shows
  them in full; the details open under the row, one at a time, like the sentence rows.
- Practice sentences for a word: sentences whose `lemmas` contain the word (normalised, as
  `countLemmas`).
- With no word cards the view says how to start words (Practise tab, Words).

## Acceptance criteria
- Unit tests: `isKnownWord` (the 7-day threshold, the direction); `wordList` (known and learning,
  `forgot` from an Again within 14 days and not older, words without cards left out).
- Smoke test: after the words run, the Library's Words view lists the started words; the Known
  chip's count equals `wordCounts().known`; Forgotten lists a word graded Again; search narrows the
  list; tapping a row opens its details; the choice survives a re-render.
- On a 375 px wide phone: no horizontal scroll, every row readable, in light and dark mode.
- `npm test` passes.

## Effort and risks
About two hours. Risk: 2,952 rows when every word is started; the list renders 60 at a time, so it
stays fast. Risk: "Forgotten" depends on the answer log, which keeps 30 days; 14 days stays inside
it.

## As built
Built and published; the check on the learner's phone is still to come.
- `core.js`: `isKnownWord` (the D-036 rule, now also used by `wordCounts`), `FORGOT_DAYS = 14`,
  `wordList`. `types.d.ts`: `WordRow`.
- `index.html`: the Sentences / Words switch above the Library cards; the Words card (search, filter
  chips with counts, sort, note, list); styles for the rows, the strength meter and the details.
- `ui.js`: `renderLib` picks the view; `renderLibWords`, `wordDetail`, `sentencesWith`. The open
  row gets a tinted background so the row and its details read as one block.
- Checked at 375 px and 1100 px, light and dark: no horizontal scroll; on a phone the four chips
  wrap to two lines and the sort sits under them.

### Decisions taken
- The search box is the Words view's own, not the sentences' `lib-search`: the two views filter
  different things, and each keeps its own query.
- The details do not repeat the word and its meaning (the row above shows them); they start with
  the play button and the part of speech.
- A word with only an English → Bulgarian card shows "BG→EN new" and an empty meter.

### Measurements
- Tests on 2026-10-30: `npm test` passes; one new unit test group, smoke test steps for the view,
  the counts, Forgotten, the details, search and the remembered view.

## Open questions
- Should a row offer "practise this word now"? Not in this record.
