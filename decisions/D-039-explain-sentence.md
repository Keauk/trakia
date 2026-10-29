# D-039: Explain a practice sentence word by word: what changed from the dictionary form, and why

Status: done (2026-10-29) · Created: 2026-10-29 · Area: data (`data/explanations.json`, `data/grammar_labels.json`, `tools/check_explanations.py`, `tools/EXPLAIN_BRIEF.md`, `tools/build_data.py`), practise UI (`ui.js`, `index.html`: the result panel)

## Context
After answering a card the learner can tap a word for its dictionary form and meaning (D-030), but
nothing says why the word has the form it has: why *шкафа* and not *шкафът*, why *има* stays
singular before "plates", why *купих* ends in -х. The learner asked for an *Explain* button that
shows, word by word, what changed from the dictionary form and why.

Research on explaining grammar to learners:
- Explicit explanation beats implicit exposure for simple and complex features alike, also on
  delayed tests and in free production (Spada & Tomita 2010, meta-analysis of 41 studies);
  metalinguistic explanation beats a bare correction (Ellis, Loewen & Erlam 2006).
- Learners attend to meaning before form; an explanation works best when it ties a form to what it
  means ("-та = the") rather than only naming it (VanPatten, processing instruction).
- Concepts beat rules of thumb, and the same concept should be worded the same way every time
  (Negueruela & Lantolf, concept-based instruction).
- An explanation placed right next to what it explains is learned better than one the eye must
  look for elsewhere (Moreno & Mayer 1999, spatial contiguity; split attention). Interlinear
  glosses lower the load of reading a foreign sentence (Ikala 2024, 48 EFL learners).
- Typographic enhancement of an ending (bold, colour) can help noticing, with mixed evidence
  (Sharwood Smith 1993; Leow 1997); it should be sparing, and colour alone fails colour-blind readers.

## Proposal
1. After a sentence card is answered (both directions, also dictation), the result panel has an
   **Explain** link next to "My answer was correct". Not before answering: it is never a hint.
2. It opens the Bulgarian sentence as an **interlinear gloss**: each word with its meaning in this
   sentence directly under it, and under that a short grammar chip ("plural", "the · short form",
   "I · past, completed"). The part that changed from the dictionary form is underlined and bold
   (*шкаф**а***). Words that did not change carry only their meaning, in a quieter colour.
3. Tapping a word (the first word with a chip is selected at the start) shows under the gloss:
   the dictionary form and its meaning, one plain explanation per chip, a line on this sentence
   when there is one, and a link to the grammar card ("See: The definite article").
4. A sentence can carry one line on the whole sentence (word order, a construction such as
   "има = there is/are").
5. The explanation is always of the sentence's main Bulgarian text (`bg`), also when the learner
   typed an accepted alternative.

Not proposed: explanations of the alternative answers, in Dutch, in stories (D-026), or written by
an AI while the app runs (the app has no server; a key in the browser would be public).

## Design notes
- `data/grammar_labels.json`: 47 labels (`pl`, `count`, `the-full`, `the-short`, `the`,
  `np-bare`, `agr-f`, `1sg`, `aor`, `fut`, `da`, `imp`, `cl-acc`, `poss-short`, …), each
  `{chip, text, card?, pos?}`: the chip shown under the word, one canonical explanation, the
  grammar card it links to, and the parts of speech it may be used on. Written and reviewed once.
- `data/explanations.json`: `{"<sentence id>": {"note"?: "…", "w": [{"f", "m", "l"?, "e"?, "n"?}, …]}}`,
  one entry per word of `bg` in order: form, meaning here, labels, the changed ending, a note on
  this word.
- `tools/check_explanations.py` (in `npm run check`): every sentence has an entry; the words match
  `bg` in order; labels exist and fit the word's part of speech; `e` is a proper suffix of `f`;
  lengths are capped. Noun forms are cross-checked against `data/plurals.json` and the article
  endings (*чинии* must be `pl`, *чиниите* `pl` + `the`, *шкафът* `the-full`), and a verb form in
  -х must say its person and tense. `--file FILE` checks one batch.
