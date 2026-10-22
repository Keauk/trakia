# D-018: Accept ти and вие when the English "you" leaves it open, and either gender when no prompt shows it

Status: done (2026-10-22) · Created: 2026-10-22 · Area: checking and data (`core.js`: `acceptedFor`, `vocabulary`, `rowToSentence`; `ui.js`: library details; `data/sentences.json`: new `bg_alt_en`, `bg_alt`; `tools/validate_sentences.py`, `tools/apply_patches.py`, `tools/SENTENCE_BRIEF.md`)

## Context
English → Bulgarian marks "Имаш ли момче или момиче?" wrong for "Do you have a boy or a girl?",
because the sentence (M092) only accepts "Имате ли…". English "you" does not say whether one
person (ти) or several people or a polite address (вие) is meant, so the learner cannot know which
form is expected. Of the 2656 sentences, 538 have "you" in the English prompt, and imperatives
("Come here!") have the same problem. Only 170 of them have any Bulgarian alternative.

The Dutch prompt is not ambiguous: "Hebben jullie" and "Heeft u" ask for вие, "Heb je" for ти.
Accepted Bulgarian answers (`bg_alt`) are shared by the Dutch and the English prompt, so adding
"Имаш ли…" there would also accept it for "Hebben jullie…", hiding a real mistake.

The same problem exists for gender in both prompt languages. "I'm not at all sure it's him" and
"Ik weet helemaal niet zeker of hij het is" do not show whether the speaker is a man or a woman,
but G104 only accepts "Изобщо не съм сигурна…".

## Proposal
1. **New field `bg_alt_en`**: Bulgarian answers accepted only for the English prompt (the
   English → Bulgarian direction). It holds the other "you" form (ти ↔ вие, with every verb,
   pronoun, possessive and imperative that changes with it) wherever the English primary does not
   decide it. These answers count as fully correct, with no ≈ tag: the English allows both.
2. **Gender variants go into `bg_alt`**, because neither prompt shows them: the other gender of
   the speaker ("съм сигурна" ↔ "съм сигурен") or of a single addressee ("Уморен ли си?" ↔
   "Уморена ли си?"), where the prompts give no clue (no name, no "mother", no he/she).
3. **A data pass** over all 2656 sentences adds both. Existing answers are not changed.
4. The writing brief asks for both from now on.

Not proposed: a hint in the English prompt ("you, plural"); changing the Dutch prompts; accepting
the other "you" form for a Dutch prompt.

## Design notes
- `core.js` `acceptedFor(s, dir)`: for `en2bg` return `[s.bg, …s.bg_alt, …s.bg_alt_en]`; `nl2bg`
  unchanged. `vocabulary` adds `bg_alt_en` to the Bulgarian word forms. `rowToSentence` reads a
  `bg_alt_en` column (`|`-separated). `types.d.ts`: `bg_alt_en?: string[]`.
- `ui.js` library details: a "BG also (EN prompt)" row. "Export sentences" already copies every
  field.
- `validate_sentences.py` passes `bg_alt_en` through; `apply_patches.py` accepts it.
- Data rules for reviewers: change only what the person/number of "you" or the gender forces
  (verb endings, ти/те/теб/твой ↔ вие/ви/вас/ваш, imperatives Ела ↔ Елате, adjective and
  participle agreement). Polite вие takes plural agreement ("Вие сте уморени", "Вие сте дошли").
  Skip a sentence when its English already decides: "you two", "children", "you guys", "Mr
  Petrov", a plural noun as addressee, "yourselves".
- Tests: `acceptedFor` returns `bg_alt_en` only for `en2bg`.

## Acceptance criteria
- English → Bulgarian: "Имаш ли момче или момиче?" is correct for "Do you have a boy or a girl?".
- Dutch → Bulgarian: "Имаш ли момче или момиче?" is still wrong for "Hebben jullie een jongen of
  een meisje?".
- "Не съм сигурен, че е той." is correct for G104 in both directions.
- `npm test` and `python3 tools/check_decisions.py` pass.

## Effort and risks
About 20 lines of code, plus a data pass by four review agents. Risk: a generated Bulgarian
variant with a grammar error (clitic order, agreement) would be accepted as correct. Mitigation:
reviewers change only the forms tied to "you" or gender and copy everything else, and the
coordinator spot-checks the additions.

## As built
- `core.js`: `acceptedFor` adds `bg_alt_en` for `en2bg` only; `vocabulary` includes it, so with
  *A wrong word form is an error* on, "Имаш…" for the Dutch "Hebben jullie…" is "✗ Wrong ·
  different word form: имаш → имате". `rowToSentence` reads a `bg_alt_en` column.
- `ui.js`: library details show "BG also (EN prompt)". "Export sentences" now writes the learner's
  own accepted answers for the English prompt to `bg_alt_en` (they used to go to `bg_alt`, which
  would have made them count for the Dutch prompt after a re-import).
- `types.d.ts`, `validate_sentences.py`, `apply_patches.py`, `DESIGN.md` and the brief know the
  field. Unit test for both directions and for the vocabulary.
- Data: four review agents went through all 2656 sentences with one rubric; every sentence whose
  English prompt contains "you" needed either an addition or a stated reason to skip. A script
  then checked that every addition differs from an original answer only in "you" or gender forms
  (pronouns, clitics, possessives, endings); all passed.
- M092: "Имаш ли момче или момиче?" is correct for the English prompt, wrong for the Dutch one.

### Decisions taken
- Where a вие sentence becomes ти and has a gendered word, both genders were added ("Добре
  дошъл/дошла", "Не влизай сам/сама"), and where the speaker's gender is separate from the "you",
  the combinations too ("Днес вие сте на волана – аз съм уморена.").
- "Извинете" becomes both "Извини" (the direct counterpart) and "Извинявай" (the usual informal
  "excuse me").
- Ти forms were added even where the setting makes them unlikely (to a waiter, a hotel guest),
  because the English allows them. Skipped: polite address (sir, madam, miss, Mrs), plural
  addressees (children, kids, guests, "each"), and generic "you" that the Bulgarian renders
  impersonally ("Приятно ми е", "ще се видим").
- Nouns for jobs and nationalities (касиер, българин) got no feminine form; only adjectives and
  participles change. A polite вие keeps the singular noun ("Още ли сте касиер?").

### Measurements
2026-10-22, 2656 sentences:
- 725 sentences gained a `bg_alt_en` (951 answers); 41 sentences with "you" were skipped with a
  reason.
- 33 sentences gained 42 gender variants in `bg_alt`.

## Open questions
None.
