# D-024: Shorter sessions of 20 different sentences, with no repeats between sessions in a row

Status: done (2026-10-25) · Created: 2026-10-25 · Area: session builder (`core.js`: `buildSession`, new `onePerSentence`, `REST`, `NEW_RESERVE`), scheduler (`core.js`: `FSRS_DEFAULTS.learningSteps`, `applyResult`, `maturity`), Settings (`index.html`: *Session* card; `ui.js`: `DEFAULTS`, `startSession`)

## Context
The learner reported that sessions keep showing the same sentences, even across several sessions in
a row, that a session is long (around 43 sentences, both directions), and that the app is nowhere
near showing every sentence their level allows. They usually run several sessions back to back.

Four things in the session builder and scheduler explained it:

1. **Learning steps fire in the next session.** D-001 gave new cards steps of 1 min → 10 min → 1 h.
   A session's queue is fixed when it starts, so a step shorter than a session never fires inside
   it; it makes the card due at the start of the *next* session. Run back to back, every session
   opened with the cards just answered, which sort first (recall 0 for learning cards).
2. **Both directions of a sentence in one session**, or in consecutive ones: the gated NL→BG card
   unlocked after a single correct answer and then took up to half of the new slots right away.
3. **Long sessions**: up to 40 reviews plus 10 new cards.
4. **New cards regardless of the reviews waiting**: every session added up to 10 new cards, so more
   sessions meant more new cards *and* a review pile that kept growing.

A simulation of the real `buildSession` and `applyResult` (rank 300, stage 1, 469 sentences
eligible, four sessions back to back each evening) confirmed it: from the first week on, sessions
were 50 cards on about 42 sentences, 17–21 of which the previous session had just shown, and the
reviews waiting each morning passed 460 by day 14.

## Proposal
1. **Cards per session** (`sessionSize`, default 20): a session holds this many cards; a wrong answer
   still comes back once at the end, on top. Replaces *Max reviews per session* (`maxDue`, 40).
2. **One card per sentence per session**: the most urgent card of a sentence represents it; the
   other direction waits.
3. **A rest of 4 hours** (`REST`): a sentence answered in the last 4 hours gets no new card and no due
   card in its other direction, so sessions in a row show other sentences. A card's own due time is
   left to the scheduler, so a card missed twice still comes back 10 minutes later.
4. **One 10-minute learning step** instead of 1 min → 10 min → 1 h: a new card answered correctly
   graduates to FSRS at once (about two days); a miss waits 10 minutes, and its in-session retry
   graduates it when correct. Relearning stays at 10 minutes. The old steps stay reachable through
   `settings.fsrs.learningSteps`.
5. **Reviews first, then new sentences.** While more reviews are due than fit in a session, the
   session is reviews plus 2 new cards (`NEW_RESERVE`, at most a quarter of the session). Once the due
   reviews all fit, new cards fill the free places, at most *New cards per session*
   (`newPerSession`, default 10, now a maximum). There is no daily limit: the more sessions the
   learner runs, the more reviews they clear and the more new sentences they get, and new cards can
   never outrun the reviews.
6. Free practice (nothing due, nothing new) also holds one card per sentence and prefers sentences
   that have rested; the *Free practice* button uses the session size.

Not proposed: a "continue" button or reminders (D-007).

## Design notes
- `buildSession`: due cards (most forgotten first) → `onePerSentence` → the first
  `sessionSize − reserve` of them. If more were due than taken, the new places are `reserve`;
  otherwise `min(newPerSession, sessionSize − reviews taken)`. New candidates skip sentences that have
  a due card or rested less than `REST`, one key per sentence, and are picked as before (D-003):
  unlocked production cards up to half, then the rank-weighted pick. When the new pool is short, more
  due cards top the session up. `fullBlocks`, `interleave` and `spreadOut` are unchanged.
- The rest rule reads `progress[key].last` per sentence; `restsBut(id, key)` ignores the card's own
  record, so only the *other* direction rests a due card.
- `applyResult` stores `first` (time of the first answer ever). `maturity`: a card with `first` stays
  *young* for its first three answers, so the D-002 free passes for typos keep covering the first
  exposures now that one Good graduates. Records from before D-024 have no `first` and keep their
  maturity.
- Stored records still in step 1 or 2 of the old steps graduate on their next Good
  (`c.step >= steps.length`).
- UI: the *Session* card gets *Cards per session*; *New sentences per session* becomes *New cards
  per session (at most)*, with help text on reviews first. `sessionSize` is a new settings key, so it
  reaches existing installs (`save.settings` writes the whole merged object, so a changed default of
  an old key would not). `CACHE_VERSION` v37 → v38.

## Acceptance criteria
- Unit tests: with more due than fit, a session is 20 cards from 20 sentences with exactly the
  reserve of new cards; `sessionSize` caps it; with 5 due, 5 reviews + 10 new (+ 15 with
  `newPerSession` 20); with nothing due, `newPerSession` new cards; a session 10 minutes after another
  repeats only a twice-missed sentence and has no reverse cards, which appear after 4 hours; a due
  card waits while its other direction rests; the *Free practice* path gives one card per sentence
  with rested sentences first; a first Good graduates; old step-1 and step-2 records graduate on Good;
  the first three answers stay young; a session of 2 keeps its review.
- UI smoke test: a fresh learner's first session has `newPerSession` cards; the reverse card appears
  in a later session once the clock has passed the rest.
