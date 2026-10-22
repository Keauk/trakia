# D-017: Only a faithful translation counts as exact; mark every idiomatic drift as looser

Status: done (2026-10-22) · Created: 2026-10-22 · Area: data and feedback (`data/sentences.json`: `en`, `en_alt`, `en_loose`, `nl`, `nl_alt`, `nl_loose`; `tools/SENTENCE_BRIEF.md`; `index.html`: `#expected-label`)

## Context
D-014 split the accepted answers into *exact* and *looser*. The rule for exact was "same meaning in
the grammar the language normally uses for it". That still let idiomatic renderings through as
exact when they change the grammar of the Bulgarian. The learner's example: "Гледам те в очите."
accepts "I look you in the eye." as exact, but очите is plural, so the faithful translation is
"I look you in the eyes." The idiom is fine English and should stay accepted, but the learner
wants to see that it is not the perfect answer and which answer is, because the faithful version
is what shows the Bulgarian grammar.

A sample of 14 random sentences showed the same pattern in about half of them: "dad" for баща
(father; dad is татко), "really long" for "много дълга" (very), "Would you like" for "Искаш ли"
(do you want), "do I stand a chance" for "имам ли шанс", "wear flip-flops" for "ходя по джапанки",
"When it's hot" for "В жегата", and in Dutch "maak ik een kans" as the *primary* for "имам ли шанс".

## Proposal
1. **Exact means faithful.** An answer is exact only when a teacher marking a translation exercise
   would give it full marks with no comment: it keeps the Bulgarian's number, definiteness,
   person, tense and structure, and its words are standard translations of the Bulgarian words.
   Differences the target language forces (articles, subject pronouns, word order, reported-speech
   backshift) and every reading of a genuinely ambiguous Bulgarian sentence stay exact.
