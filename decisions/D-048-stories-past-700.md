# D-048: Continue the Reading tab past word 700, with three stories each at levels 800, 900 and 1000

Status: done (2026-11-03) · Created: 2026-11-03 · Area: reading / content (`data/stories.json`, `data/cast.json`, `tools/validate_stories.py`: `LEVELS`, `tools/STORY_BRIEF.md`)

## Context
The Reading tab stops at level 700 (D-046). The deck has 2952 words, so a learner past word 700 gets
no new stories. The learner asked for stories at level 800 and higher. Words 701–1000 add seasons,
holidays, nature, animals, travel, and at last работа (912) and пари (992), which give new plots.

## Proposal
1. Three new levels, 800, 900 and 1000, with three stories each. The tab then holds 30 stories.
2. The rules of D-026 stay: words up to the level, at most 3 % glossed words, present tense and
   да-clauses (stage 1), the Petrov family, 3–5 questions, tap a word (D-027) and spoken text (D-005).
3. The nine stories:
   - R800a: Ана and Петър bake a Christmas cake for господин Стоянов and mix up the salt and the sugar.
   - R800b: Иван buys theatre tickets, and at the entrance the date on them is wrong.
   - R800c: a storm comes up on the beach, and Петър is not with the family.
   - R900a: a tyre bursts on the motorway on the way to Пловдив, and a young man stops to help.
   - R900b: on a school trip to the zoo, one child is missing at the count.
   - R900c: Иван and Ана walk to a mountain hut, and something makes a noise at night.
   - R1000a: Ана and Петър find a bag of money in the park and must decide what to do.
   - R1000b: the family camps by a river, and the rain does not stop.
   - R1000c: Ана takes the train to Пловдив alone for the first time.
4. The tab lists the new levels as locked until the learner reaches them, like the levels before.

Not proposed: level 1100 or higher, tenses beyond stage 1, more stories at the existing levels, and
changes to the Reading tab itself.

## Design notes
- `tools/validate_stories.py`: `LEVELS` gets 800, 900 and 1000. The UI needs no change, because `ui.js`
  takes its levels from the data.
- `tools/STORY_BRIEF.md`: the length rule gets level 800 (about 260–340 words), 900 (about 280–360)
  and 1000 (about 300–380).
- Everyday words still rank high: учител 1167, книга 1329, телефон 1427, полиция 1534. Plots avoid
  scenes that depend on them, or gloss them within the 3 %.
- New speakers go in `data/cast.json`.
- One agent writes each level under the brief. A separate agent reads each story for grammar, natural
  Bulgarian, translations, word lookups and questions, because the validator checks only vocabulary
  and structure.
- Merge: `python3 tools/validate_stories.py data/words.json data/stories.json <new files> -o data/stories.json`.
- Audio: `.venv/bin/python tools/build_audio.py`, then `npm run build`.

## Acceptance criteria
- `data/stories.json` holds 30 stories, 3 at each level 100–1000, and the validator reports no errors.
- At word 700 the tab lists levels 800, 900 and 1000 as locked. At word 1000 all 30 stories are open.
- A word of a new story resolves to a rank at or below its level, or to a glossed word.
- `build_audio.py --check` finds every clip of the new stories.
- The review read of each new story is finished and its findings are fixed.
- `npm test` and `check_decisions.py` pass.

## Effort and risks
Content only, plus one validator constant and the brief. The main risk is Bulgarian quality: the
validator does not check grammar or natural style. The review read reduces this risk, and the learner
reports anything odd. Present tense becomes more limiting as the stories get longer. Audio adds clips
to `app/audio` and needs network access.

## As built
- Built as proposed: nine stories in `data/stories.json`, which now holds 30. `LEVELS` and the brief
  have the new levels. `data/cast.json` has three new speakers: `жената`, `служителката`, `мъжът`.
- The titles: R800a *Специална торта*, R800b *Два билета*, R800c *Буря на плажа*, R900a *Гумата*,
  R900b *Екскурзия до зоопарка*, R900c *Хижата*, R1000a *Торбата с парите*, R1000b *Най-добрата
  палатка*, R1000c *Ана пътува сама*.
- One agent wrote each level under the brief. A separate agent read all nine and fixed 5 errors,
  10 unnatural passages, 2 lookups and 7 translation slips. It changed one question that did not fit
  the story. No marked answer was wrong. The lead read the final Bulgarian and changed one more line.
- No native speaker read the stories. The reviewer named these lines for a native check: R900a
  „дърпа на една страна“ and „часовник за стена“, R900c „гледа хартиите на масата“, R800a „От много
  години никой не ми прави торта“ and „Хубава ли е?“, R1000a „Колко години са това, Петре?“ and
  „Търся я навсякъде от сутринта!“.
- A check in the real app code passed: at word 700 and 799, 21 stories open and the new levels show as
  locked; at word 800, 24; at word 900 and 999, 27; at word 1000, 30. Each new story opens and all its
  words can be tapped. This check is not in `npm test`.

### Decisions taken
- The batch stops at level 1000. Longer stories are harder to keep natural in the present tense only,
  so the next step needs a decision (see Open questions).
- The present-only rule makes some lines less natural than a perfect tense would be, for example
  R800a „От много години никой не ми прави торта“. They stay, because the rule is part of stage 1.
- `пети` is glossed in R1000c: „вече пет пъти чете“ reads as a past tense, „вече за пети път чете“
  cannot.
- „Добре дошла“ (R1000c) is accepted as the feminine of the deck phrase `Добре дошли`.

### Measurements
- 2026-11-03: 338–339 words at level 800, 351–358 at level 900, 367–376 at level 1000. Glossed words
  0–1.8 % per story. The 21 existing stories did not change.
- 2026-11-03: 461 new clips and none removed, about 10 MB. Six more short clips have no word timings
  (12 in total), so the story highlights them as a whole.

## Open questions
- ~~Continue past level 1000 in the present tense only, or first add stories in later grammar stages?~~
  First later grammar stages: the learner chose to add past tense stories, with a clear note that they
  need a higher grammar stage.
