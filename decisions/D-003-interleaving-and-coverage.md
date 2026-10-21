# D-003: Interleave sessions and close vocabulary coverage gaps

Status: proposed · Created: 2026-10-21 · Area: session builder (`core.js`: `buildSession`), data pipeline (`tools/`)

## Context
`buildSession` serves due cards oldest-first and then new sentences in ascending `max_rank` order.
Because sentences were generated per vocabulary band, rank order clusters them: of the 998 adjacent
pairs in rank order, **297 share a content word**, so a session of ten new sentences often drills the
same two or three words. Blocked practice feels productive but interleaved practice (mixing ranks,
directions and topics) is what produces durable retention and transfer.

Coverage is also uneven. Measured on 2026-10-21 (999 sentences, 2952 words):

| rank band | words in ≥ 1 sentence | words in ≥ 2 sentences |
|-----------|----------------------|------------------------|
| 1–300     | 299 / 300            | 283                    |
| 301–600   | 297 / 300            | 146                    |
| 601–1200  | 505 / 600            | 117                    |
| 1201–2952 | 341 / 1752           | 38                     |

Overall 1442 words appear at least once, 584 at least twice, 364 three or more times. A word met in
only one sentence is learned as part of that sentence, not as a word.

## Proposal
**Session mixing**
- Pick new cards by weighted random from the eligible pool, with weight decreasing with
  `max_rank` (e.g. `1 / (1 + (max_rank / rank) ^ 2)` for ranks below the learner's position), instead
  of strict ascending order. Lower ranks still come first on average; they no longer come in blocks.
- Enforce a no-shared-lemma rule between consecutive cards: after choosing a card, skip candidates
  that share a content lemma (ignore the 20 most frequent function words) with the previous one.
- Shuffle due and new cards together instead of all-due-then-all-new, and alternate directions when
  both are present.

**Coverage**
- New tool `tools/coverage.py`: prints, per band, the words that appear in fewer than *n* sentences
  (default 2), ordered by rank, as a TSV the generator brief can consume.
- Next generation batch: ~500 sentences targeted at the gap list (each sentence must use at least
  two gap words), same brief and two-pass review as before. Priority: ranks 301–1200 first, since
  that is where the learner will be in the coming months.
- The Library gets a "words with only one sentence" filter so gaps are visible in the app.

## Design notes
- Keep `buildSession` deterministic under an injected `rand` so tests stay reproducible.
- The lemma lists are already normalised by the validator; `wordIndex` in `core.js` gives the rank of
  each lemma, so the shared-lemma check is a set intersection on `s.lemmas`.
- Interleaving should not starve due cards: cap new cards at `newPerSession` as now, and never let a
  due card wait behind more than three new ones.

## Acceptance criteria
- In a 20-card session over the first 300 ranks, no two consecutive cards share a content lemma
  (test with a seeded `rand`).
- The distribution of `max_rank` among new cards in a session spans at least half of the eligible
  range (test).
- `tools/coverage.py` output matches the table above when run on the current data.
- After the gap batch: every word in ranks 1–1200 appears in at least two sentences.

## Effort and risks
Session mixing: ~60 lines plus tests, one evening. Coverage tool: ~40 lines. The gap batch is mostly
agent time plus the same validation and review pipeline as the original 999 (about three hours of
wall-clock with reviews). Risk: weighted random can surprise a learner who expects "next word in
Anki order"; keep the rank chips under the prompt so new words are always visible.

## Open questions
- Should the rank weighting be a setting ("strict Anki order" vs "mixed")?
- Do we also want topic tags interleaved (the `tags` field exists but is loosely populated)?
