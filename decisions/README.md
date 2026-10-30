# Decision log

One record per feature; `CLAUDE.md` in the repository root says what counts as a feature and when
a record is written. Every record follows `TEMPLATE.md`: a status line, then the sections Context,
Proposal, Design notes, Acceptance criteria, Effort and risks, As built, Open questions, always in
that order. Status is one of **proposed → accepted → in progress → done / rejected** and must match
the table below; `python3 tools/check_decisions.py` verifies the structure and the table.

| id | title | area | status |
|----|-------|------|--------|
| [D-001](D-001-fsrs-scheduler.md) | Replace the Leitner ladder with an FSRS-style scheduler | scheduling | done |
| [D-002](D-002-almost-strictness.md) | Make "almost" less forgiving as a card matures | checking / scheduling | done |
| [D-003](D-003-interleaving-and-coverage.md) | Interleave sessions and close vocabulary coverage gaps | session builder / data | done |
| [D-004](D-004-productive-direction.md) | Weight sessions toward Dutch → Bulgarian once a sentence is known | session builder | proposed |
| [D-005](D-005-audio-and-dictation.md) | Hear every sentence, word and story in two natural Bulgarian voices, and add a dictation mode | audio / practise / reading | done |
| [D-006](D-006-explanatory-feedback-and-self-judgement.md) | Explain why an answer was wrong; ask for a confidence judgement first | feedback UI | done |
| [D-007](D-007-short-sessions-and-reminders.md) | Short, frequent sessions and a reminder nudge | session / PWA | proposed |
| [D-008](D-008-grammar-stages.md) | Gate sentences by grammar stage, not only by vocabulary rank | data / eligibility | done |
| [D-009](D-009-grammar-reference-and-drills.md) | Grammar reference tab with "give the form" drills | new tab / content | done |
| [D-010](D-010-answer-comparison-layout.md) | Show "you typed" and "correct" as two aligned lines instead of an inline diff | feedback UI | rejected |
| [D-011](D-011-english-practice-language.md) | English as a second practice language (BG ⇄ EN) | data / directions | done |
| [D-013](D-013-ui-file-and-type-checking.md) | Move the UI script out of index.html and type-check the JavaScript | tooling | done |
| [D-012](D-012-collapsible-alternatives.md) | Collapse the "Also accepted" list behind a subtle toggle | feedback UI | done |
| [D-014](D-014-stricter-answers-and-loose-tier.md) | Accept fewer loose translations, mark the looser ones, stop counting wrong word forms as typos | checking / data | done |
| [D-015](D-015-practise-screen-redesign.md) | Restyle the app after the practise-screen design: palette, type, progress bar, phone tab bar, word highlights | look / feedback UI | done |
| [D-016](D-016-theme-switch.md) | Switch between light and dark mode from the top bar | top bar | done |
| [D-017](D-017-faithful-exact-tier.md) | Only a faithful translation counts as exact; mark every idiomatic drift as looser | data / feedback UI | done |
| [D-018](D-018-ambiguous-you-and-gender.md) | Accept ти and вие when the English "you" leaves it open, and either gender when no prompt shows it | checking / data | done |
| [D-019](D-019-extra-word-highlight.md) | Show an extra typed word in the expected line, struck through where it was typed | feedback UI | done |
| [D-020](D-020-combined-alternatives.md) | Accept every correct combination of the listed alternatives | data / tooling | done |
| [D-021](D-021-quieter-result-and-keyboard-blocks.md) | A quieter result panel, and blocks of cards per keyboard instead of a switch on every card | feedback UI / session builder | done |
| [D-022](D-022-like-obicham-haresvam.md) | Accept харесвам next to обичам when the translation says "like" | data / brief | done |
| [D-023](D-023-wallpaper.md) | A moving wallpaper behind the app: a built-in fireplace or the learner's own video | look | done |
| [D-024](D-024-short-varied-sessions.md) | Shorter sessions of 20 different sentences, with no repeats between sessions in a row | session builder / scheduling | done |
| [D-025](D-025-gist-sync.md) | Sync progress between devices through a secret GitHub gist | sync / storage | in progress |
| [D-026](D-026-reading-tab.md) | A Reading tab with short stories at the learner's level | new tab / content | in progress |
| [D-027](D-027-tap-a-word.md) | Tap a word in a story to see its dictionary form and meaning | reading UI | in progress |
| [D-028](D-028-comprehension-questions.md) | Comprehension questions after each story, counted on the Stats tab | reading UI / stats | in progress |
| [D-029](D-029-history-compaction.md) | Keep 30 days of answer history in full and older days as daily totals | storage / stats | done |
| [D-030](D-030-sentence-word-maps.md) | Map every word of every practice sentence to its dictionary form | data / checking / practise UI | done |
| [D-031](D-031-sneak-peek.md) | Sneak peek: guess the meaning of the next Anki words from a sentence, before Anki teaches them | practise | done |
| [D-032](D-032-publish-guards.md) | Nothing reaches the phone unchecked: tests before every publish, and no manual cache bump | tooling | done |
| [D-033](D-033-speak-tab.md) | A Speak tab: say the Bulgarian for a Dutch or English word or sentence, checked by speech recognition | new tab | rejected |
| [D-034](D-034-hands-free-listening.md) | Hands-free listening: Dutch, a pause to answer in your head, then the Bulgarian; and Bulgarian in the background | practise / audio | in progress |
| [D-035](D-035-words-in-trakia.md) | Learn the deck's words in Trakia: word cards on the same FSRS schedule, a daily limit, the Anki position kept up to date | practise / scheduling / tooling | in progress |
| [D-036](D-036-known-words-graph.md) | Show how many deck words the learner knows, day by day, in a small graph | stats / tooling | in progress |
| [D-037](D-037-peek-noun-forms.md) | Sneak peek asks a noun in the form the sentence uses ("plates", "the plate") | practise / data | done |
| [D-038](D-038-capitalise-first-letter.md) | Capitalise the first letter of a typed sentence answer | practise | done |
| [D-039](D-039-explain-sentence.md) | Explain a practice sentence word by word: what changed from the dictionary form, and why | data / practise UI | done |
| [D-040](D-040-library-words.md) | List the deck words the learner knows and is learning in the Library, with their meaning | library | in progress |
| [D-041](D-041-logo-goes-home.md) | Tap the Тракия logo to go to the Practise tab | header | in progress |
| [D-042](D-042-separate-daily-limits.md) | Pause new words on word reviews only, pause new sentences on sentence reviews, and show which is paused | scheduling / practise home | in progress |

Suggested order for the open items: D-005 (audio), D-004 (production focus, to be read against
D-024's one card per sentence), D-007 (continue button and reminders).
