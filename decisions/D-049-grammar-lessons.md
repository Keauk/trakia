# D-049: Teach grammar in short lessons, with typed practice and spaced, mixed reviews

Status: in progress · Created: 2026-11-03 · Area: Grammar tab (`ui.js`: `renderGrammar`, the drill flow; `core.js`: new lesson functions), content (`data/grammar.json`, `data/grammar_labels.json`), sync, Stats

## Context
The learner asked for proper grammar lessons, based on what research shows works.

Today the Grammar tab has 17 reference cards (a table, notes, examples) and drills on isolated forms
(`ние + съм`). Three things are missing:
- No lesson teaches a rule. The cards are a cheat sheet (D-009).
- Nothing brings a rule back on later days. Drills sample by past mistakes, not by a schedule.
- Five topics have word labels (D-039) but no card: aspect, plurals, gender agreement, се/си and
  comparison.

Research that decides the design:
- **Practice and feedback do most of the work, not the rule alone.** In computer-delivered practice, an
  explanation before practice added little unless the feedback also carried it (Stafford et al. 2012;
  Sanz & Morgan-Short 2004). Explicit teaching still beats exposure for endings that adults do not
  infer alone (Kempe & Brooks 2008). The syntheses disagree on the size: Norris & Ortega 2000 report a
  large advantage, and Kang et al. 2019 (54 studies) only a "minor difference". So a lesson is the
  start of practice and gives the words that feedback uses later.
- **Typed production is the best main practice.** Production practice gives d = 1.02 against controls
  on delayed productive tests, and a small lead over comprehension practice (d = .21; Shintani et al.
  2013, 35 projects). Typed translation needs the meaning, so it is a meaningful drill and not a
  mechanical one (Wong & VanPatten 2003). The evidence against mechanical drills is indirect.
- **Specific feedback beats a bare mark.** Grammar-specific hints added d = 0.56 to right/wrong marks
  and a generic retry (Meurers et al. 2019, field trial, age 13). Across subjects, right/wrong alone
  gives 0.05, the correct answer 0.32 and an elaborated message 0.49 (Van der Kleij et al. 2015).
  Immediate feedback is better than or equal to delayed feedback (Xu & Zeng 2023).
- **Spread practice over days, with short gaps first.** Spacing wins on delayed tests (Kim & Webb 2022,
  48 experiments). Grammar studies conflict on the best gap, but short gaps early and longer gaps
  later fit them all. Equal and expanding schedules are equivalent.
- **Mix rules across sessions, after a short block.** Mixed conjugation practice over two sessions beat
  blocked practice at one week (d = 0.53 and 0.79; Pan et al. 2019), but mixing from first contact
  inside one session did not. Blocked practice feels better and tests worse.
- **Judge a rule on new sentences.** Learners who typed L1-to-L2 sentences over several sessions reached
  83–95% on new sentences after 14 days with two error-free sessions, and 46–62% with fewer (Serfaty
  & Serrano 2024, artificial language, correlational). Repeated sentences are partly remembered as
  strings (Robinson & Ha 1993).
- **Contrast with the first language can help.** Explicit L1 information gave large delayed gains
  (McManus & Marsden 2017, one structure, small exploratory groups). Dutch and English speakers have
  different traps: in Spanish, English speakers overused the preterite and Dutch speakers carried over
  the present perfect (González & Quintana Hernández 2018).

Limits of this evidence:
- No controlled trial of grammar lessons in an adult self-study app exists.
- No study tests Dutch speakers learning Bulgarian, and direct evidence on L2 Bulgarian is almost absent.
- Every design choice here extrapolates from classrooms, lab software, artificial languages and teens.
  The learner's own delayed results are the only direct evidence, so the app must measure them.

What the app already has: 2,656 sentences with a grammar label on each word (D-039) and an answer checker
with rule notes (D-006). So most lessons need no new sentences. Some topics do:

Number of usable sentences per lesson. Usable means: within the lesson's grammar stage, and the target
form is in every accepted Bulgarian answer. (съм and irregular verbs: counted without the accepted
answers check.)

