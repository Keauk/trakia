# D-006: Explain why an answer was wrong; ask for a confidence judgement first

Status: done (2026-10-25) · Created: 2026-10-21 · Area: feedback UI (`ui.js`: `showFeedback`, `renderStats`; `index.html`: `#judge`, `#notes`), `core.js` (new `explain`, `aspectPairs`, `alignWords`)

## Context
Feedback today is the verdict, the expected answer, a character diff and the alternatives. Two
findings from the learning literature are cheap to act on: explanatory feedback ("the article is
wrong") beats bare correct-answer feedback, and a quick self-judgement before the reveal improves
calibration (knowing what you don't know), which in turn improves study decisions.

## Proposal
**Explanations.** After a wrong or almost answer, the typed sentence is aligned with the closest
accepted answer word by word (the D-014 alignment) and up to three short notes appear under the
expected line, each with a precise trigger:
- *Article* (Bulgarian): a pair that differs only by a definite-article suffix (-ът/-ят/-а/-я/
  -та/-то/-те/-ия/-ият) and whose bare form is a known word: "missing definite article: легло →
  леглото", "no article here: леглото → легло", or, when both carry one, "the full article -ът,
  because the noun is the subject" / "the short article -а, because the noun is not the subject".
- *Aspect* (Bulgarian): the two words are the two members of a verb pair in the deck's `forms`
  column ("ям / изям"): "aspect: a single completed action takes the perfective изям, not ям", or
  the reverse for an ongoing or repeated action.
- *Clitic order* (Bulgarian): the same words in another order, and every word that moved is a
  clitic (ме, те, го, я, ни, ви, ги, ми, ти, му, ѝ, им, се, си, съм forms, ще, не, ли): "short words
  like ми, се and ли stand right after the first stressed word".
- *Spelling* (every language): a pair within edit distance 2 that is not a word form:
  "spelling: млеко → мляко".
- *Missing word* / *extra word* (every language): a word on one side only.
A wholly different answer (more than four differing pairs) gets no notes. The D-014 "different
word form" line keeps only the slips that no note explains. Grammar drills are unchanged.

**Self-judgement: withdrawn.** The "Sure / Unsure" toggles and the calibration line were built
(commit 8455ac2) and removed the same day at the learner's request: they did not add anything to
the practice. See *Decisions taken*.

## Design notes
- `core.js`: the alignment inside `wordSlips` becomes `alignWords(t, a)`, which returns every
  aligned pair; `wordSlips` filters it as before. `aspectPairs(words)` maps each member of a verb
  pair to `{other, perfective}` (verbs only; "знам / зная" and "съм / бъда" are not aspect pairs
  and are skipped). `explain(t, a, lang, {vocab, aspects})` is pure and returns `[{kind, note,
  pair}]`, at most three, in the order the pairs occur.
- `ui.js`: `ASPECTS` built at load. `showFeedback` renders the notes into `#notes` and passes the
  uncovered slips to `slipText`. The judgement lives in `session.judgement`, is copied into
  `session.pending` at check time and written as the seventh log element. `renderStats` adds the
  calibration line from the log.
- `index.html`: `#judge` with two `aria-pressed` buttons under the answer field, `#notes` between
  the expected line and the alternatives.

## Acceptance criteria
- Unit tests for each note kind with hand-written examples (article in three forms, clitic order,
  aspect, spelling, missing word) and at least three negative cases where no note is produced.
- The headless smoke test exercises the notes list.

## Effort and risks
~150 lines plus tests; two evenings. Risk: a wrong explanation is worse than none, so every note kind
needs a precise trigger and the fallback is silence, never a guess.

## As built
- Built as revised above. `core.js`: `alignWords` (the D-014 alignment, now shared), `aspectPairs`
  (916 forms from 472 verb pairs in the deck), `explain`. `ui.js`: notes under the expected line,
  the covered slips dropped from the "different word form" line. `index.html`: `#notes`. Cache
  version `trakia-v35`; the removal of the judgement is `trakia-v36`.
- Checked in Chromium at 360 px (light) and 1280 px (dark): "Our kitchen is small, but the rooms
  are big." answered with *Кухня ни е малка…* shows "· missing definite article: кухня → кухнята"
  under the highlighted answer and no "different word form" line.
- Tests: a `D-006 explain` group in `tools/test_core.js` (article in four forms, including the
  adjective -ия/-ият; aspect both ways; which forms are not aspect pairs; clitic order and plain
  order; spelling in Bulgarian and Dutch; missing and extra word; four silent cases; the cap of
  three; the pair on each note; `alignWords` and `wordSlips` unchanged). The smoke test checks
  the spelling note on a typo.

### Decisions taken
- The proposal was rewritten before building: since it was written, D-014 added the word
  alignment, the form-slip line and the missing / extra wording, and D-015 and D-019 the word
  highlights, so the notes build on those instead of a second alignment.
- A wholly different answer is defined as more than four differing pairs, or more pairs than half
  the expected words; it gets no notes.
- Inside a block of notes the generic "same words, different order" is left to the verdict line;
  `explain` only adds the clitic note, and only when the non-clitic words stand in the same order.
- Grammar drills get no notes; their answers are single forms.
- The self-judgement was removed right after shipping: the learner found that the extra tap before
  every answer added nothing. Log rows written on 2026-10-25 may carry a seventh element (0, 1 or
  2); nothing reads it.

## Open questions
- ~~Should "Unsure + correct" be rated down, or only reported?~~ Moot: the judgement was removed.
- ~~Do we want the notes in Dutch for the learner, or keep the app in English?~~ English, like the rest of the app.
- Should the agreement of adjectives (gender, number: *голям* → *голяма*) get a note too?
