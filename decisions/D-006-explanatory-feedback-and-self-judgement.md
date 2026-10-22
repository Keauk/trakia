# D-006: Explain why an answer was wrong; ask for a confidence judgement first

Status: proposed · Created: 2026-10-21 · Area: feedback UI (`index.html`: `showFeedback`), `core.js` (new `explain`)

## Context
Feedback today is the verdict, the expected answer, a character diff and the alternatives. Two
findings from the learning literature are cheap to act on: explanatory feedback ("the article is
wrong") beats bare correct-answer feedback, and a quick self-judgement before the reveal improves
calibration (knowing what you don't know), which in turn improves study decisions.

## Proposal
**Explanations (Bulgarian direction first).** After a wrong or almost answer, compare the typed
sentence with the closest accepted answer at word level and emit up to three short notes:
- *Missing word* / *extra word*: token present in one side only (after normalisation).
- *Spelling*: a token pair within edit distance ≤ 2 ("мляко ≠ млеко").
- *Article*: token pair that differs only by a definite-article suffix (-ът/-ят/-а/-я/-та/-то/-те)
  — "хляб → хляба: the noun needs the article here" or the reverse.
- *Clitic order*: same multiset of tokens, different order, and the differing tokens are clitics
  (ме, те, го, я, ни, ви, ги, ми, ти, му, ѝ, им, се, си, съм forms, ще, не, ли) — "short pronouns go
  after the first stressed word".
- *Aspect pair*: the typed verb and the expected verb are listed together in the deck's `forms`
  column (e.g. "ям / изям"): "aspect: the completed action takes the perfective изям".
- *Word order* (non-clitic): "same words, different order — accepted as almost".
Anything else falls back to the diff only. The Dutch direction gets the generic notes (missing /
extra / spelling) only.

**Self-judgement.** Before Enter reveals the verdict, show two small buttons "Sure" and "Unsure"
(keys 1 and 2). Choosing is optional; skipping records "no judgement". Stats gains a calibration
line: "when you said sure you were right 91 % of the time; unsure: 48 %". Under D-001 an "unsure +
correct" answer could be rated Hard rather than Good.

## Design notes
- `explain(typed, expected, lang, deckIndex)` in `core.js`, pure, returning `[{kind, note}]`; fed by
  `wordIndex` plus a new `aspectPairs` map built from the `forms` column at startup.
- Token alignment: reuse the LCS approach from `diff` on word arrays rather than characters.
- The judgement is stored in the log row (sixth element) and in `progress` as counters
  `sure`, `sureWrong`, `unsure`, `unsureRight` for the calibration line.
- UI: the judgement buttons sit under the input; the explanation notes render as a bullet list
  between the diff and the alternatives.

## Acceptance criteria
- Unit tests for each note kind with hand-written examples (article, clitic order, aspect, spelling,
  missing word) and at least three negative cases where no note is produced.
- The calibration line appears after ten judged answers.
- The headless smoke test exercises the judgement buttons and the notes list.

## Effort and risks
~150 lines plus tests; two evenings. Risk: a wrong explanation is worse than none, so every note kind
needs a precise trigger and the fallback is silence, never a guess.

## As built
Not started.

## Open questions
- Should "Unsure + correct" be rated down, or only reported? (Start with reporting only.)
- Do we want the notes in Dutch for the learner, or keep the app in English?