2. **Everything else that is right becomes looser.** If the teacher would add a note ("fine, but
   очите is plural"), the answer moves to `en_loose` / `nl_loose`. It is still scored **correct**,
   with the "≈ looser" tag and the faithful answer shown below it, as built in D-014.
3. **The primary is always faithful.** Where the primary `en` or `nl` is itself a drift, a faithful
   alternative becomes the primary (or a faithful one is written) and the old primary moves to
   looser. This also gives the Dutch/English → Bulgarian direction a prompt that mirrors the
   Bulgarian.
4. **A data pass** applies this to every exact English and Dutch answer of all 2656 sentences.
   Nothing that is accepted now stops being accepted: the pass only moves answers between tiers
   and adds a faithful answer where none exists.
5. **A small arrow to the faithful answer.** The label above it changes from "Closer to the
   Bulgarian" to "→ Exact translation".
6. The writing brief states the stricter rule, so new sentences follow it.

Not proposed: dropping answers, re-sorting `bg_alt`, or scoring looser answers lower (D-014 keeps
them Good).

## Design notes
- The tier rubric for reviewers, with worked examples (all from the data):
  - *Exact, forced by the target language*: articles and possessives English needs ("Измих си
    ръцете" → "I washed my hands"), subject pronouns, do-support, word order, "said it wasn't
    serious" for "каза, че не е сериозно" (English backshift), "have got".
  - *Exact, equivalent tense*: Bulgarian present → simple or continuous; aorist → English past
    simple, Dutch imperfect or perfect; ще → will / going to (Dutch also zal, gaat or the present);
    perfect → present perfect.
  - *Exact, same word*: dictionary synonyms of the same Bulgarian word (talk/speak, fix/repair,
    grandma/granny/grandmother, rubbish/trash, stomach ache / pain in the stomach), the standard
    rendering of a fixed Bulgarian collocation ("хвърлям боклука" → "take out the rubbish"),
    British/American pairs, contractions, Dutch je/jij/jou.
  - *Exact, ambiguous Bulgarian*: every reading ("в неделя" → Sunday / Sundays; he/she/it for
    детето).
  - *Looser*: number (eyes → eye), definiteness (the → a, my, this), person or possessor, voice,
    a different structure ("look into your eyes" for "те гледам в очите", "When it's hot" for "В
    жегата"), a word that translates another Bulgarian word (dad = татко, really = наистина,
    would like = бих искал, wear ≠ ходя по, told me ≠ каза), a fixed idiom instead of the plain
    words ("stand a chance", "kans maken"), small additions or omissions ("any", "nothing
    serious"), English present perfect for an aorist, English present for a future.
- Reviewer output, one JSON line per sentence: `{"id", "en_demote": [...], "en_primary",
  "en_add": [...], "nl_demote": [...], "nl_primary", "nl_add": [...], "note"}`, empty fields left
  out. A script in the scratchpad turns these into a `tools/apply_patches.py` patch, checking that
  every demoted string exists verbatim, that every sentence was seen, and that a demoted primary
  is replaced.
- Review by eight parallel agents with the same rubric, on chunks of about 330 sentences; then a
  spot check of each chunk and a comparison of demotion rates between chunks.
- `index.html`: `#expected-label` text only. The smoke test checks the label.

## Acceptance criteria
- "Гледам те в очите.": "I look you in the eye." and "I look into your eyes." are accepted with
  the ≈ tag and "→ Exact translation: I look you in the eyes." (eyes highlighted).
- "Работиш ли в неделя?" still accepts "…on Sunday?" and "…on Sundays?" as exact.
- Every English and Dutch answer that was accepted before is still accepted.
- Every sentence's `en` and `nl` primary is faithful (spot check of 40 random sentences).
- `npm test` and `python3 tools/check_decisions.py` pass.

## Effort and risks
A short UI and brief change, a script of about 80 lines, and a review of about 15,000 answers by
agents. Risks: reviewers that are too strict make the tag appear on answers a teacher would not
comment on (the tag is harmless: the answer still scores Good), or that disagree with each other
(mitigated by one rubric with worked examples and by comparing demotion rates per chunk).

## As built
- Data: eight review agents worked through all 2656 sentences with one rubric (the list under
  *Design notes*, with 15 worked examples from the data). Their decisions went through a checker
  (every sentence seen, every demoted string verbatim, a demoted primary always replaced) and became
  one `tools/apply_patches.py` patch. Only `en`, `en_alt`, `en_loose`, `nl`, `nl_alt` and `nl_loose`
  changed; no answer was dropped, and no Bulgarian, lemma or rank changed.
- The coordinator read every changed primary (440) and a random sample of 40 demotions, and
  overrode 17 decisions where the reviewer went past the rubric (listed below).
- "Гледам те в очите.": exact "I'm looking you in the eyes." / "I look you in the eyes."; looser
  "…in the eye." and "…into your eyes." (both tenses).
- `index.html`: the label above the exact answer reads "→ Exact translation"; the ≈ tag's tooltip
  says the line below is the exact translation. The smoke test checks the new label.
- `tools/SENTENCE_BRIEF.md` (item 3 and the tier paragraph) and `DESIGN.md` (checking, step 2)
  state the stricter rule.

### Decisions taken
- Kept exact although the reviewers demoted them, as standard renderings of a fixed phrase:
  "My name is" / "What's your name?" for казвам се (A007–A009, M037; Dutch "Ik heet" stays the only
  exact Dutch), "too small / too loose" for "ми е малък / широк" (B118, F059, C108, C113, Q032; the
  Bulgarian dative already means "too"), Dutch "mevrouw" for госпожице ("juffrouw" is dated;
  M037, M044), "Wat/Hoeveel kost" for "Колко е" (A156), Dutch "komen uit" for "съм от" (C153),
  "good health" for "много здраве" (D077), "youngest/younger son" for "малкият ми син" (P023,
  genuinely ambiguous), Dutch "ontdooid" for frozen food that се стопи (V077).
- Rewritten primaries where the reviewer's new one was stilted or itself an idiom: D168, D082,
  K111, K061, V137.
- Rules the reviewers applied that the rubric did not spell out, accepted as consistent with it:
  този → "this" (онзи is "that"), "could you" for "можете ли", a Bulgarian present → "will" is
  looser, the Bulgarian impersonal third-person plural → an English or Dutch passive is looser
  ("Назначиха я…"), plural Bulgarian nouns → Dutch mass nouns (komkommer, groente) are looser.
- English present perfect for an aorist stays looser even with "already/yet" (D-014's rule), so
  some primaries now read American ("Did you already pay the bill?").

### Measurements
2026-10-22, 2656 sentences:
- 1779 sentences changed. English: 3265 answers moved from exact to looser, 165 new primaries
  (most promoted from an existing exact answer), 6 faithful answers added. Dutch: 1071 moved,
  275 new primaries, 3 added.
- English exact alternatives 11,312 → 8,063, looser 1,056 → 4,321. Dutch exact 3,705 → 2,705,
  looser 367 → 1,438.
- Sentences with at least one looser answer: 912 → 2111.

## Open questions
- ~~Should English present continuous for a planned future ("I'm leaving tomorrow" for "Утре
  тръгвам") count as exact when the Bulgarian itself uses the present?~~ Yes, it mirrors the
  Bulgarian tense; "will" for a Bulgarian present is looser, as is a present for a ще-future.
