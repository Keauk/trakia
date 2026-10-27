# D-030: Map every word of every practice sentence to its dictionary form

Status: done (2026-10-27) · Created: 2026-10-26 · Area: data / checking / practise UI (`data/sentences.json`: `words`; `tools/validate_sentences.py`, `tools/map_sentence_words.py`; `ui.js`: the prompt after an answer)

## Context
A practice sentence records which deck words it uses as a hand-written `lemmas` list, and its
`max_rank` (the Anki position at which it unlocks, D-003) is the highest rank in that list. Nothing
checks the list against the sentence: a word left out of it does not count. A first measurement
found 991 of 16,235 running words that match no listed lemma. Some are harmless (names, irregular
forms of a listed verb), but some are real omissions: `ден` (day) occurs in 17 sentences without
being listed, so those sentences can unlock before the learner has met the word.

The reading stories (D-026) solved this with a map from every word form to its dictionary form,
checked word by word. The same map on the sentences would make the unlock rank exact and would
let the learner tap a word in a practice sentence, as in the stories (D-027).

## Proposal
1. Every practice sentence gets a `words` map: each word form of its Bulgarian text (lower case)
   to its dictionary form in the deck, like the stories.
2. The validator checks every word of every sentence against it and adds to `lemmas` every
   dictionary form the map uses that the list lacks; `max_rank` follows. The map only adds: a word
   the writer listed is never dropped. A sentence whose rank rises becomes available later; a card
   already in review is not affected (it keeps coming back, as today).
3. **Tap a word after answering**: once a card is answered, the Bulgarian prompt (Bulgarian →
   Dutch/English) has tappable words with the same card as in the stories. Not before answering,
   so it never works as a hint.

Not proposed: maps for the alternative answers (`bg_alt`), tapping in the expected Bulgarian line
of the other direction (it carries the difference highlighting of D-019), a hint button.

## Design notes
- `tools/map_sentence_words.py data/words.json data/sentences.json`: proposes the map
  automatically, in this order: the form is the dictionary form or a listed form of one of the
  sentence's lemmas; a short pronoun or clitic (`ме` → `аз`, `го` → `той`); a table of irregular
  forms (`деца` → `дете`, `сложи` → `слагам`, `видях` → `виждам`, `дойде` → `идвам`); a shared
  stem with exactly one of the sentence's lemmas; a name. Words it cannot place are listed for a
  person (or an agent) to map by hand; nothing is guessed from the whole deck.
- `validate_sentences.py`: when a sentence has `words`, every word must be mapped, free or a
  name; `lemmas` = the writer's list plus the mapped dictionary forms it lacks; `max_rank` from
  them. It reports sentences whose rank changed.
- The free function words and the tokenizer are the ones of the stories (`FREE`,
  `C.storyTokens`).
- UI: `wordInfo` (D-027) is generalised to take a `words` map and a names list, so stories and
  sentences share it; the prompt is rendered with `storyHtml` after `showFeedback`.
- `data.js` grows by roughly the size of the maps (about 300 KB before compression).

## Acceptance criteria
- Every bundled sentence has a complete `words` map; the validator passes with no unmapped word.
- The validator's report lists every sentence whose `max_rank` changed, with its old and new rank.
- After answering a Bulgarian → Dutch card, tapping a prompt word shows its card; before answering
  the prompt is plain text. Smoke test for both.
- `npm test` and `check_decisions.py` pass.

## Effort and risks
One to two evenings: the tool, the hand-mapping of what it cannot place (a few hundred forms), the
UI. Risk: a wrong automatic match shows a wrong meaning; the stem rule only matches within the
sentence's own word list, and the irregular-form table is checked by hand. Risk: a rank going up
hides a sentence the learner was about to get; that is the correct behaviour.

## As built
- Built as proposed; not yet committed. Every one of the 2,656 sentences has a `words` map.
  `tools/map_sentence_words.py` placed all but 62 forms automatically; those 62 were mapped by hand,
  each to a lemma the sentence already listed (or a name). `validate_sentences.py` derives
  the missing lemmas and `max_rank` from the map and reports rank changes. `ui.js`: `wordInfo` and
  `storyHtml` take any `WordSource`; after an answer in the Bulgarian → Dutch/English direction the
  prompt is rendered as tappable words; Enter on a tapped word still goes to the next card.
- Also fixed on the way, for stories and sentences alike: the lookup kept ѝ (her) folded into и
  (and), so tapping ѝ said "and"; map keys now keep them apart (`C.storyKey`, both validators) and
  ѝ has its own meaning.

### Decisions taken
- The sentence's own lemma list always wins; the whole deck is consulted only for words the list
  cannot explain, and then only exact dictionary forms before listed forms. A first version that
  consulted the deck earlier mapped homographs wrongly (купи → купа "bowl", затвори → затвор
  "prison", уши → ухо "ear") and was discarded.
- A capitalised word at the start of a sentence is a name only if it occurs as a name inside some
  sentence (Мария), so imperatives like "Помогни" are not taken for names.
- Numerals 1–20 and the free function words do not raise the rank unless the writer listed them,
  as the sentence brief has always said.
- The map adds to the writer's lemma list instead of replacing it. Replacing it dropped words the
  writer had listed on purpose (`съм` for `е` in 62 sentences, `свой` for the short `си` in 21) and
  lowered ranks; Proposal item 2 now says so.

### Measurements
- 2026-10-26: 16,235 running words, 13,515 map entries. Of 90 randomly sampled non-obvious
  mappings (different first three letters, e.g. дръж → държа, видях → виждам, бъдем → съм) all 90
  were right. 15 sentences gained a lemma (14 a low-ranked pronoun such as `аз` for `ми`), none lost
  one, and the unlock rank changed for one: U096 1704 → 2793 (`счупен`, a deck word of its own, was
  missing). The feared omissions (`ден` in 17 sentences) turned out to be covered by phrase entries
  such as `рожден ден`. `app/data.js` grew from 2,783 KB to 3,161 KB (573 KB to 644 KB compressed).

## Open questions
- Tap words in the expected Bulgarian answer too, alongside the difference highlighting?
