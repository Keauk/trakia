# D-014: Accept fewer loose translations, mark the looser ones, and stop counting wrong word forms as typos

Status: done (2026-10-22) · Created: 2026-10-22 · Area: checking and data (`core.js`: `check`, `acceptedFor`, `looseFor`, `vocabulary`; `ui.js`: `showFeedback`, `renderAlts`; `data/sentences.json`: `en_alt`, `nl_alt`, new `en_loose`, `nl_loose`)

## Context
The generous English pass (commit e15ea66) gave every sentence about five English alternatives,
all accepted as fully correct. The learner reported that this went too far. On "Работиш ли в
неделя?" both "Do you work on Sunday?" and "…on Sundays?" are accepted. That pair is actually right,
because "в неделя" covers both "this Sunday" and "on Sundays". But a sample of 40 sentences showed
alternatives that really are too loose:
- tense drift: an English present perfect for a Bulgarian aorist ("My father has fixed…" for
  "поправи", "You've been very good guests" for "Бяхте");
- added or changed meaning: "we'll freeze to death", "on the ski slopes" for "на ски", "I'll take
  the bags" for "нося" (carry), "I've had a cold" for "хрема" (runny nose).

A second leak sits in the checker. A near miss within the typo tolerance is scored *almost (typo)*,
whatever the difference is. So Sunday/Sundays, a missing Bulgarian article (книга/книгата), a wrong
agreement ending or a missing "the" all count as typos, even though they are exactly the grammar
the learner is practising.

The learner also asked for a middle ground: an answer that is colloquially fine but not an exact
rendering should still pass, with a small indicator.

## Proposal
1. **Three tiers of accepted answers** per sentence and language:
   - *exact* (`en_alt`, `nl_alt`, as now): says what the Bulgarian says. Synonyms, British/American
     pairs, contractions, word order, and every reading of a genuinely ambiguous Bulgarian sentence
     ("в неделя" → Sunday / Sundays) stay here.
   - *loose* (new `en_loose`, `nl_loose`): natural and essentially the same meaning, but drifting
     from the Bulgarian in tense, number, definiteness or structure. Scored **correct** (FSRS Good,
     no penalty). The verdict carries a small "≈ looser" tag, and the expected line shows the
     closest exact translation with a diff against what was typed.
   - *dropped*: adds, removes or changes meaning. No longer accepted.
2. **A data pass** sorts every existing `en_alt` and `nl_alt` item into those tiers, judged
   against the Bulgarian, with the rule "when in doubt, keep the milder tier". `bg_alt` is not
   touched: Bulgarian alternatives were reviewed separately, and one `bg_alt` serves both the Dutch
   and the English prompt.
