# Grammar lesson brief (D-049)

You write one grammar lesson for an adult who speaks Dutch or English and is a beginner in Bulgarian. A lesson starts
practice and gives the words that later feedback uses. It is not a chapter of a grammar book. Correct Bulgarian comes
first, short and plain second. Check every language fact in a Bulgarian reference grammar, not in general web pages.

## Fields, in `lessons` in `data/grammar.json`
- `id`, `title`, `stage`, `card`: the reference card with the full table.
- `rule`: 2–4 short paragraphs, at most 90 words in all. One rule per lesson. Use the terms of the D-039 labels in
  `data/grammar_labels.json`, because the feedback shows the label's `text`.
- `table`: only if the rule needs one, and only the forms of this rule.
- `contrast.nl`, `contrast.en`: one or two sentences in English, on the trap for a speaker of that language. State a
  fact about the two languages. Do not claim what learners do: no study tests this for Bulgarian.
- `examples`: 2 or 3 sentence ids from `data/sentences.json`, short, with the target form.
- `pool`:
  - `labels`: the labels of the target words.
  - `next`: the labels of a word that belongs with the target, such as the verb after да.
  - `order`: true when the place of the word is the rule.
  - `cue`: per language, the prompt must hold one of these words, so that the prompt asks for the form.
  - `exclude`: sentence ids that do not teach the rule: an idiom, another use of the form, a prompt that does not ask for it.
  - `hint`: one line on every item, when the prompt leaves a choice open.

## Rules
- Read every sentence of the pool, and exclude those that do not teach the rule.
- Where native speakers vary (aorist and imperfect, the count form), the answer must accept the variants.
- `python3 tools/check_lessons.py` must pass. A second model pass checks every lesson before it ships.
