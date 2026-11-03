# D-047: Offer ѝ in a tiny dropdown when the learner types a lone и

Status: in progress · Created: 2026-11-03 · Area: practise (`ui.js`: the `#answer` handlers; `core.js`: `loneYi`)

## Context
ѝ (her) and и (and) are different words, but a Bulgarian keyboard makes ѝ hard to type, so the learner
types и. With the default settings the answer is then correct, but the expected line marks the ѝ and
the note says "Accepted — small differences highlighted" (`C.wordMarks` compares the raw text). With
"Strict ѝ" on, the answer is only "almost". The learner asked for a quick way to type ѝ.

In the data, ѝ occurs in 14 sentences, in the grammar drills and in the stories. It is always a word
of its own, and no accepted sentence answer starts with it.

## Proposal
1. When the learner types a lone и in the answer field, a tiny dropdown with ѝ shows at once, under
   the caret.
2. Tab accepts it: the и becomes ѝ and the caret stays after it. On a phone, which has no Tab key, a
   tap on the dropdown does the same and keeps the keyboard open.
3. Anything else leaves a regular и and closes the dropdown: the next letter, a space, punctuation,
   Enter, Escape, moving the caret, leaving the field, or a tap anywhere else.
4. A lone и is an и with no letter before or after it. An и inside a word shows nothing, because ѝ is
   never part of a longer word.
5. It works on all typed answers: sentence cards, dictation and grammar drills. With "Latin keyboard
   for Bulgarian" on, a lone `i` on a Bulgarian answer counts as и.
6. When nothing is offered, Tab moves the focus as before.

Not proposed: a setting to switch it off; choosing ѝ by meaning; a capital Ѝ. A sentence answer gets
its capital from D-038, so a first И shows nothing, and ѝ never starts a sentence. In a grammar drill
the first letter stays small, so a drill answer "ѝ" works.

## Design notes
- `C.loneYi(text, caret, latin)` in `core.js` is pure: it returns the position of a lone и right
  before the caret, or -1.
- `ui.js`: a new `input` listener on `#answer`, after the D-038 and translit listeners, shows or hides
  the dropdown. Only typed text opens it (`inputType` `insertText` or `insertCompositionText`), not a
  deletion or a paste. `yiAt` holds the position on offer.
- Accepting replaces that one character and dispatches `input`, so that the translit preview and the
  field height follow. No и is left, so the dropdown closes.
- A textarea does not report its caret position. `caretBox` measures a hidden copy of the text with a
  marker at the caret. This runs only when a lone и is typed.
- `#yi-pop` is a button at the end of the body, positioned absolutely like `#word-pop`, so the page
  does not move under the learner. `mousedown` keeps the focus in the field, as on `#answer-actions`.
- A click listener on the document closes it, as for `#word-pop`. `blur` is not enough, because not
  every browser takes the focus from the field when a button is tapped.
- It opens below the caret, or above the caret when the phone keyboard leaves no room
  (`visualViewport`).

## Acceptance criteria
- `tools/test_core.js`: `loneYi` for a lone и, an и inside a word, punctuation next to it, the caret
  in the middle of the text, and `i` with and without `latin`.
- `tools/smoke_ui.js`:
  - a lone и shows the dropdown, and Tab gives ѝ and closes it;
  - with no dropdown, Tab is not caught;
  - a next letter, a space, a deletion, Escape, leaving the field, another tab and quitting the session
    close it and keep the и;
  - Enter checks the answer with the и;
  - a tap gives ѝ;
  - a first и on a sentence card shows nothing, and on a drill card it does;
  - the translit preview shows ѝ.
- In a real browser, the dropdown sits under the и, on one line and on a wrapped line, on a desktop
  and at phone width.
- `npm test` passes.

## Effort and risks
About 30 lines of app code, plus tests. No change to the data or the schedule.

- Accepting ѝ does not change the verdict while "Strict ѝ" is off. The gain is correct writing and no
  highlight on the ѝ.
- Words that start with и (имам, искам) show the dropdown for one keystroke. The learner asked for it
  to show at once, so there is no delay. It does not animate and does not move the page.
- A phone keyboard may hold composing text when the field value changes. D-038 changes the value in
  the same way. Check it on a real phone.

## As built
- Built as proposed: `C.loneYi` in `core.js`, the dropdown in `ui.js`, `#yi-pop` in
  `index.html`, and tests in `tools/test_core.js` and `tools/smoke_ui.js`.
- It stays in progress until it is checked on a real phone. Chromium with phone emulation and
  simulated composition passes, but that does not prove the behaviour of Gboard or the iOS keyboard.

### Decisions taken
- An и inside a word shows nothing, although the request said "whenever you type an и". ѝ is never
  part of a longer word, so Tab there would only misspell the word.
- The dropdown sits at the caret, not at a fixed place under the field, so that it shows where the
  learner is typing, also on a long or wrapped line.

### Measurements
2026-11-03, the app in Chromium with real key presses and taps:
- Desktop (1280 × 800): the dropdown is 68 × 29 px, under the и, on one line and on a wrapped line. It
  does not cover the buttons in the screenshots of these two cases.
- Phone (Pixel 7 emulation): 49 × 40 px and inside the screen. A tap gives ѝ and keeps the focus.
- A window with little room below: it opens above the caret. A scrolled page: same place relative to
  the field.
- A tap on End session, Check, Don't know or the prompt closes it, on both sizes. End session also
  closes it on desktop when the button does not take the focus.
- All 14 sentences with ѝ: with the inserted character (U+045D, as in the data) the answer has no
  highlight and is correct under "Strict ѝ". With a plain и, the one checked sentence has 1 highlight
  and is "almost" under "Strict ѝ".
- In the sentence data, 6175 и, of which 977 start a word and 340 stand alone. Offering only at the
  start of a word avoids 84% of the openings.

## Open questions
- On a real phone keyboard, does the ѝ stay after a tap when typing goes on?