- Simulation (as in *Measurements*): no sentence shared between sessions in a row from week 2; the
  reviews waiting each morning stay flat at every practice level; more sessions a day give more new
  sentences.
- `npm test` and `python3 tools/check_decisions.py` pass.

## Effort and risks
About 70 lines in `core.js`, 10 in `ui.js` and `index.html`, tests rewritten where the old behaviour
was asserted. Risks:
- **One session a day learns few new sentences** (about 1–2 a day after the first weeks): 20 answers
  a day only just cover the reviews. That is the honest capacity, and before D-024 the same learner
  piled up 370 overdue reviews in six weeks instead. More sessions is the remedy, and the help text
  says so.
- **A graduated first answer is a weaker memory than three steps.** FSRS sets the first interval from
  the Good stability (about 2.3 days) and lapses bring the card back; the in-session retry still
  catches misses. Revisit if the lapse rate on second exposures rises.
- **A backlog left by the old code** (cards from 50-card sessions) means mostly reviews for the first
  days, with 2 new cards per session until it is cleared.
- **A small eligible pool still runs dry**: at the default Anki position (word 102, stage 1) only 75
  sentences are eligible, and no session builder can add variety beyond them. The Home summary shows
  the pool size.
- Reverses part of D-001 (learning steps); D-001 notes it. D-004 would shift more slots to production
  cards and should be read against the one-card-per-sentence rule.

## As built
- Shipped as proposed: `sessionSize` 20, reviews first with `NEW_RESERVE` 2 (capped at a quarter of
  the session), `newPerSession` 10 as a maximum, `REST` 4 h, learning steps `[10 min]`, one card per
  sentence in normal and free sessions.
- `maxDue` is gone from Settings, `DEFAULTS` and the types; a stored `maxDue` is ignored.
- Tests rewritten with the intended behaviour in their messages: FSRS learning steps, almost policy,
  strict order, D-021 keyboard blocks (now 19 sentences, since one card per sentence), D-003 mixed
  selection and production cards (now with an explicit `sessionSize`), and the two smoke checks for
  reverse cards (the clock moves 5 hours ahead).

### Decisions taken
- **First version: a daily limit of 20 new cards, replaced the same day.** The first run, with no
  limit at all, introduced 79 new sentences on day 1 of four back-to-back sessions. A daily limit
  fixed that, but the learner pointed out that it ties learning to the calendar instead of to how
  much they practise. Two alternatives were simulated and rejected:
  - *New cards tapering as the reviews due within 0–3 days grow*: a healthy learner always has some
    reviews due, so new sentences fell to 0–5 a day after two weeks at any practice level.
  - *New cards as a share (25 %, 33 %) of recent daily answers*: it scaled with practice, but the
    review pile still grew at every share (424 waiting on day 42 at four sessions a day), and a new
    learner got short sessions until there was a history to earn from.
  Reviews first, with a small reserve, was the only rule that kept the pile flat at one, two, four and
  six sessions a day while giving more new sentences for more practice.
- The reserve is 2 rather than 0 so that new sentences and reverse cards still trickle in while a
  backlog is being cleared; 4 let the pile grow at one and four sessions a day (70 and 113 on day 42).
- The reserve is capped at a quarter of the session, so a tiny session is not all new cards.
- The rest applies only to the other direction of a due card, not to the card itself, so the
  scheduler's 10-minute relearning step for a twice-missed card still works.

### Measurements
Simulation, 2026-10-25: the real `buildSession` and `applyResult`, rank 300, stage 1 (469 eligible),
one sitting at 20:00 with sessions back to back, 20 s an answer, one retry per miss. A review succeeds
with the card's predicted recall, a new or learning card with 75 %. "Before" is the code at `cc84e8b`.

| sessions a day | | before | daily limit 20 | as shipped |
|---|---|---|---|---|
| 1 | cards per session, day 14 | 50 | 20 | 20 |
| 1 | reviews waiting, day 42 | 370 | 367 | 22 |
| 1 | sentences seen, day 14 / 28 / 42 | 75 / 145 / 214 | 90 / 160 / 230 | 58 / 77 / 103 |
| 2 | reviews waiting, day 42 | 746 | 735 | 20 |
| 2 | sentences seen, day 14 / 28 / 42 | 144 / 284 / 424 | 149 / 290 / 433 | 106 / 145 / 199 |
| 4 | sentences shared with the previous session, day 14 | 17 | 0 | 0 |
| 4 | reviews waiting, day 14 / 42 | 462 / 85 | 15 / 254 | 24 / 28 |
| 4 | sentences seen, day 14 / 28 / 42 | 284 / 469 / 469 | 146 / 287 / 426 | 190 / 282 / 378 |
| 6 | reviews waiting, day 14 / 42 | 719 / 23 | 17 / 23 | 20 / 21 |
| 6 | sentences seen, day 14 / 28 / 42 | 423 / 469 / 469 | 147 / 286 / 426 | 284 / 432 / 469 |

"Before" sees sentences sooner because it adds 10 new cards to every session whatever is waiting; the
cost is hundreds of overdue reviews, which FSRS then serves most-forgotten first. At four and six
sessions a day its pile shrinks again only after the whole pool has been seen.

## Open questions
- Is 4 hours the right rest, or should the other direction wait until the next day?
- Is a reserve of 2 new cards right while a backlog is cleared, or should it scale with the session
  size?
- Should the end screen say why a session had few new cards ("reviews first: 35 more due")? Fits
  D-007's continue button.
