# D-028: Comprehension questions after each story, counted on the Stats tab

Status: in progress · Created: 2026-10-26 · Area: reading UI (`ui.js`: `renderQuiz`), Stats (`renderStats`), data (`questions` in `data/stories.json`)

## Context
The Reading tab (D-026) lets the learner read and mark a story as read, but nothing shows whether
they understood it. A few questions at the end turn reading into practice with feedback, give a
reason to read the Bulgarian rather than the translation, and give the Stats tab a number for
reading next to the typing numbers.

## Proposal
1. Each story ends with **3–5 multiple-choice questions** about its content, with 3 or 4 options
   each, in the practice language (the language the story's translation uses).
2. Choosing an option marks it right or wrong at once and shows the right answer; a question
   cannot be answered twice.
3. When the last question is answered the story shows the score ("4 of 5") and counts as read.
   *Try again* resets the questions; the latest score is kept.
4. The Stats tab gets a **Reading** card: stories read (of those open to the learner) and the
   average score of the latest attempts.
5. The questions sit under the text, not on a separate screen, so the learner can look back while
   answering.

Not proposed: questions in Bulgarian, open answers typed by the learner, scheduling stories for
re-reading.

## Design notes
- Data per story: `questions: [{q: {nl, en}, options: [{nl, en}], answer: index}]`, written with
  the story under `tools/STORY_BRIEF.md`; questions test meaning (who, where, why, what happened),
  not a single word, and wrong options are plausible. `validate_stories.py` checks 3–5 questions,
  3–4 options, a valid `answer`, and both languages present.
- Option order is shuffled per attempt with a seeded order, so the right answer is not always in
  the same place.
- State: `trakia.reading[storyId].quiz = {at, score, total}` (D-026); synced with the rest of
  `reading` (D-025).
- Stats: `renderStats` adds the Reading card from `reading` and the eligible stories.

## Acceptance criteria
- Every bundled story has 3–5 valid questions in Dutch and English (validator).
- The smoke test answers a story's questions, sees the score, finds the story marked read, and
  sees the Reading card on the Stats tab with "1" read and the score.
- `npm test` and `check_decisions.py` pass.

## Effort and risks
Half an evening on top of D-026 and D-027, plus the questions themselves while writing the stories.
Risk: questions answerable without reading (common sense) or by matching one word; the brief asks
for questions that need the story, and the review read checks it.

## As built
- Built as proposed; not yet committed. 4–5 questions per story (65 in total) with 3–4 options in
  Dutch and English. `ui.js`: `startQuiz`, `renderQuiz`, `optionOrder` (seeded by story,
  question and attempt), `renderReadingStats`; Stats card *Reading* with stories read of those
  open and the average of the latest scores.
- Finishing the questions also marks the story read.

## Open questions
- Show the reading score in the 14-day chart, or keep it to its own card?