| lesson | stage | rank ≤ 300 | rank ≤ 600 | new card |
|------------------------|-------|-----------|-----------|----------|
| съм (present) | 1 | 144 | 258 | |
| Present tense endings | 1 | 394 | 657 | |
| Common irregular verbs | 1 | 39 | 68 | |
| имам / нямам | 1 | 57 | 88 | |
| Plural of nouns | 1 | 96 | 176 | yes |
| Gender agreement | 1 | 93 | 151 | yes |
| Definite article: the forms | 1 | 202 | 376 | |
| Definite article: full or short | 1 | 75 | 155 | |
| Short possessives | 1 | 82 | 121 | |
| Questions with ли | 1 | 70 | 95 | |
| да-constructions | 1 | 38 | 66 | |
| Short object pronouns and their place | 1 | 22 | 43 | |
| Future with ще | 2 | 25 | 51 | |
| Imperatives | 2 | 50 | 100 | |
| Aspect: one complete action or not | 2 | 109 | 211 | yes |
| Aorist | 3 | 42 | 92 | |
| Long possessives | 1 | **0** | **1** | |
| се and си | 1 | **4** | 23 | yes |
| Numbers and the count form | 1 | **5** | 12 | |
| Comparison | 1 | **7** | 13 | yes |
| Past of съм | 3 | **6** | 11 | |
| Perfect | 3 | **2** | **2** | |
| Imperfect | 4 | **7** | 11 | |
| Conditional | 4 | **0** | **0** | |

16 lessons can start now. 8 lessons need new sentences first (bold). No study validates a number of
sentences per rule. 12 is a working minimum, inferred from the studies on varied sentences. The default
order is by stage, then as listed. A bold lesson joins its stage when it has its sentences.

## Proposal
1. **A lesson is short and leads straight to practice.** The Grammar tab lists the lessons (16 with this
   record, 24 with the later sentences) in a default order, grouped by stage. A lesson page has:
   - the rule, in at most 90 words, with the table if it needs one;
   - one or two sentences on the trap for the learner's language ("For Dutch speakers" or "For English
     speakers");
   - 2–3 example sentences with the target form marked, the D-039 gloss and audio;
   - a **Practise** button.
2. **Practice comes at once and is about one rule.** A lesson run has 8 items, about 5 minutes:
   - 3 gap items: a real sentence with the target form blank, its translation, the dictionary form;
   - 5 whole sentences: Dutch or English to typed Bulgarian, as on a sentence card.

   Unseen sentences come first. The rule is hidden during an item and shows after the answer.
3. **Feedback is immediate and names the rule when the app is sure.** Every answer shows the verdict and
   the correct form. When only the target form is wrong, the app first says why, with the same words as
   the lesson, and gives **one** more try. The first try counts for the schedule. After that, the form
   shows. When other words are wrong too, the form shows at once. A typing slip is no grammar error.
4. **A missed rule returns on another sentence.** At most 2 extra items at the end of the run. The same
   sentence never returns, and retyping a shown answer never counts.
5. **Reviews bring rules back on later days, mixed.** The first review is the next day. A **Grammar
   review** run has 3 sentences per due rule, at most 12, shuffled. The gaps follow a fixed ladder: 1, 3,
   7, 14, 30, 60 and 120 days. The first lesson run puts a rule on the 1-day step.
   - A clean run has every target right on the first try. It moves a rule one step up, but the rule
     passes 3 days only after two clean runs in a row.
   - A run with at least half right keeps the step and breaks the count of clean runs.
   - A run with less goes back to 1 day.
   - No rule leaves the ladder: at the top it returns every 120 days.

   The summary says that mixed practice feels harder and that this is expected.
6. **Nothing is locked or required.** Any lesson opens at any time, and sentence practice never waits for
   grammar. A quiet line on the Practise home card shows the rules due. When all published lessons of a
   stage have had a run, the Grammar tab offers to raise the stage (D-008). Only a tap does this.
