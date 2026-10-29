# Explanation-writing brief (D-039)

You explain Bulgarian practice sentences word by word for a learner who speaks Dutch and English and
is a beginner to intermediate in Bulgarian. After answering a card the learner opens *Explain* and
sees, under every word, its meaning in this sentence and short grammar chips; tapping a word shows
the dictionary form, the standard explanation of each chip, and your note. Your output must be
correct Bulgarian grammar first, and short and plain second.

## Input
A JSON list of sentences: `id`, `bg`, `en`, `grammar` (tags), and `words`: one item per word of
`bg` in order, with the `form`, and when it is a deck word its `lemma` (dictionary form), `pos`,
deck `meaning`, deck `forms` and `plural` ([Bulgarian, English]). Words without a lemma are
function words (да, ще, не, ли, се, си, forms of съм) or names.

## Output
One JSON object, sentence id → entry, written with `json.dump(..., ensure_ascii=False)`:

```json
{"B071": {"note": "има = there are: it stays the same before a plural.",
  "w": [
    {"f": "В", "m": "in"},
    {"f": "шкафа", "m": "the cupboard", "l": ["the-short"], "e": "а"},
    {"f": "има", "m": "there are", "l": ["ima"]},
    {"f": "чинии", "m": "plates", "l": ["pl"], "e": "и"},
    {"f": "и", "m": "and"},
    {"f": "чаши", "m": "cups", "l": ["pl"], "e": "и"}
  ]}}
```

- `w`: exactly one item per word of `bg`, in order, `f` spelled as in the sentence. A hyphenated
  word is two words (по-голям → "по", "голям").
- `m` (required, max 40 characters): the English meaning **in this sentence**, matching the form:
  "the cupboard", "plates", "I bought", "to him", "will". For a name: "Maria (name)".
- `l` (labels): only from the table below, and only for what the form shows. Leave it out for a
  word in its dictionary form that needs no comment (в, и, на, днес). Order: the main label first.
  - Nouns: `pl`, `count`, `the-full`, `the-short`, `the`, `np-bare`, `voc`, `vowel`, `irr`.
  - Adjectives, possessives, numerals, -л forms: `agr-f`, `agr-n`, `agr-pl`, plus the article
    labels when they carry the article (новата: `agr-f`, `the`); `comp` on "по", `sup` on "най".
  - Verbs: one person (`1sg` … `3pl`) and one tense or mood (`pres`, `aor`, `impf`, `imp`,
    `part-l`, `part-pass`); `pf` / `ipf` only where the aspect explains the choice (after да or ще,
    in an imperative, in the past). A verb in its dictionary form (1sg present) still gets
    `1sg`, `pres`. A verb after да or ще (also with short words between: да го видя, ще ти
    кажа) gets its person and aspect but never `pres`: it is not the present tense, the `da` or
    `fut` on the particle says what it is.
  - Function words: `fut` on ще, `neg-fut` on няма in няма да, `da` on да, `cond` on бих/би,
    `li` on ли, `se` on се, `si` on си (`poss-own` for "one's own"), `ima` on има/няма meaning
    "there is", forms of съм: person + `pres`, or person + `sum-past` for бях, беше, бе, бяхме, бяхте, бяха, `perf` on съм in the
    perfect.
  - Pronouns: `cl-acc`, `cl-dat`, `poss-short`, `poss`, `long-obj`, `double`; `order` where the
    position of a short word is the point.
- `e`: the ending that changed from the dictionary form, a true ending of `f` (шкафа → "а",
  чинии → "и" from чиния, купих → "их" from купя). Leave it out when the word is unchanged or the
  change is not an ending (деца, хора, ме).
- `n` (max 180 characters): only when the label's standard text does not already say why **here**:
  "Perfective: one single purchase.", "Here the subject comes after the verb.",
  "The article is on новата, the first word of the phrase." Never repeat the label text.
- `note` (max 220 characters, optional): one line on the whole sentence, only when the sentence has
  a construction worth seeing as a whole: word order of short words, "има = there is", a да-clause,
  doubling, an idiom. Most sentences have none.

## Labels
Read `data/grammar_labels.json` for the full text of every label. Use a label only when its text
is true of this word in this sentence.

## Rules for the content
- Correctness over coverage: when you are not sure of a label, leave it out, and never invent a rule.
- Masculine article: -ът / -ят only for the subject (and after съм); -а / -я everywhere else; after
  a number or няколко the -а / -я form is `count`, not an article.
- Aspect: a perfective verb cannot express the ongoing present; after да / ще choose `pf` for one
  complete action, `ipf` for a repeated or ongoing one; say it in `n` when the contrast matters.
- Person: the ending, not a pronoun, tells the person; the aorist 2sg and 3sg are the same form, so
  decide from the sentence.
- Plain English, short sentences, no Latin terms except those in the chips (aorist, perfective).
- Do not explain the translation; explain the Bulgarian.

## Before you finish
Run `python3 tools/check_explanations.py --file <your output>` from the repository root and fix
every error, until it prints OK.
