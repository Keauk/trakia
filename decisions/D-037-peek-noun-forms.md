# D-037: Sneak peek asks a noun in the form the sentence uses ("plates", "the plate")

Status: done (2026-10-29) · Created: 2026-10-29 · Area: practise (`core.js`: `peekItems`; `ui.js`: `renderPeek`), data (`data/plurals.json`, `tools/build_data.py`, `tools/check_plurals.py`)

## Context
The sneak peek (D-031) marks a word in a sentence and asks "What does *word* mean here?" with four
deck meanings. The deck has one meaning per dictionary form, so for "В шкафа има чинии и чаши" it
asks about *чинии* (plates) and offers "bowl, knife, sink, plate". The learner reported that the
options do not match the word in the sentence.

Sentences use a plural noun form about 600 times (343 plain plurals, 252 with the article). The
deck lists a Bulgarian plural for 1,066 of its 1,628 nouns and an English plural for none.

## Proposal
1. When the marked word is a plural noun, all four options show their English plural: "bowls,
   knives, sinks, plates". A noun after a number (*два стола*) counts as plural: "chairs".
2. When the marked noun has the article, all four options start with "the": *чинията* gives "the
   plate", "the bowl", …; *чиниите* gives "the plates", "the bowls", ….
3. The wrong options of a plural question are nouns that have a plural, so a mass noun ("milk")
   never appears as "milks"; those of a question with "the" are nouns.
4. After a plural guess the reveal adds the plural pair: "чиния – plate · plural чинии – plates".
5. Every other question is unchanged: the dictionary form of a noun, verbs, adjectives and other
   words keep the dictionary meaning.

Not proposed: English verb forms ("има" as "there is"), plurals on the word cards (D-035), forms
with a vowel change (*света* of свят) or the vocative (*госпожо*); those keep the dictionary meaning.

## Design notes
- `data/plurals.json`: `{"<rank>": ["<Bulgarian plural>", "<English plural>"] | null}`, a key for
  every deck noun; `null` for a noun with no plural (мляко, захар). Kept apart from `words.json`,
  which `tools/export_anki_words.py` rewrites from the deck. Plural-only nouns (хора, очила) carry
  their own form. Drafted once for all nouns, then checked.
- `tools/check_plurals.py` (in `npm run check`): a key for every noun and none for other words;
  values are `null` or two non-empty strings; the Bulgarian matches the plural the deck lists in
  `forms`; every sentence form `<plural>те`/`<plural>та` belongs to a noun with that plural.
- `tools/build_data.py`: a noun with a plural gets `pl: [bg, en]` in `app/data.js`; `Word.pl` in
  `types.d.ts`.
- `C.peekItems`: picks the shown form (the first marked form in the sentence, as the UI did) and
  reads it with `nounForm`: `pl[0]` + те/та is plural with the article; `pl[0]` is plural; after a
  number (digits, няколко, колко, or a `num` word) a changed form is plural without the article;
  the dictionary form + ът/а/ят/я/та/то (й → ят/я) has the article. A plural item filters the
  distractor tiers to nouns with `pl`, an item with the article to nouns. It returns `shown`,
  `plural`, `article` and `labels` (the option texts), so the UI does not decide the form.
- `renderPeek` shows `it.shown` and `it.labels`, and the plural pair in the reveal.

## Acceptance criteria
- Unit test: *чинии* gives four plural labels with "plates" as the answer and only nouns with a
  plural as distractors; *чиниите* gives "the plates"; *чинията* gives "the plate"; *чаят* and
  *столът* have the article; *два стола* gives "chairs"; the dictionary form gives the dictionary
  meanings.
- Smoke test: the sneak-peek run still passes; the option texts equal the item's labels.
- `python3 tools/check_plurals.py` passes; `npm test` passes.
- The learner sees "plates" for *чинии* in the sentence of word 244.

## Effort and risks
An evening. Risk: a wrong Bulgarian plural for a noun the deck gives none for (562 nouns); the
check compares them with the forms the sentences use, and a wrong one only means the question falls
back to the dictionary meaning. Risk: an odd English plural in a gloss with several senses; low
harm, fixed by a data correction.

## As built
- Built as proposed; not yet committed. `data/plurals.json` (1,628 nouns), `tools/check_plurals.py`
  (in `npm run check`), `pl` in `build_data.py` and `Word`; `peekItems` returns `shown`, `plural`
  and `labels`; `renderPeek` shows the labels and the plural pair.
- Tests: a core test on *чинии*, *чиниите*, *чинията*, *чаят*, *столът*, *два стола* and the
  dictionary form; the smoke test checks that the right option is the meaning or plural that the
  reveal gives.

### Decisions taken
- A noun whose plural is its dictionary form (хора, очила, бански) asks with the dictionary
  meanings in that form; only *хората* (with the article) asks with "the …".
- The check skips brackets that complete a name instead of giving a plural (май (месец),
  микровълнова (фурна), бански (костюм), миялна (машина)) and multi-word nouns, whose words a
  sentence maps one by one.
- Plurals drafted by agents in four parts, then checked against the deck's 1,066 listed plurals and
  every plural form the sentences use; three English glosses shortened by hand (път, отпадък,
  обучение).

- The learner asked for "the" on singular nouns with the article too, and for the word cards to
  stay as they are; the proposal now covers both. The counting form (*два стола*) came with it: it
  has the same ending as the short article (*стола*), so without the number check it would read
  "the chair".

### Measurements
- 2026-10-29: 1,437 nouns with a plural, 191 without (mass nouns, months). 9 of 60 sneak-peek
  items at positions 102–1000 ask a plural. In the sentences, the article rule recognises 1,825
  singular noun forms; 61 other forms (vowel changes, vocatives) keep the dictionary meaning. 21 of
  70 sneak-peek items at positions 102–1500 now ask a noun with the article or in the plural.

## Open questions
- ~~Add "the" to singular nouns with the article too ("the plate" for *чинията*)?~~ Yes, built.
- ~~Show the plural on the word cards (D-035)?~~ No: the word cards stay as they are.