7. **The tables stay.** Each lesson links to its reference card, and the Grammar tab keeps the cards.
   "Drill this table" (D-009) stays there as an optional warm-up. The top-level "Grammar drill" buttons
   go in step 2, when reviews can replace them.
8. **Stats show the only direct evidence.** Per rule: first-try accuracy on unseen sentences at least one
   day after the last practice of that rule, with the median response time.

Order of work, each step usable on its own:
1. Lesson runs, their state and its sync, and three pilot lessons: definite article forms, да-constructions,
   short object pronouns. They test three kinds of error: an ending, a construction and word order.
2. Reviews, the schedule and the Stats table.
3. **Pilot stop.** The learner uses this for about two weeks and decides: go on, change it or stop.
4. The other 13 lessons that have enough sentences, and the five new reference cards.
5. Links from sentence practice: the D-006 notes and D-039 chips open the lesson.

After the pilot, each as a separate record:
- About 65–100 new sentences and the 8 remaining lessons, a content batch like D-046.
- Interpretation items for aspect and for aorist and imperfect: read or hear a sentence and tap what it
  means, where the form decides the meaning. They come after production works.

Not proposed:
- time limits, confidence ratings, self-explanation prompts;
- retry until correct inside a lesson;
- readiness locks, or feedback that adapts to proficiency;
- grammar as a required step before sentence practice;
- changing sentence intervals by grammar tag (it overfitted at Duolingo; Settles & Meeder 2016);
- spoken practice, free writing, or lesson text in Dutch.

## Design notes
**Research method → what it means here**

| method (evidence) | here | step |
|-------------------|------|------|
| Typed L1-to-L2 production with a cue that fixes the form (strong; moderate for translation) | whole-sentence items | 1 |
| Immediate correction that shows the form (strong; moderate in software) | existing verdict and expected line | 1 |
| Short explicit lesson, then practice at once (moderate) | lesson page, then run | 1 |
| Rule-naming feedback when sure (moderate) | target check, label text | 1 |
| L1 contrast notes per language (limited) | `contrast` field | 1 |
| Cloze as a low-load step (limited) | gap items | 1 |
| One hinted retry (limited, conflicting) | only when only the target is wrong | 1 |
| Spacing, short gaps first (strong; limited for the gap) | the ladder of gaps | 2 |
| Mixing across sessions after a block (moderate) | blocked lesson run, mixed reviews | 2 |
| Mastery on unseen sentences (limited) | unseen order, Stats | 2 |
| Two clean sessions before long gaps (limited) | the ladder's rule at 3 days | 2 |
| Interpretation items (strong receptive; limited in software) | new item type | later record |
| Highlighting and seeding in stories (small effect) | not planned; D-026 stays as it is | – |
| Timed practice (very limited) | response time logged, no limit | – |
| Worked examples, pretests, guided discovery (very limited to conflicting) | not planned; the marked examples are a design choice | – |

**Three shipped features this could seem to clash with**
- D-044 (retry until right): it stays for sentence sessions. It excludes drills, and lesson runs work
  like drills. A lesson has one hinted retry, then a new sentence for the same rule.
- D-008 (grammar stages): stages stay, and the learner sets them. The research warns against locks driven
  by app scores, and D-008 is not one. Lessons sit inside stages.
- D-009 (drills): results and tallies stay. Isolated forms move to the Tables section. They can be
  answered without thinking about meaning, so they are no longer the main practice.

**Content.** A new top-level `lessons` array in `data/grammar.json`, in the default order, so the cards, links
and the build stay: `{id, card, stage, title, rule: [...], table, contrast: {nl, en}, examples: [sentence ids],
pool: {labels, next, order, cue, exclude, hint}}`.
- `labels` are D-039 labels. `next` adds the word that belongs with a target (the verb after да). `order`: the
  place counts too. `cue`: per language, the prompt must hold one of these words, so that it asks for the form.
  `exclude`: sentences that do not teach the rule.
- Step 4 adds `forms`, for what no label marks (съм, irregular verbs).
- The text is in English, like the rest of the app. `contrast.nl` is for Dutch speakers; `settings.lang`
  `mixed` shows both.