3. **Wrong word form is not a typo.** Inside the typo tolerance the checker now compares word by
   word. A typed word is a *form slip* when it is the expected word plus an inflectional ending
   (-s, -ed, -ing; -en, -t, -te; -та, -ът, -ите, …), the expected word minus an ending of two
   letters or more, or a real word form (it occurs somewhere in the corpus) that shares the first
   three letters with the expected word; two different short words of up to three letters (in/on,
   de/het) and a missing or extra whole word are slips too. Any slip makes the answer **wrong**
   with the reason "different word form" and the words named (e.g. "sundays → sunday"). Real typos
   (a word that occurs nowhere, missing spaces, swapped letters) stay *almost*. Dutch stressed and
   unstressed pronouns (je/jij/jou/jouw, me/mij, we/wij, ze/zij, m'n/mijn) count as the same word.
   Setting *Wrong word form counts as an error* (default on); off restores the old typo behaviour.
4. "My answer was correct" still works after a form error, for the cases the data misses.
5. The writing brief (`tools/SENTENCE_BRIEF.md`) states the tiers, so new sentences follow them.

Not proposed: reasons stored per loose alternative (the diff shows what drifted; D-006 covers
explanations), a loose tier for Bulgarian answers, or any change to the *almost* policy of D-002.

## Design notes
- Data: optional string arrays `en_loose`, `nl_loose` on a sentence. `validate_sentences.py`
  passes them through, `apply_patches.py` accepts them, `rowToSentence` reads them from imports
  (`|`-separated like the other alternatives), and "Export sentences" includes them.
- `core.js`: `looseFor(s, dir)` returns the loose list (empty for the Bulgarian directions).
  `check(typed, accepted, lang, opt, loose)` tries exact answers first, then loose ones; a loose
  hit returns `{result: 'correct', loose: true, closer}`, where `closer` is the exact answer
  closest to what was typed. Near misses of loose answers keep `loose: true`.
- `vocabulary(sentences, words, extra)` builds `{bg, nl, en}` sets of normalised word forms from
  every accepted answer, the deck's dictionary forms and listed forms, and `extra` per language
  (grammar-drill answers, the learner's own accepted answers). `ui.js` builds it once at load and after imports, and passes it to `check` as
  `opt.vocab`. Without `opt.vocab`, `check` behaves as before.
- `wordSlips(t, a, vocab, lang)` aligns the two answers word by word (edit distance over words, with
  merge/split steps for missing or extra spaces) and returns the pairs that are form slips.
- UI: the verdict reads "✓ Correct ≈ looser" or "✗ Wrong · different word form: sundays → sunday".
  The "other accepted answers" list shows loose answers last, prefixed with ≈. The library row
  details list them as "EN looser" / "NL looser".
- Tests in `tools/test_core.js` for each tier and each slip kind; the smoke test checks the
  "≈ looser" tag.

## Acceptance criteria
- "Do you work on Sunday?" and "Do you work on Sundays?" are both still exact for "Работиш ли в
  неделя?".
- "My father has fixed the car's trunk." is accepted as correct with the ≈ tag and the diff
  against "My father fixed the car's trunk."
- "I'll take the bags." is wrong for "Аз ще нося чантите."
- A sentence that only accepts "…on Sunday" scores "…on Sundays" as wrong (different word form);
  "…on Sundya" is still almost.
- `npm test` and `python3 tools/check_decisions.py` pass.

## Effort and risks
About 150 lines of code plus tests, and a review of about 16,500 alternatives (done by parallel
review agents with one shared rubric, then spot-checked). Risks: the review is too strict and
rejects good answers (mitigated by "when in doubt, milder tier" and the "My answer was correct"
button); a genuine typo happens to produce another real word with the same stem and is now wrong
(accepted cost; the setting turns it off).

## As built
- `core.js`: `looseFor`, `vocabulary`, `wordSlips` (word-level edit distance with merge/split steps
  for missing or extra spaces) and `check(typed, accepted, lang, opt, loose)` as designed. A
  missing space only counts as a typo when both glued words have two letters or more, so a dropped
  "a" or "в" is a slip. A word-order answer in Bulgarian is still *almost (order)* even when the
  word alignment sees it as moved words.
- `ui.js`: the vocabulary is built at load, after imports and deletions, and after "My answer was
  correct". The verdict shows "≈ looser" for a loose answer, and the label above the answer
  changes to "Closer to the Bulgarian", with the diff against the closest exact answer. A form error
  reads "✗ Wrong · different word form: comes → come". Grammar drills use the same check. The
  verdict line now wraps its note under the verdict instead of squeezing it.
- Setting *A wrong word form is an error, not a typo* (`strictForms`, default on).
- Data: every `en_alt` and `nl_alt` item was judged against the Bulgarian by eight review agents
  sharing one rubric (exact / loose / drop, "when in doubt, the milder tier"), then spot-checked.
  The tool chain (`validate_sentences.py`, `apply_patches.py`, `rowToSentence`, the brief, the
  DESIGN schema) knows the new fields.
- Five primaries were corrected on the reviewers' notes: B198, U061, U042 and U102 used an English
  present perfect for an aorist (the past-simple alternative became the primary, the old one
  loose); D117's Dutch rendered отключи (unlock) as "deed de deur open" (now "deed de deur van het
  slot", the old wording loose).
- Tests: two new groups in `tools/test_core.js`. The smoke test checks the ≈ tag and the closer
  answer, and its own "typo" now replaces a letter of the longest word with "q", because dropping a
  letter could produce a real form ("doen" → "doe", "mee" → "me"), which is now correctly a form
  error.

### Decisions taken
- Inflectional endings were added to the form-slip rule after testing. With corpus words alone,
  "Dinner is on the tables" still passed as a typo, because "tables" occurs in no sentence.
- Dutch stressed/unstressed pronouns are normalised to one form. Without that, je/jij (two short
  words) would have become a form error.
- `closer` is the exact answer nearest to what was typed, not always the primary, so the diff
  shows only the drift (e.g. "has repaired" → "repaired", not also "boot" → "trunk").
- English present perfect for a Bulgarian aorist is *loose*, even where English prefers it ("I've
  lost weight"). It stays accepted as correct; the tag only shows the form that mirrors the aorist.

### Measurements
2026-10-22, 2656 sentences:
- English: 12,391 alternatives → 11,312 exact, 1,056 loose, 23 dropped.
- Dutch: 4,073 alternatives → 3,705 exact, 367 loose, 3 dropped.
- 912 sentences have at least one loose answer. No Bulgarian text, lemma or rank changed.

## Open questions
- ~~Should a loose answer on a mature card count as Good or Hard?~~ Good, at every maturity: it is a correct sentence, and the tag already teaches the closer form. Revisit if loose answers turn into a habit.
