# D-002: Make "almost" less forgiving as a card matures

Status: proposed · Created: 2026-10-21 · Area: checking and scheduling (`core.js`: `check`, `applyResult`; `index.html`: `showFeedback`)

## Context
A near miss (within the typo tolerance, or the same Bulgarian words in another order) is scored
**almost**: it counts as a success for the session and never demotes the card, but it does not
advance the card either. That is kind early on, when the learner is still forming the word, but the
testing-effect research is clear that the benefit comes from successful, effortful retrieval of the
*exact* form. A learner can sit on "almost" forever, always one letter off, and the card never lapses.

## Proposal
A three-stage policy per card:
1. **Young card** (box ≤ 2, or stability < 1 day under D-001): almost counts as correct and advances
   the card, at most **two** times per card. The exact diff is shown so the slip is corrected on the
   spot (already the case).
2. **Established card** (box 3–5): almost keeps the card where it is and re-schedules it at the same
   interval (today's behaviour).
3. **Mature card** (box ≥ 6, or stability ≥ 7 days): a clean answer is required; almost is treated as
   wrong for scheduling (the card lapses) but the verdict still reads "almost" so the feedback is
   honest about how close it was.
Thresholds become settings with these defaults so a learner can keep the lenient mode if they prefer.

## Design notes
- Add `almosts` (count of almost answers that were credited) to the progress record.
- `applyResult` takes the policy into account: map almost → correct when stage 1 applies and
  `almosts < 2`, → unchanged in stage 2, → wrong in stage 3. The log keeps the raw score (1) so the
  stats stay truthful; add the effective rating as a fifth element if needed for D-001 optimisation.
- The verdict panel says which rule applied: "≈ Almost — counted as correct (2 of 2 free passes
  used)" / "≈ Almost — this card is mature, so it goes back for review".
- Word-order near misses (`reason: 'order'`) should follow the same stages; they are a different
  skill than typos, so consider a separate free-pass counter.
- "My answer was correct" is unaffected: it still upgrades to correct and stores the alternative.

## Acceptance criteria
- Unit tests for each stage and for the free-pass counter.
- A card at box 7 answered with one typo lapses and reappears in the same session.
- A new card answered with one typo twice reaches box 2; the third typo leaves it at box 2.
- Stats "accuracy" still counts almost as success (session accuracy is about retrieval, not scheduling).

## Effort and risks
Small: ~40 lines plus tests. Risk: feeling punitive on long sentences where a single typo is likely;
the diff and the honest verdict text mitigate that, and the typo tolerance setting still applies.

## Open questions
- Should stage 3 also apply to the Dutch direction, where typos are less about the target language?
- Under D-001, is "treat as Hard" a better stage-2 mapping than "unchanged"?
