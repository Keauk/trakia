# Decision log

One file per work item. Status is one of **proposed → accepted → in progress → done / rejected**.
Each file follows the same shape: context (why), proposal (what), design notes (how, tied to the
current code), acceptance criteria (how we know it is done), effort and risks, open questions.

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
| [D-010](D-010-answer-comparison-layout.md) | Show "you typed" and "correct" as two aligned lines instead of an inline diff | feedback UI | proposed |
| [D-011](D-011-english-practice-language.md) | English as a second practice language (BG ⇄ EN) | data / directions | done |

Suggested order for the open items: D-010 (answer comparison layout), D-006 (explanations), D-005 (audio),
D-004 (production focus), D-007 (sessions and reminders).
