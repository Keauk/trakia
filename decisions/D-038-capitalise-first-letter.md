# D-038: Capitalise the first letter of a typed sentence answer

Status: done (2026-10-29) · Created: 2026-10-29 · Area: practise (`ui.js`: the `#answer` input handler)

## Context
Answer checking ignores case, but the word highlights of the expected line are case-sensitive
(D-015, so that an accepted "sunday" still marks "Sunday"). An answer typed with a lowercase first
letter is accepted with "Accepted — small differences highlighted" and the first word marked.
`autocapitalize="sentences"` on the field does not help on a desktop keyboard, and not on every
phone keyboard. The learner reported this as annoying on every sentence.

## Proposal
1. While the learner types a sentence answer (any direction, also dictation), a lowercase first
   letter turns into a capital at once, in the field.
2. Only when the first character is a letter: "'s avonds" stays as typed.
3. Grammar drills (word forms) and the word cards (D-035) are unchanged.

Not proposed: changing the case-sensitive word highlights for the rest of the sentence.

## Design notes
- In the `input` listener of `#answer` (`ui.js`), after the line-break handling: when a sentence
  session runs (`session && !session.drill`) and the first character is a lowercase letter
  (`\p{Ll}`), replace it with its upper case and keep the caret.
- The transliteration preview listener runs after it, so "kupih" previews as "Купих"; `C.translit`
  keeps the case.

## Acceptance criteria
- Smoke test: typing "a" in a sentence card gives "A"; the translit preview of "kupih hlyab" is
  "Купих хляб"; an answer typed in lowercase is correct without highlights.
- `npm test` passes.

## Effort and risks
A few lines. Risk: an answer that should start in lowercase; none of the sentences' accepted answers
do, apart from "'s …", which starts with an apostrophe.

## As built
- Built as proposed in the `#answer` input listener; smoke test extended.
- An answer the learner adds as accepted ("I was right") is now stored with its capital.
- The D-015 smoke check of a lowercase answer now expects a highlight only for capitals after the
  first letter.

## Open questions
None.
