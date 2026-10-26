# Story-writing brief (Bulgarian reading stories, D-026 / D-027 / D-028)

You are writing short reading stories for a Dutch speaker learning Bulgarian. The learner studies a
frequency word list in Anki in a fixed order ("rank" 1..2952, file `data/words.json`). A story of
**level N** may only use words of rank ≤ N, so the learner can read it with the words they know.
The app shows the stories in a Reading tab, lets the learner tap any word for its dictionary form
and meaning, and asks comprehension questions at the end.

## Vocabulary (checked by `tools/validate_stories.py`, which must pass)
1. Use only Bulgarian words whose dictionary form is in `data/words.json` with rank ≤ the level.
   Any inflected form is fine (plural, definite article, conjugation, short pronoun forms
   ме/те/го/я/ни/ви/ги/ми/ти/му/ѝ/им, vocative). For a verb, the deck usually lists the
   imperfective; a perfective partner (купя for купувам, дам for давам, отида for отивам) counts
   as the deck verb, map it to the deck form.
2. Allowed without a rank: ли, не, да, ще, съм and its forms, се/си, по-/най-, the numerals the
   level has, and **names** of people and places (list every name form you use in `names`,
   including vocatives like "Иване").
3. **Glossed words**: at most 3 % of the story's running words may be above the level (or not in
   the deck at all). Put each such dictionary form in `extra` with its meaning in Dutch and English.
   Use them only where the story would be stilted without them. The validator prints the share.
4. Grammar: **present tense only**, plus да-clauses (искам да …, трябва да …, мога да …). No past
   tense, no future with ще, no imperatives (Ела!, Дай!), no conditional. Narrate in the present
   ("Иван отива в кухнята."). Polite or informal questions are fine.

## Language quality
- Natural, correct modern Bulgarian: definite articles (full/short article -ът/-а), clitic order
  (clitics never first in the sentence; ли after the questioned word), aspect in да-clauses,
  agreement. Prefer short sentences; a level-100 story is closer to a picture book.
- Each paragraph has a faithful Dutch (`nl`, standard Netherlands Dutch) and English (`en`)
  translation: keep the Bulgarian's tense, number and structure where the target language allows,
  but write natural sentences, not glosses.

## The cast (all stories share it; each story must still stand on its own)
The Petrov family lives in an apartment in Sofia:
- **Иван** — the father, a doctor (лекар). **Мария** — the mother.
- **Ана** — their daughter, about 10. **Петър** — their son, about 7.
- **баба Елена** and **дядо Георги** — the grandparents, Мария's parents, in Пловдив.
- **господин Стоянов** — the old neighbour. **Яна** — Ана's friend.
Use the people whose words exist at your level (баба is rank 144, дядо 131, съсед 141): at
level 100 the grandparents and the neighbour can only appear as glossed words, so leave them out.

## Shape
- Length: level 100 about 70–110 words, 200 about 110–160, 300 about 150–200, 400 about 180–240,
  500 about 200–280. Three to six paragraphs.
- A real little story: a situation, something that goes wrong or changes, an ending. Dialogue
  lines in quotes ("…" or „…") are welcome. Use the newer words of the level (the upper half of
  the range) generously, so each level exercises what the learner just learned.
- A title of a few words, also within the vocabulary.

## Questions (D-028)
3–5 multiple-choice questions per story, each with 3 or 4 options, in Dutch and English. They test
understanding of the story (who, where, why, what happened, how it ends), not a single word, and
cannot be answered by common sense alone. Wrong options are plausible: they use people, places or
things from the story. Vary the position of the right answer (`answer` is the 0-based index).

## Output
One JSON file (UTF-8, valid JSON, an array) with your stories:
```json
[{
  "id": "R100a",
  "level": 100,
  "title": {"bg": "Ключът", "nl": "De sleutel", "en": "The key"},
  "paragraphs": [
    {"bg": "Иван е пред вратата. Той няма ключ.", "nl": "Ivan staat voor de deur. Hij heeft geen sleutel.", "en": "Ivan is in front of the door. He doesn't have a key."}
  ],
  "words": {"ключът": "ключ", "иван": "Иван", "е": "съм", "пред": "пред", "вратата": "врата", "той": "той", "няма": "нямам", "ключ": "ключ"},
  "names": ["Иван"],
  "extra": {"пред": {"nl": "voor (plaats)", "en": "in front of"}},
  "grammar": ["present"],
  "questions": [
    {"q": {"nl": "Waarom kan Ivan niet naar binnen?", "en": "Why can't Ivan go in?"},
     "options": [{"nl": "Hij heeft geen sleutel.", "en": "He has no key."}, {"nl": "De deur is kapot.", "en": "The door is broken."}, {"nl": "Hij is ziek.", "en": "He is ill."}],
     "answer": 0}
  ]
}]
```
- `words`: EVERY word form that occurs in the title and the paragraphs, in lower case, mapped to
  its dictionary form exactly as spelled in `data/words.json` (`"отиваме": "отивам"`,
  `"детето": "дете"`, `"го": "той"`, `"ми": "аз"`, `"може": "може би"` only where it is part of
  "може би"). Map names to themselves. The free words (ли, не, да, …) may be left out or mapped.
  No forms that do not occur in the text. When one form has two meanings in your story, pick the
  one that occurs most.
- `grammar`: the tags that occur: `present`, `da-clause` (and `comparative`, `numeral` if used).
- Ids: `R<level><letter>`, e.g. R200a, R200b, R200c.

Check your file with
`python3 tools/validate_stories.py data/words.json <your file>` and fix every ERROR until it
reports all stories valid.