- `grammar_labels.json`: add `card` to `pf`, `ipf`, `pl`, `agr-*`, `se`, `si`, `comp` and `sup`, and add
  their five cards. The lesson text reuses the label's terms, so that lesson, feedback and Explain use
  the same words. The label `text` is what the feedback shows.
- New `tools/LESSON_BRIEF.md` for the writer. A second model pass checks each lesson against a Bulgarian
  reference grammar. New sentences use `SENTENCE_BRIEF.md` and the normal pipeline, including
  explanations and audio.
- New `tools/check_lessons.py`, run by `npm test`: every lesson has a known card, known labels, a rule
  within the limit, both contrast notes, and examples that contain the target. A published lesson has a
  pool of at least 12 at the tool's reference rank (300 today, a constant to raise later).

**Pure functions in `core.js`**
- `lessonPool(lesson, sentences, settings)`: sentences with a target word in `s.ex` (bundled by
  `build_data.py`). It uses `grammarOk` with the higher of the learner's stage and the lesson's stage. It
  drops a sentence when a target form is missing from `bg` or `bg_alt`, when the prompt holds no cue word,
  or when the words of `bg` do not line up with `s.ex`. It does not read `bg_alt_en`: that only swaps ти and
  вие, which an English prompt leaves open (D-018). If fewer than 10 remain, it widens the rank up to 10,
  room for a full run and two extra items; the existing new-word chips show the unknown words.
- `buildLessonRun`, `buildReview`: order by within the lesson's stage, then unseen first, then longest ago, then
  fewest other labels and shortest. An item has `kind`, `sentence`, `targets`, `unseen` and, for a gap, `gap`.
  With `next`, a gap blanks both words, and only when they stand side by side. `buildReview`
  mixes with the existing `interleave`. If only one rule is due and another has been started, it adds 2
  sentences of the other rule, ungraded.
- `targetCheck(typed, item)`: whether each target form is among the typed words, and whether **only** the
  target differs (`alignWords`, D-014). The second result allows the rule note and the retry. A lesson
  counts the target only, so a vocabulary slip elsewhere does not mark the rule as failed.
  - It compares through `normalise`, so settings such as "Strict ѝ" apply.
  - A target of three letters or more with a typing slip that is not itself a known word form counts as
    right (`formSlip`, D-014). In a word of one or two letters, every letter counts.
  - A target that the closest accepted answer does not have is not at stake (the other "you", D-018).
  - In a word-order lesson (`pool.order`), the place counts too: when only the targets moved (`sameBag`, as
    in `explain`), they are wrong, and only they are. Such a lesson runs with `bagOfWords` off, or the check
    accepts the wrong order.
- `gradeRule(state, results, now)`: the ladder of proposal 5, on first tries only. Due dates are whole
  local days, so nothing falls due on the same day. Only the first run on a due rule on that day moves it,
  and a lesson run then counts like a review. A run on a rule that is not due changes nothing.
- The ladder replaces FSRS here on purpose. Measured on 2026-11-03, `gradeWord` on a new record gives
  about 10–15 minutes for Again and Hard, and Good in a row gives 2, 11, 46 and 163 days. Four clean runs of 3
  sentences would take a rule away for five months. Those parameters come from single flashcards, and
  FSRS has never been tested on grammar. The research finds equal and expanding gaps equivalent and no
  best gap, so a fixed ladder gives up little and is easy to test.

**State.** A new `lessons` map in `localStorage`: `{id: {last, seen: {sentenceId: {first, ok, unseen, delayed,
last}}}}`. Step 2 adds `step`, `clean` and `due`. The Stats numbers are counted from `seen`, not stored.
- It is apart from `progress` on purpose. `progress` keys are parsed in many places (`parseKey`,
  `cardKeys`, Stats), and a third kind of key there risks regressions.
