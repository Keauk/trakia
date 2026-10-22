# D-008: Gate sentences by grammar stage, not only by vocabulary rank

Status: done (2026-10-22) · Created: 2026-10-22 · Area: data (`grammar` field), `core.js` (`eligible`), Settings

## Context
Eligibility was purely lexical: a sentence unlocks when every word in it is below the learner's Anki
rank. The writers were told to vary tenses, so "Купих хляб и мляко." (aorist) sits at rank 28 even
though the aorist is taught much later; the same holds for the future with ще, imperatives and
occasional perfect or conditional forms. For BG→NL this is mostly harmless. For NL→BG it is not:
producing "купих" needs a past-tense stem and ending the learner has never seen, the answer is
marked wrong or almost for grammar that was never taught, and the D-002 free passes get spent on it.

## Proposal
1. **Tag grammar features per sentence** in a closed vocabulary: present, da-clause, future,
   imperative, aorist, imperfect, perfect, pluperfect, conditional, renarrative, passive,
   comparative, numeral. Stored as `grammar: [...]` on every sentence; tagged by an agent pass with a
   fixed brief (`TAG_BRIEF.md`), new batches tagged the same way before merging.
2. **Grammar stage setting** next to the rank slider, matching the order a course such as Bulgaro
   introduces things:
   - Stage 1: present tense statements, questions and negation; да-clauses (искам да, трябва да)
   - Stage 2: + future with ще / няма да, imperatives, нека
   - Stage 3: + aorist, perfect (съм + participle)
   - Stage 4: + imperfect, conditional (бих)
   - Stage 5: everything (renarrative, pluperfect, passive)
   Comparative and numeral are informational only and never gate.
   A sentence is eligible only if its rank fits **and** all its grammar features are within the
   stage. Sentences without a `grammar` field count as eligible (so nothing is hidden until tagging
   is complete). Cards already in progress keep coming up for review regardless of stage; the stage
   gates only new cards, like the rank.
3. **Keep the stage-1 pool healthy**: a present-tense-only batch for ranks 1–600 (ids M, P, Q,
   300 sentences) written with `PRESENT_BRIEF.md`, since most early sentences use other tenses.
4. Library: a grammar column in the row detail and a "beyond my stage" filter, mirroring the rank
   filter; Stats: eligible counts respect the stage.

## Design notes
- `core.js`: `STAGES` maps stage → allowed feature set; `eligible(s, settings)` adds the grammar
  check; `settings.stage` defaults to 1 on a fresh install. The Settings help lists which forms each
  stage adds, so the learner can match it to the lesson they are on.
- Tagging is by model, from the Bulgarian text only; spot-check with a sample. "беше/бях" count as
  aorist unless clearly imperfect alongside another imperfect verb.
- The home card's "eligible" count and "next unlock" use both filters.

## Measurements (2026-10-22, after tagging the 1578 existing sentences)
Features found: present 1109, aorist 286, imperative 206, da-clause 194, future 105, imperfect 31,
perfect 28, passive 6, conditional 1 (numeral 127 and comparative 39 are informational).

| Anki rank | stage 1 | stage 2 | stage 3 | stage 4 | stage 5 |
|-----------|--------:|--------:|--------:|--------:|--------:|
| 131       | 95      | 110     | 125     | 127     | 127     |
| 300       | 269     | 346     | 398     | 405     | 405     |
| 600       | 453     | 606     | 714     | 724     | 724     |

So at the learner's current position the stage-1 pool is already larger than the whole pool was
before the gap batch (68); the present-tense batch (M, P, Q) adds another ~300 stage-1 sentences in
ranks 1–600.

## As built (2026-10-22)
- All 2656 sentences carry `grammar`; the validator passes the field through. New batches are tagged
  with the same brief before merging.
- Present-tense batch: 300 sentences (M 1–150, P 1–300, Q 1–600), all stage 1 after tagging (two
  formulaic "Извинете/Извинявай" sentences were hand-tagged as present rather than imperative).
- Pools after the batch: rank 131 → 155 / 170 / 185 / 187 / 187 for stages 1–5; rank 300 → 469 /
  546 / 598 / 605 / 605; rank 600 → 750 / 903 / 1011 / 1021 / 1021.
- Settings: *Grammar stage* select with a live count; header shows "word N · stage S"; Library filter
  *Beyond my grammar stage*; row details list the features.

## Acceptance criteria
- Every sentence in `data/sentences.json` has a non-empty `grammar` list.
- With stage 1 at rank 131 the eligible pool is at least as large as it was with no grammar filter
  before the present-tense batch (68 sentences).
- Unit tests: stage gating, missing-grammar passthrough, due cards unaffected by stage.
- A learner at stage 1 never receives a new NL→BG card whose Bulgarian needs a past, future,
  imperative or conditional form.

## Open questions
- Does Bulgaro teach the future before the aorist? The stage order above assumes so; swap stages 2
  and 3 if not.
- Should да-clauses be their own stage between 1 and 2?
