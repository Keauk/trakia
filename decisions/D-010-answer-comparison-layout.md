# D-010: Show "you typed" and "correct" as two aligned lines instead of an inline diff

Status: proposed · Created: 2026-10-22 · Area: feedback UI (`index.html`: `showFeedback`, `checkDrill`), `core.js` (`diff`)

## Context
After a wrong or almost answer the app shows the expected sentence and, under it, a single line with
the typed text and the expected text merged: deleted characters struck through, inserted characters
highlighted, interleaved. Reading it means reassembling two sentences from one string. It is hardest
exactly where it matters: a whole wrong word becomes a struck-through word glued to a highlighted
word, and a one-letter slip inside a Cyrillic word is easy to miss. The learner's verdict: confusing.

## Proposal
Replace the merged line with two aligned lines:

```
You typed   Тя има лицето на дете.
Correct     Тя има лице   на дете.
```

- **Word-level alignment first.** Align the two sentences word by word (LCS over normalised tokens).
  Words that match are shown plain; a word that differs is marked on both lines (typed word in the
  "wrong" colour, expected word in the "right" colour); a missing word is shown as a highlighted gap
  on the typed line; an extra word is marked on the typed line only.
- **Character detail only inside a changed word.** When a typed word and the expected word at the
  same position differ by a small edit (distance ≤ 2), underline the differing letters inside that
  word on both lines, so a typo like "мляко / млеко" is pinpointed without the strike-through soup.
- **Monospace is not required**: use the normal serif face at the same size on both lines, with the
  labels in a fixed-width column so the sentences start at the same x and stay aligned by word.
  Use `<span>` per word with a right margin so the eye can pair words; do not try pixel alignment.
- **Punctuation and case** follow the expected answer's spelling (the checker already ignores them),
  so the "Correct" line is the real sentence, not the normalised one.
- The "Expected" line and the "Also accepted" list stay; the merged diff line goes away. The same
  component is used for sentence answers and grammar drills (drills usually have one word, so it is
  just two short lines).
- **Correct answers show only the typed line** (nothing to compare). **Almost** shows both lines;
  with a word-order near miss, no words are marked but the "Correct" line shows the expected order.

## Design notes
- `core.js`: add `wordDiff(typed, expected)` returning `[{op: 'eq'|'sub'|'del'|'ins', typed, expected,
  chars?}]` where `chars` holds the per-character marks for `sub` pairs within edit distance 2. Keep
  the existing `diff` for tests and the inner character marks.
- `index.html`: a small `.cmp` block with two rows, `.cmp-typed` / `.cmp-right`, word spans with
  classes `w-bad`, `w-good`, `w-gap`, and `<u>` for character marks. Colours reuse `--bad-bg` /
  `--ok-bg`; the strike-through style is removed.
- Normalisation for alignment uses the checker's `normalise` so the marks agree with the verdict.
- Tests: word alignment cases (substituted word, missing word, extra word, reordered words, typo
  inside a word), and the smoke test asserts the two-line block renders after a wrong answer.

## Acceptance criteria
- After a wrong answer the feedback shows two labelled lines, aligned by word, with the differing
  words marked on both lines and no interleaved strike-through text anywhere in the app.
- A one-letter typo shows both lines with only that letter marked inside the word.
- A missing word shows a visible gap marker on the typed line at the right position.
- Works for grammar drills and for both practice directions; passes the headless UI test.

## Effort and risks
~80 lines in `core.js` and the UI, one evening. Risk: word alignment on long sentences with two
changes can pair the wrong words; keep the LCS on normalised tokens and fall back to "all differ"
marking when the alignment is poor (fewer than half the words match).

## As built
Not started.

## Open questions
- Keep a tiny "show character diff" toggle for those who want the old view? (Proposal: no.)
- Label language: "You typed / Correct" in English like the rest of the app, or Dutch?
