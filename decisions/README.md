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
| [D-005](D-005-audio-and-dictation.md) | Speak Bulgarian sentences and add a dictation mode | practise UI | proposed |
| [D-006](D-006-explanatory-feedback-and-self-judgement.md) | Explain why an answer was wrong; ask for a confidence judgement first | feedback UI | proposed |
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

Suggested order for the open items: D-006 (explanations), D-005 (audio),
D-004 (production focus), D-007 (sessions and reminders).
