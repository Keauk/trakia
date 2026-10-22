# D-020: Accept every correct combination of the listed alternatives

Status: done (2026-10-23) · Created: 2026-10-22 · Area: data and tooling (`data/sentences.json`: `nl_alt`, `nl_loose`, `en_alt`, `en_loose`, `bg_alt`, `bg_alt_en`; new `tools/find_combinations.js`; `tools/SENTENCE_BRIEF.md`)

## Context
Alternatives are listed as whole sentences, so two independent choices only pass together when
somebody wrote that exact pair. The learner hit this on C157 "В края на седмицата отиваме на
село.": "Aan het eind van de week gaan we naar het platteland." and "Eind van de week gaan we
naar het dorp." are both exact, but "Aan het eind van de week gaan we naar het dorp." is scored
**wrong**. Since D-014 made form slips an error, a missing combination is no longer softened into
an *almost*: a good answer is marked wrong and the card lapses.

A scan of the deck (every pair of accepted answers that differ in two or three separate places,
mixed both ways, and kept when the checker scores the mixture below correct) found about 9,300
such mixtures in 1,860 sentences. About a third are not sentences (a Dutch verb or particle at
the end goes missing, ти and вие get mixed), so they cannot be added blindly.

## Proposal
1. **A data pass** adds every mixture that is a correct answer, in the tier it deserves: Dutch and
   English mixtures are judged exact, looser or dropped with the D-017 rubric; Bulgarian mixtures
   are accepted into `bg_alt` (or `bg_alt_en` when a parent is English-only, D-018) or dropped.
   Nothing that is accepted now stops being accepted, and no primary changes.
2. **`tools/find_combinations.js`** lists the missing mixtures for the whole deck or for chosen
   ids, so new sentences can be checked before they are added.
3. **The writing brief** says that alternatives must cover every combination of independent
   choices, and points to the tool.

Not proposed: accepting mixtures in the checker itself. That would accept the broken mixtures
too, and with them answers D-014 wants marked wrong ("Health is most important thing").

## Design notes
- Scanner: answers are split into word and punctuation tokens and aligned with a word-level LCS.
  Pairs with two or three differing hunks give 2^k − 2 mixtures. Pairs are skipped when a word
  moves between hunks (compared by a four-letter stem), when one hunk only inserts and another
  only deletes (one phrase said in two places: "back then" / "At that time"), when a hunk has more
  than four words, or when two hunks are less than two words apart ("Are you" / "Do you come").
  Mixtures are scored with `check` and the default settings, including `vocab`; only the ones
  below correct are listed. The tier hint is *exact* when both parents are exact (Bulgarian:
  `bg_alt` unless a parent is in `bg_alt_en`), otherwise *loose*.
- Review: parallel agents with one rubric, one JSON line per mixture (`{"k", "v": "exact" |
  "loose" | "accept" | "drop"}`). A merge script checks that every mixture got a verdict, then
  writes one `tools/apply_patches.py` patch that appends to the lists.
- After applying: `tools/build_data.py`, a second scan (the new answers can form new mixtures),
  `npm test`.

## Acceptance criteria
- "Aan het eind van de week gaan we naar het dorp." and "Eind van de week gaan we naar het
  platteland." are correct for C157.
- No answer that was accepted before is lost; no primary changes.
- A rescan after the pass lists only mixtures that the review dropped, plus new second-order ones
  (measured below).
- A random sample of 60 accepted mixtures has no ungrammatical sentence, and the dropped ones are
  mostly broken sentences.
- `npm test` and `python3 tools/check_decisions.py` pass.

## Effort and risks
A tool of about 150 lines, a review of about 9,300 mixtures by agents, a merge script. Risks: a
reviewer accepts a broken mixture (mitigated by the spot check and the rule "drop when in
doubt"); the answer lists grow and the bundle with them (the "Also accepted" list is collapsed,
D-012; measured below); more listed words make more typos look like real word forms (D-014),
which is a small effect.

## As built
- `tools/find_combinations.js` as designed, with `--ids` for chosen sentences and `--data` for a
  draft sentences file; it prints `key, tier, result, mixture` or writes JSON with `-o`. Listed in
  `DESIGN.md` and `README.md`; the brief (item 4, *Combinations*) points to it.
- Data: eight review agents judged the first scan (9,222 mixtures) with one rubric; two more agents
  judged the 1,393 mixtures that the new answers made possible; the coordinator judged the last
  190 (third to fifth order) and overrode 47 first-round verdicts (below). Every reviewed mixture is
  in a verdict file; a merge script checked that each got exactly one verdict and wrote
  `tools/apply_patches.py` patches that only append to the six answer lists.
- C157: "Aan het eind van de week gaan we naar het dorp." and "Eind van de week gaan we naar het
  platteland." are now correct.
- Testing showed a flaky smoke test ("the typed loose answer is not listed again", 3 runs in 20):
  `renderAlts` in `ui.js` returned early for a card with no other answers and left the previous
  card's list in the hidden `<details>`. The cause does not depend on the data (the leaked list
  belonged to Q053, which this pass did not change). It now empties the list; 20 of 20 smoke runs
  pass.
- Cache version `trakia-v32` (new `data.js` and the `ui.js` fix).

### Decisions taken
- The scan skips pairs whose differences depend on each other (moved words by stem, an insert plus a
  delete, hunks over four words or under two words apart). This cut the first scan from 23,649 to
  9,222 mixtures; a sample of what was cut was mostly broken sentences ("Do you from Sofia?",
  "Харесвам косата ти ми харесва").
- Capitals and spaces are rebuilt, not copied: a word keeps its capital only when it is never
  written in lower case anywhere in the deck, a sentence start (also after "?" or a dialogue dash)
  is capitalised, and two words always get a space ("mid-July" → "of July"). The first scan had
  wrong capitals ("Ти Искаш", "— fine, and you?") and one lost space; reviewers dropped 47 good
  mixtures for that alone. The coordinator re-judged those, and round 1 was rebuilt from the
  original data with the corrected text, so no answer with a stray capital reached the deck.
- When unsure whether a mixture is good at all, it was dropped: a wrong listed answer teaches bad
  grammar, a missing one costs one click on "My answer was correct".
- Backshift in reported speech counts as exact, as in D-017 ("She confided in me that she wanted
  to get divorced"), even where the parents were looser.

### Measurements
2026-10-23, 2656 sentences:
- Reviewed 10,805 mixtures over five rounds (9,222 / 1,393 / 170 / 17 / 3). Round 1 per-agent drop
  rates 20–37%; Dutch exact mixtures were dropped most (49%), mostly a lost verb or particle at the
  end.
- Added 7,991 answers to 1,611 sentences: `nl_alt` 2,705 → 3,598, `nl_loose` 1,438 → 1,922,
  `en_alt` 8,063 → 11,373, `en_loose` 4,321 → 7,609, `bg_alt` 917 → 929, `bg_alt_en` 951 → 955.
  Nothing removed, no primary or other field changed, no duplicates.
- Bulgarian gained little: 282 of 298 Bulgarian mixtures were dropped, nearly all for mixing ти and вие.
- A rescan lists 2,812 mixtures, all reviewed and dropped; none is new.
- Spot check: 60 random accepted mixtures, none ungrammatical; 30 random drops, all broken.
- `app/data.js` 2,318 KB → 2,667 KB.

## Open questions
- Should the scan also run on the learner's own accepted answers ("My answer was correct")?
