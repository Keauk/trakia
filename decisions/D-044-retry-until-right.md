# D-044: Bring a missed sentence back until it is right, at most 3 times in a session

Status: in progress · Created: 2026-11-03 · Area: session (`ui.js`: `next`; `core.js`: `retryPlan`), GitHub issue #1

## Context
A sentence the learner misses comes back once at the end of the session (D-024). When the learner
misses that retry too, the session goes on, so a session can end without one correct recall of the
sentence. The card then waits in its 10-minute relearning step for the next session.

Research on successive relearning (Rawson & Dunlosky 2022; Rawson, Dunlosky & Sciartelli 2013):
recalling an item correctly in the first session and relearning it in later spaced sessions gives
durable retention. Most of this evidence comes from laboratory studies.

## Proposal
1. In a sentence session, a missed sentence comes back until the learner gets it right, at most
   **3 times** in one session (4 tries in all). This replaces "once" in D-024.
2. A correct answer on any retry ends the retries for that sentence and counts as usual.
3. A sentence missed on all 4 tries does not come back in that session. It stays in its 10-minute
   step, so a later session offers it.
4. **No extra penalty.** The first miss and a miss on the first retry count as today. A miss after
   that changes nothing on the card: no lapse, no change to the schedule.
5. Free practice follows the same rules.

Not proposed: retries in word runs (they have their own learning steps) or grammar drills, a setting
for the number of retries, or a change to the review intervals.

## Design notes
- `core.js`: `MAX_RETRIES = 3` and `retryPlan(effective, retry)`, a pure function that returns
  `{ again, apply }`: the retry number to queue (0: none), and whether the answer changes the card.
- `ui.js`, `next`: a queue item's `retry` is now the retry number, not a boolean. The chip test
  `!!item.retry` and the keyboard-block placement of D-021 stay as they are.
- A card without a record is always applied. This can happen when dictation falls back to the reading
  card between two tries (sound switched off, D-005).
- The answer log keeps every try, so accuracy on the end screen and Stats counts every try, as it
  already did for the one retry.

## Acceptance criteria
- Unit test: `retryPlan` for a right answer, a miss on each try, and the cap.
- Smoke test: a session answered entirely with "don't know" shows a sentence 4 times, not 5, and adds
  exactly 2 lapses per sentence.
- A correct retry takes the sentence out of the session.
- `npm test` passes.

## Effort and risks
About 10 lines of logic. Risks:
- A hard sentence takes longer. The cap of 3 and the End session button limit this.
- When a missed sentence is the last card left, it comes back at once, with the answer still in mind,
  so a correct answer is partly copying. This is already true for the one retry of D-024, so this
  record adds no new kind of risk.

## As built
- `core.js`: `MAX_RETRIES`, `retryPlan`. `ui.js`: `next` uses them. Tests in `tools/test_core.js`
  and `tools/smoke_ui.js`.

### Decisions taken
- The cap is 3 retries and only the first two misses of a session count against the card. Without
  this, one hard sentence would take four FSRS penalties and four lapses in one sitting, and two
  lapses already send a dictation card back to the reading card (D-005).

## Open questions
None.