- It joins `snapshot`, import and export, and `mergeSnapshots`, and it is in `types.d.ts`. All but `seen`
  comes from the side with the later `last`, as for `drills` and `reading`. `seen` merges as a
  union: per sentence, the earliest `first` keeps its outcome, and `last` takes the maximum. A plain
  last-wins merge would lose the other device's answers, serve them again as unseen and inflate Stats.
- Answers also go to `drillLog` as `[ts, key, score, ms, unseen]`, so the streak (D-045) and the day totals
  work unchanged. The per-rule numbers live in `lessons`, because `compactHistory` folds old entries.
- A lesson answer never touches a sentence's FSRS record, as with drills (D-009). A miss in sentence
  practice does not change a rule's schedule.
- "Unseen" means not in `seen` and no `…2bg` card in `progress`.

**UI (`ui.js`, `index.html`).** A run uses the drill flow (`startDrill`, `renderDrillCard`, `checkDrill`,
`nextDrill`) with a `session.lesson` field. Each item says whether it is a gap or a whole sentence,
because several checks read `session.drill` today and whole sentences must act like sentence cards:
- the capital of D-038 (`input` listener);
- the first-letter rule of the ѝ dropdown (D-047, `yiHere`);
- `bagOfWords` in `checkDrill`;
- the Explain link (`resetExplain`) and the translit preview.

`renderGrammar` becomes the lesson list with state (new, next review date) and a Tables section. Keep the
`#gcard-` anchors so that existing "See:" links work.

## Acceptance criteria
- `tools/test_core.js`:
  - `lessonPool`: stage, rank, a missing target in an accepted answer, a token mismatch, widening;
  - `buildLessonRun`: 3 gaps and 5 sentences, unseen first, no sentence twice;
  - `buildReview`: mixed order, the limit of 12, the ungraded rule;
  - `targetCheck`: only the target wrong, others wrong too, a typo, a known wrong form, an accepted
    alternative, a clitic in the wrong place;
  - `gradeRule`: each ladder step, two clean runs before passing 3 days, back to 1 day, no same-day due
    date, once per day, a lesson run on a due rule and on a rule not due;
  - `mergeSnapshots`: `lessons` from two devices keep the `seen` entries of both, and the Stats count stays
    the same after a merge.
- `tools/smoke_ui.js`:
  - open a lesson and run it end to end, with the rule hidden during an item;
  - one hinted retry when only the target is wrong, and none otherwise;
  - a missed rule returns on another sentence;
  - a run changes no record in `progress`;
  - the review is due the next day and mixes rules;
  - sentence practice works with no lesson done;
  - the stage changes only on a tap;
  - "Drill this table" still works.
- `tools/check_lessons.py` runs in `npm test` and fails on a broken lesson.
- Stats show first-try accuracy on unseen sentences after at least one day, with median response time, per
  rule.
- In a real browser: the lesson page and a run on a desktop and at phone width, offline, in dark mode.
- A second model pass has checked every lesson's Bulgarian and rule. Its findings are applied.
- Step 3: the learner has said to go on, change it or stop, and this record says which.
- `npm test` passes.

## Effort and risks
Steps 1 and 2: about 400 lines of app code plus tests, and three lessons. Step 4: content, about 13
lessons and 5 cards, plus review. Step 5: a few lines. The later records are not counted here. This
record is done after step 5; the 8 bold lessons do not hold it open.

- **A wrong rule is taught wholesale.** The review pass is not optional. Language facts come from a
  reference grammar, not from general web pages.
- **The research does not prove this works for this learner.** So the pilot stop comes before most of the
  content, and Stats measure the result.
- **The Dutch and English contrasts for Bulgarian are inferred**, not tested. Each note states a language
  fact, not a claim about what learners do. The aorist and perfect traps above come from Spanish.
- **Rule-naming can be wrong.** The second try shows only when the target is known and nothing else differs.
- **The pronoun lesson practises few of the forms it teaches.** At rank 600, го has 7 sentences, я and му have 1,
  and ѝ and им have none. The later sentences must fill this.
