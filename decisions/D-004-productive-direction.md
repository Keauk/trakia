# D-004: Weight sessions toward Dutch → Bulgarian once a sentence is known

Status: proposed · Created: 2026-10-21 · Area: session builder (`core.js`: `cardKeys`, `buildSession`), Settings

## Context
Each sentence has two cards: BG→NL (recognition, type Dutch) and NL→BG (production, type Bulgarian).
The default *gated* mode unlocks the production card after one correct recognition answer, after
which both cards are scheduled with equal priority. Production is the harder skill and the one that
transfers to speaking and writing; once a sentence is recognised reliably, further recognition reviews
add little compared with production reviews of the same sentence.

## Proposal
- Keep gating as is (recognition first, production unlocked after one correct answer).
- Add a **production focus** setting (default on) with these effects:
  - When both cards of a sentence are due, the NL→BG card is served and the BG→NL card is pushed
    to the next session unless it has lapsed recently.
  - Once the production card reaches "known" (box ≥ 5, or stability ≥ 3 days under D-001), the
    recognition card is retired: it is no longer scheduled, keeps its history, and comes back only
    if the production card lapses twice.
  - New-card budget: when the eligible pool has both unseen BG→NL cards and unlocked-but-unseen
    NL→BG cards, fill at least half of `newPerSession` with NL→BG.
- Stats: show recognition and production separately (already the case) and add "retired" to the
  recognition counts so the numbers still add up.

## Design notes
- Add `retired: true` to a progress record; `buildSession` skips retired cards; a lapse on the
  sibling production card (lapses increased by 2 since retirement) clears the flag.
- `cardKeys` stays the single place that knows which directions exist for a sentence.
- The Library status badges need a "retired" rendering (greyed box number).

## Acceptance criteria
- With production focus on, a sentence whose NL→BG card is at box 5 no longer produces BG→NL
  reviews (test), and two lapses on the NL→BG card bring the BG→NL card back due (test).
- Both-due tie-break prefers NL→BG (test).
- Setting off restores today's behaviour exactly (existing tests pass unchanged).

## Effort and risks
~50 lines plus tests. Risk: learners who mainly want reading practice; the setting covers that.
Depends on D-001 only for the "known" threshold wording; can ship on the Leitner boxes first.

## Open questions
- Should retirement be permanent or time-boxed (e.g. one recognition review every 60 days)?
- Should "Bulgarian → Dutch only" mode still exist once production focus exists?
