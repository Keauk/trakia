# D-009: Grammar reference tab with "give the form" drills

Status: proposed · Created: 2026-10-22 · Area: new tab (`index.html`), content (`data/grammar.json`), drills (`core.js`)

## Context
The app gates sentences by grammar stage (D-008) but never teaches the grammar a stage unlocks, and
the checker can say an answer is wrong without being able to point at a rule (D-006 will need a
target). Producing Bulgarian in the NL→BG direction requires forms (сме, ни, вашата, ще отида,
купих) that a learner at this level has to retrieve from memory. A cheat sheet next to the practice
tab, with small drills on exactly those forms, shortens the loop between forgetting and seeing.

## Proposal
1. **Grammar tab** with reference cards organised by stage, so it matches what the learner can
   practise. Each card is a table plus two or three example sentences taken from the dataset itself.

   | stage | cards |
   |-------|-------|
   | 1 | personal pronouns; **съм** (present); **имам / нямам**; the three conjugation classes with one deck verb each (чета, говоря, гледам); common irregulars (мога, ям, дам, знам, отида, видя, спя); long possessives (мой/моя/мое/мои … техен) and short clitic possessives (ми, ти, му, ѝ, ни, ви, им) incl. kinship nouns without article; definite article (-ът/-а, -та, -то, -те; full vs short form); question words; да-constructions; numbers 1–20 and count forms |
   | 2 | future with ще / няма да; imperatives (-и/-ете, -й/-йте) and irregulars (ела, дай, яж, виж, кажи) |
   | 3 | aorist endings by class (same example verbs); съм in the past (бях, беше …); perfect with the л-participle |
   | 4 | imperfect; conditional (бих) |

   Cards beyond the learner's stage are shown collapsed with a "beyond your stage" badge, never hidden.

2. **Grammar practice**: a separate button on the Practise home card ("Grammar drill"), next to
   Practise and Free practice. A drill is a short run (default 15 items) of *give the form* prompts,
   checked with the same `check()` rules and the same correct / almost / wrong verdicts:
   - conjugation: *ние + съм* → `сме`; *те + чета* → `четат`; *вие + мога* → `можете`
   - possessives: *his house (long)* → `неговата къща`, *(short)* → `къщата му`; *my mother* → `майка ми`
   - article: *хляб (subject, definite)* → `хлябът`; *жена (definite)* → `жената`
   - stage 2+: future (*аз + отида, future* → `ще отида`), imperative (*ти + дай* → `дай`), aorist
     (*ние + купя, aorist* → `купихме`)
   Items are generated from `data/grammar.json` tables (pronoun × paradigm), limited to the learner's
   stage, weighted toward forms answered wrong recently. Results are logged for the day's stats but
   create no scheduled cards; a per-form tally (`drills` in localStorage) drives the weighting and a
   small "weak forms" list on the Stats tab.

3. **Links from feedback** (after D-006): a wrong answer whose explanation names a rule gets a
   "see: short possessives" link into the matching card.

## Design notes
- Content lives in `data/grammar.json`: `{stage, id, title, intro, table: {headers, rows}, examples:
  [sentence ids], drills: [{kind, prompt, answers[]}] or paradigm specs the drill generator expands}`.
  Bundled into `app/data.js` by `build_data.py`.
- Paradigms are written once per verb class / pronoun set; the generator produces prompts so tables
  and drills cannot drift apart. Irregular verbs are listed in full.
- Content is written by Claude and checked by a reviewer agent with the same strictness as the
  sentences (a wrong paradigm would be taught wholesale).
- Example sentences are referenced by id so they stay in sync with the dataset and show the learner's
  own status badge.
- Drill checking reuses `normalise` / `check` with `typoPct` and no bag-of-words (single forms).
- UI: a fifth tab "Grammar"; cards as `<details>` blocks; the drill runs inside the existing practice
  card with a "Grammar drill" badge and no direction badge.

## Acceptance criteria
- Stage-1 and stage-2 cards complete and reviewed; stage 3–4 cards may follow when the learner reaches them.
- Every table row of a paradigm can be produced as a drill prompt and its answer passes `check()`.
- A 15-item drill runs end to end on the phone with correct / almost / wrong verdicts and shows a summary.
- Drill results never appear in the sentence review queue or the stability stats.
- Unit tests for the drill generator (coverage of all pronouns, stage filtering, weighting of weak forms).

## Effort and risks
Content for stages 1–2 about one evening plus review; tab and drills another evening. Risk: content
errors are high-impact, so the review pass is not optional. Keep tables small; the reference is a
reminder, not a grammar book.

## Open questions
- Should drills also cover Dutch → Bulgarian single words (vocabulary), or stay grammar-only? (Anki
  covers words; proposal: grammar-only.)
- Weight drills into the daily stats as answers, or keep a separate "drill" line?