- **Native speakers vary** on aorist and imperfect (Laskova et al. 2025) and on the count form (Pancheva
  2023). Accept the variants as answers, or leave those sentences out, so that the app does not mark
  them wrong.
- **Reviews can pile up.** A run has at most 12 sentences, and the rest stay due. Due rules do not count in
  the daily load (D-042), and no streak depends on them.
- **Reviews get skipped because they are separate.** Check this at the pilot stop. Mixing them into sentence
  sessions is possible, but D-024 and D-044 make it riskier, so it is not the first choice.
- **A seen sentence can test memory, not the rule.** Unseen sentences come first, and Stats count only them.

## As built
Step 1 is built. Steps 2–5 are not started.

- `core.js`: `lessonTargets`, `lessonPool`, `buildLessonRun`, `lessonExtra`, `targetCheck`, and `lessons` in
  `mergeSnapshots`.
- `ui.js`, `index.html`: the lesson list above the reference cards, the lesson page, and a run through the drill
  flow with `session.lesson`.
- `data/grammar.json`: three lessons. `tools/check_lessons.py` runs in `npm test`. `tools/LESSON_BRIEF.md`.
- Not yet: reviews, the Stats table, the removal of the top-level drill buttons (step 2). Answers are logged
  from the first run, so Stats will have the history.

### Decisions taken
- The label `da` marks only the word да, so `pool.next` makes the verb after it part of the target. Otherwise
  `искам да отидеш` for `искам да отида` would count as right.
- `pool.cue` and `pool.exclude` are new. Labels alone admit sentences whose prompt does not ask for the form: `in
  bed` for `в леглото`, or an article forced by a possessive that the lesson has not taught.
- The array sets the order, so there is no `order` number. The rank widens up to 10, not 8: at 8, a beginner's
  missed rule had no sentence left to return on.
- State and sync moved from step 2 to step 1, so that no answer of the first runs is lost.
- The review pass found that the D-039 label `order` and the D-006 note said that short pronouns stand "right
  after the first stressed word". That is a second-position rule, and it is wrong for Bulgarian: they are tied to
  the verb. Both are corrected. The labels `the`, `da`, `cl-acc` and `cl-dat` are corrected or extended too.
- The review pass could not reach the reference grammars named in the brief (Scatton, Hauge, Leafgren, Pashov, the
  Academy grammar). The clitic rules rest on Avgustinova (POLYSLAV) and a Sofia Medical University sheet, the
  rest on model knowledge. This falls short of the plan. A check by a teacher or a native speaker is still open.
- Seven accepted answers added to `data/sentences.json` after the review: M064, B054, B065, P072, B068, M014, M049.
  P001 and P009 have the prompt "in bed blijven" for `лежа`; they are excluded from the lesson, and their text
  is unchanged.
- The plan's "61 sentences do not line up with their explanation" was a counting error of the plan: hyphens. With
  the app's own word tokens, none differ.

### Measurements
2026-11-04. Usable sentences within the lesson's stage, Dutch and English prompts:

| lesson | rank 100 | rank 300 | rank 600 |
|--------|----------|----------|----------|
| Definite article: the forms | 11 / 11 | 102 / 98 | 202 / 193 |
| да instead of an infinitive | 10 / 10 | 28 / 28 | 56 / 56 |
| Short object pronouns | 10 / 10 | 15 / 15 | 35 / 34 |

(Rank 100 is widened to 10 where fewer fit.)

Rule length: 88, 87 and 90 words. Chromium on phone emulation, desktop and dark mode: no page errors and no
sideways scrolling. A whole run also works offline after the service worker has installed. Not tested on a real
phone, in Safari or in Firefox.

## Open questions
- ~~Are these the right three pilot lessons?~~ Yes, approved on 2026-11-04 with the plan.
- Can a teacher or a native speaker check the three lessons, since the reference grammars were not reached?
- Should the sentences for го, я, ги, му, ѝ and им come earlier than the later content batch?
- Does one hinted retry help, or only slow things down? Decide at the pilot stop.
- Should reviews stay a separate run, or join sentence sessions? Decide at the pilot stop.
