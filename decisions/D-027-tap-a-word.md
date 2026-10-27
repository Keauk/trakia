# D-027: Tap a word in a story to see its dictionary form and meaning

Status: in progress · Created: 2026-10-26 · Area: reading UI (`ui.js`: `renderStoryText`, `showWordPop`; `index.html`: `#word-pop`)

## Context
In the Reading tab (D-026) the learner meets inflected forms they have not seen in that shape:
`отиваме`, `детето`, `го`. Their Anki deck taught the dictionary form (`отивам`, `дете`, `той`).
Without help, one unrecognised form can stall a whole sentence, and the only remedy is the full
paragraph translation, which gives away everything at once. A per-word lookup keeps the learner
reading the Bulgarian.

## Proposal
1. Every Bulgarian word in a story is tappable (click on the laptop).
2. A tap opens a small card next to the word: the dictionary form, its meaning (English, as in
   the deck), and where it sits in the deck ("word 59"), or "name" for a person or place.
   Glossed words above the level (D-026) show their meaning in the practice language and "not yet
   in your deck".
3. The card closes on a second tap, a tap elsewhere, or Escape. Only one is open at a time.

Not proposed: lookup in the practice screen (the sentences have no per-word mapping), adding a
word to a list, translations of the meaning into Dutch.

## Design notes
- The story's `words` map (D-026) gives form → lemma; `WORDS` (rank order) and
  `C.wordIndex` give lemma → rank and meaning. Free function words without a mapping get a
  built-in meaning list (`ли` = question particle, `не` = not, `да` = to / that, `ще` = will,
  forms of `съм` = to be, `се` = oneself (reflexive), `по-` / `най-` = more / most).
- `C.storyTokens(text)` splits a text into word and non-word pieces (hyphens are separators for
  lookup, kept in the display), shared with the validator's rule so the UI and the check agree.
- Rendering: each word is a `<button class="w" data-form>` inside the paragraph, styled as plain
  text (no button look), so it is reachable by keyboard and screen reader. One `#word-pop`
  element, positioned under the tapped word and kept inside the viewport.
- No state is stored.

## Acceptance criteria
- Tapping `отиваме` shows `отивам – to go · word 59`; tapping a name shows "name"; tapping a
  glossed word shows its practice-language meaning and "not yet in your deck".
- Every word token of every bundled story resolves to a lemma, a name or a free word (checked by
  `validate_stories.py`, and by a test over the bundled stories).
- The smoke test taps a word and checks the card's text, then closes it with Escape.

## Effort and risks
A couple of hours on top of D-026. Risk: a form shared by two lemmas (`те` = they / you-clitic,
`си` = are / one's own) maps to one lemma per story; the writer picks the meaning used there.

## As built
- Built as proposed; not yet committed. `ui.js`: `storyHtml` renders every word as a
  `button.w`, `wordInfo` builds the card (deck word with rank, glossed word in the practice
  language with "not yet in your deck", name, or a built-in meaning for the free function words),
  `showWordPop` / `hideWordPop` place and close `#word-pop` (second tap, tap elsewhere, Escape,
  resize).
- A deck word above the learner's Anki position (possible with tolerance) says "not yet reached
  in Anki".

### Decisions taken
- The writers may map a form to a `lemma#rank` entry for a homograph (`под#413` = under); the
  lookup honours it like the validator does.
- Each word button sits in a `white-space: nowrap` span with the punctuation that touches it: a
  browser may break a line on either side of a button, which put a full stop or an opening „ on a
  line of its own (seen in a 375 px screenshot).
- Forms of address (vocative: Петре, мамо, бабо, тате, лекарю) are listed per story in
  `vocative` and mapped to their base form; the card shows the base form and the line "петре: the
  form for addressing someone (vocative)". Added after the learner asked why the first story
  writes both Петре and Петър; the brief and the validator require the list from now on.
- Map keys keep ѝ (her) apart from и (and); before, tapping ѝ showed "and". Fixed with D-030,
  which needed the same keys for the sentences.
- Practice sentences mark their forms of address too (`vocative`, found by
  `validate_sentences.py`: a noun or name in a vocative form set off by a comma, ! or ?), so tapping
  "госпожо" on the practice screen says it is the form for addressing someone. Restricting it to
  nouns and names was needed: by ending alone, verbs (имаме) and adjectives (студено) matched. 21
  places in 2,656 sentences (госпожо, госпожице, господине, бабо, мамо), all checked by hand.

## Open questions
- ~~Also offer the lookup on the Bulgarian prompt in the practice screen, once sentences carry a
  form → lemma map?~~ Done in D-030: after an answer the Bulgarian prompt can be tapped.
