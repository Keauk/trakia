# D-001: Replace the Leitner ladder with an FSRS-style scheduler

Status: done (2026-10-22) · Created: 2026-10-21 · Area: scheduling (`app/core.js`: `INTERVALS`, `applyResult`, `buildSession`)

## Context
Scheduling today is a fixed Leitner ladder: nine boxes with intervals 0, 10 min, 1 h, 6 h, 1 d, 3 d,
7 d, 16 d, 35 d. Every card climbs the same ladder regardless of how hard it has been for you, and
the only personalisation is the box a card sits in. FSRS (Free Spaced Repetition Scheduler, the
algorithm Anki ships since 23.10) instead keeps a per-card **stability** (days until recall
probability drops to 90 %) and **difficulty**, updates both from each answer, and schedules the next
review for the moment recall probability hits a chosen **desired retention**. Published comparisons
report a quarter to a half fewer reviews at equal retention versus SM-2-style schedulers.

## Proposal
Port FSRS to `core.js` and use it for all cards that have graduated from the short learning steps.
Keep the minute-granular feel with explicit learning steps before FSRS takes over.

- Ratings: wrong → Again (1), almost → Hard (2), correct → Good (3). No Easy button for now
  (a possible later heuristic: Good with a long streak and no almosts → Easy).
- Learning steps for new and lapsed cards: 10 min → 1 h, then graduate to FSRS with the initial
  stability from the parameters. This preserves "practise several times a day".
- Desired retention: a setting, default **0.90**, range 0.80–0.95. Document that reviews per retained
  item climb steeply above 0.90.
- Parameters: start with the published FSRS-5 defaults. Optimisation from the user's own history is a
  later step (the Python `fsrs-optimizer` package reads a revlog; our `log` already stores timestamp,
  card key and rating, which is enough to export one).
- Free practice keeps its semantics: correct/almost never move the due date earlier or later; wrong
  still lapses the card.

## Design notes
- Progress record gains `s` (stability, days), `d` (difficulty, 1–10), `lastReview`, `state`
  (`learning` | `review` | `relearning`), `step`. Keep `box` for one release as a display value
  derived from stability (for the Stats boxes view), then drop it.
- Migration on first load: a card in box *b* gets stability = interval(b) in days (min 0.01) and
  difficulty 5; box 0 cards enter learning step 0.
- `applyResult(p, result, now, free, rand)` keeps its signature; `INTERVALS` becomes the learning
  steps only. Add `retrievability(p, now)` for Stats ("expected retention today") and for session
  ordering (most-forgotten first instead of oldest-due first).
- Fuzz: ±5 % on review intervals ≥ 1 day, as FSRS does, to avoid clumping.
- Tests: extend `tools/test_core.js` with the known FSRS reference values (the FSRS repo publishes
  test vectors for its default parameters) plus the learning-step behaviour and the migration.
- The Stats "boxes" bar becomes a stability histogram (< 1 d, 1–7 d, 7–30 d, > 30 d).

## Acceptance criteria
- Same-day behaviour unchanged for a brand-new card: first two correct answers come back after
  ~10 min and ~1 h.
- A card answered correctly five times in a row ends up with an interval that is longer than the
  Leitner one would have been, and a card with two lapses ends up with a shorter one.
- Desired retention 0.80 produces longer intervals than 0.95 on identical histories (test).
- Existing progress migrates without losing lapses, reps or due state; no card becomes "unseen".
- Export/import of progress round-trips the new fields.

## Effort and risks
About 250 lines in `core.js` plus tests; one evening. Risks: subtle maths bugs (mitigated by reference
vectors); the first weeks after migration will feel different because intervals change.

## Implementation notes (as built)
- `core.js` ports **py-fsrs 6.3.2** (FSRS-6, 21 parameters, the version Anki ships): `fsrsReview(card,
  rating, now, opts, rand)` mirrors `Scheduler.review_card` including learning/relearning steps,
  same-day short-term stability, whole-day review intervals, the maximum interval and py-fsrs's fuzz
  ranges. Two reference vectors from the py-fsrs test suite pass exactly (`test_review_card` interval
  history and `test_memo_state` stability/difficulty to 1e-4).
- Steps: learning 1 min → 10 min → 1 h (a new card answered Good waits 10 min, then 1 h, then
  graduates to days; 1 min is only reached after Again, and the session re-queues such cards anyway),
  relearning 10 min. Ratings: correct → Good, almost → Hard, wrong → Again; the D-002 policy can turn
  an almost into Good (free pass) or Again (mature card). No Easy.
- Settings: *Desired retention* (0.80–0.95, default 0.90, with a live example of resulting
  intervals) and *Longest interval* (default 365 days).
- Record fields: `s` (stability, days), `d`, `state`, `step`, `due`, `last`, `rating` (last rating),
  plus the existing `reps`, `lapses`, `streak`, `almosts`, `orders`. `box` is kept as a derived
  display value (`boxFromRecord`) for export compatibility and free-practice ordering.
- Migration (`migrateRecord`, run once at load and lazily in `applyResult`): box → stability equal to
  the ladder interval in days, difficulty 5 + 0.5 × lapses, box ≥ 4 → review, else learning at the
  matching step; `due` unchanged, so nothing becomes due or unseen because of the switch.
- D-002 maturity now comes from the record: young = in learning steps or stability < 1 day,
  mature = review with stability ≥ 7 days, established in between (legacy boxes map the same way).
- Sessions order due cards by predicted recall (most forgotten first; learning-step cards lead).
- Stats shows stability bands (learning, < 7 d, 7–30 d, ≥ 30 d) and the predicted recall of the cards
  due now; the Library badge shows stability and due time; row details show difficulty and recall.
- Free practice: correct/almost leave the schedule untouched; wrong lapses the card (relearning, due
  now). The log row gained the FSRS rating as its sixth element, enough to export a revlog for the
  optimiser later.
- Not done: parameter optimisation from the user's own history (needs `fsrs-optimizer` on an exported
  revlog); Easy rating.

## Open questions
- ~~Keep a user-visible "box"?~~ Switched to stability and recall; box survives only as a derived field.
- ~~Treat almost as Hard or as Good?~~ Hard, except where the D-002 policy says Good or Again.
- Do we want an optimiser later (export revlog, run `fsrs-optimizer`, paste parameters into Settings)?