- Written by agents in batches from `tools/EXPLAIN_BRIEF.md`, each batch passing the check; a
  pilot of the sentences up to word 260 first, reviewed before the rest.
  `tools/SENTENCE_BRIEF.md` says that a new sentence needs its explanation.
- `tools/build_data.py`: `ex` on each sentence as `[note, [[m, labels, e, n], …]]` (forms dropped,
  they follow from `bg`), labels as `grammarLabels`.
- UI: `#btn-explain` in `.links`, `#explain` panel in the result; built from `C.storyTokens(s.bg)`
  and `s.ex`; chips and the detail are plain text, never colour alone.

## Acceptance criteria
- `python3 tools/check_explanations.py` passes with an entry for every sentence.
- Core test: the explanation of B071 ("В шкафа има чинии и чаши.") has `the-short` on *шкафа*,
  `pl` on *чинии* and *чаши*, and a gloss for every word.
- Smoke test: no Explain link before answering; after answering it opens the gloss with one column
  per word; tapping a word shows its explanation and a grammar-card link that opens the card.
- `npm test` and `check_decisions.py` pass.

## Effort and risks
The code is an evening; the data is many agent runs (2,656 sentences, 16,235 words). Risk: a wrong
explanation, which a check cannot catch; the labels carry the reasons and are written once, the
noun cross-check catches the commonest slips, and the pilot is read before the rest is generated.
Size: about 0.6 MB more in `data.js` before compression.

## As built
- Built as proposed; not yet committed. `data/grammar_labels.json` (47 labels),
  `data/explanations.json` (all 2,656 sentences), `tools/check_explanations.py` (in `npm run
  check`), `tools/EXPLAIN_BRIEF.md`, a line in `tools/SENTENCE_BRIEF.md`; `build_data.py` bundles
  `ex` per sentence and `grammarLabels`; `ui.js`: `resetExplain`, `renderExplain`, `exDetail`,
  `openCard`; `index.html`: `#btn-explain`, `#explain` and its styles.
- Tests: a core test on B071; the smoke test opens the panel after the first answer, checks one
  column per word and the meaning under it, taps a word, follows the grammar-card link and closes
  the panel.

### Decisions taken
- A fixed label set with one text each, not free text per word: the reasons are written and
  reviewed once and read the same everywhere; per-word notes only say what is special here.
- Written by agents in 22 batches, a pilot of the 477 sentences up to word 260 first. The pilot led
  to three rules: `sum-past` for бях/беше (съм has one past form, so neither aorist nor imperfect
  fits); no `pres` on the verb after да or ще (now checked); neutral pronoun chips
  ("object · short form", not "him / her / me") after "my / his" showed under ѝ (her).
- The check accepts either reading where a plural and a short article are spelled alike (крака),
  and any label on a deck phrase or interjection (Извинете, Внимавай) or on a word of a multi-word
  noun (кисело in кисело мляко).
- The agents found 25 wrong word maps (D-030) in the sentences, fixed as data corrections: a word of
  a multi-word noun mapped to the sentence's verb (медицинската → правя, кръвното → меря, рождения
  → правя, …), homographs (под "under" mapped to под "floor" in 11 sentences, лъжа "a lie" to the
  verb in 2, verb forms of моля to the phrase "Моля" in 4), and преместихме → преди. Only C045
  changed its unlock rank (561 → 1701, премествам се).
- Label texts sharpened from the agents' reports: има has a past (имаше), си also means "one's
  own" before a noun, да at the start of a question means "shall …", син and внук take the article
  with a short possessive.

### Measurements
- 2026-10-29: 16,235 words explained; 9,270 carry labels, 1,917 a note of their own; 404 sentences
  have a sentence note. Most used: `pres` 2,024, `the` 1,538, `3sg` 1,363, `pf` 992, `pl` 747.
- `app/data.js`: 3.87 MB → 4.48 MB, compressed 882 KB → 1,023 KB.

## Open questions
- Should the explanation also appear in the reading stories?
- The aorist and the imperfect share the 1sg/1pl/2pl/3pl forms of -ам verbs (чаках, чакахме);
  the agents chose one from the sentence. Should such a form get a chip that says both?
