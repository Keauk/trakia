# D-019: Show an extra typed word in the expected line, struck through where it was typed

Status: done (2026-10-22) · Created: 2026-10-22 · Area: feedback UI (`core.js`: `wordMarks`; `ui.js`: `renderExpected`, `markCount`; `index.html`: `.expected del`)

## Context
Since D-015 the result bar highlights the words of the expected sentence that the typed answer does
not contain. A word the learner typed that is not in the expected sentence has no place in that
line, so it is never shown. "Do you really work on Sunday?" against "Do you work on Sunday?" is
marked wrong (D-014 counts an extra word as a wrong form), the note says "Differences highlighted"
or `extra "really"`, and nothing in the line is highlighted; the `wordMarks` unit test even asserted
that. The learner's report: when you add one word too many, the difference is not highlighted.

## Proposal
1. A typed word with no counterpart in the expected sentence appears in the expected line at the
   place where it was typed, struck through in the wrong colour: "Do you ~~really~~ work on
   Sunday?". It reads as "this word does not belong here".
2. Only pure insertions get this. Where the typed word stands in place of an expected word that is
   itself highlighted (a substitution such as "at" for "on"), the highlighted word already marks
   the spot and the typed answer is visible right above, so the typed word is not added. This keeps
   a completely wrong answer from turning into a line of struck words, the clutter that made the old
   character diff hard to read (D-010).
3. A word in the wrong place therefore shows twice: highlighted where it belongs, struck through
   where it was typed.
4. Struck words count as highlights: an answer whose only difference is an extra word gets the
   "small differences highlighted" note, and the choice between equivalent accepted answers (fewest
   marks) counts them too.

Not proposed: per-letter marks, marks inside the typed field, any change to checking or scheduling.

## Design notes
- `core.js`: `wordMarks(typed, expected)` still returns the expected words in order with `miss`,
  and now also entries `{ w, miss: false, extra: true }` for pure insertions, `w` being the typed
  word without surrounding punctuation. Gaps come from the LCS pairs: between two matched words,
  the leftover typed words are extras only when no expected word in that gap is marked.
- `ui.js`: `renderExpected` renders extras as `<del title="extra word">`; `missCount` becomes
  `markCount` (missing or extra) for the highlight flag and the closest-answer choice.
- `index.html`: `.expected del` in `--wrong` on `--wrong-tint`, line-through, same padding as `mark`.
- Tests: `tools/test_core.js` cases for an extra word in the middle, at the start and at the end, a
  substitution (no extra), a moved word, and the unchanged sentence text; `tools/smoke_ui.js`
  types an answer with an extra word and expects a `<del>` in the expected line.

## Acceptance criteria
- "Do you really work on Sunday?" against "Do you work on Sunday?" shows "really" struck through
  between "you" and "work" and nothing else marked.
- "Do you work at Sunday?" still marks only "on".
- The struck word is legible in light and dark, at 360 px and 1280 px.
- `npm test` and `python3 tools/check_decisions.py` pass.

## Effort and risks
Small: about 20 lines in `core.js`, a few in `ui.js` and the CSS, plus tests; one sitting.
- A struck word inside the correct answer could be read as part of it. The strike-through, the
  wrong colour and the "extra word" tooltip mark it as not belonging.
- With a repeated word ("I really really like it") the LCS may put the struck copy before or after
  its twin; either reading is right.

## As built
- Shipped as proposed: `wordMarks` adds `{ extra: true }` entries for pure insertions,
  `renderExpected` shows them as `<del title="extra word">` in `--wrong` with a line-through,
  `markCount` (was `missCount`) counts them, so an answer whose only difference is an extra word
  gets highlights and the right note. Cache version `trakia-v31`.
- Tests: a new `wordMarks: extra typed words (D-019)` group in `tools/test_core.js` (middle, start,
  end, repeated word, substitution, wholly wrong answer, moved word, punctuation-only token);
  `tools/smoke_ui.js` now types the fifth card with an extra leading word and expects one `<del>`
  and no `<mark>`.
- Checked in Chromium at 360 px (light) and 1280 px (dark): "Ik ~~echt~~ praat tegen jou!" with
  "Differences highlighted".

### Decisions taken
- With a repeated word ("хляб и и мляко") the struck copy is the second one, where the LCS leaves it;
  the test pins that order.

## Open questions
- Should a substituted word also be shown struck through next to the highlighted one? Left out to
  keep wrong answers readable; revisit if the typed field above turns out to be too far away.
