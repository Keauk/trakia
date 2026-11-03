# D-046: Continue the Reading tab past word 500, with three stories each at levels 600 and 700

Status: done (2026-11-03) · Created: 2026-11-03 · Area: reading / content (`data/stories.json`, `data/cast.json`, `tools/validate_stories.py`: `LEVELS`, `tools/STORY_BRIEF.md`)

## Context
The Reading tab (D-026) stops at level 500 and lists levels beyond 500 as not proposed. The deck has
2952 words, so a learner past word 500 gets no new stories. The learner asked for stories at higher
levels. Words 501–700 add time words, pets, shops, travel, weather and school, which give new plots.

## Proposal
1. Two new levels, 600 and 700, with three stories each. The tab then holds 21 stories.
2. The rules of D-026 stay: words up to the level, at most 3 % glossed words, present tense and
   да-clauses (stage 1), the Petrov family, 3–5 questions, tap a word (D-027) and spoken text (D-005).
3. The six stories:
   - R600a *Портфейлът*: Мария's wallet is not in her pocket, and a dog is involved.
   - R600b *Котката на господин Стоянов*: the neighbour's cat is stuck in a tree. Петър promises to
     help, but he is afraid.
   - R600c *Рожденият ден на Яна*: Ана buys a T-shirt for Яна in the wrong size.
   - R700a *Куфарът*: Иван comes home from the airport with the wrong suitcase.
   - R700b *Сняг в планината*: the bus does not come on a snowy weekend, and the family must decide
     what to do.
   - R700c *Петър лъже*: Петър says he is ill to skip school, but his father is a doctor.
4. The tab lists the new levels as locked until the learner reaches them, like the levels before.

Not proposed: level 800 or higher, tenses beyond stage 1, more stories at the existing levels, and
changes to the Reading tab itself.

## Design notes
- `tools/validate_stories.py`: `LEVELS` gets 600 and 700. The UI needs no change, because `ui.js`
  takes its levels from the data.
- `tools/STORY_BRIEF.md`: the length rule gets level 600 (about 220–300 words) and level 700 (about
  240–320 words).
- Everyday words rank high in this deck: работа 912, пари 992, учител 1167, книга 1329, телефон 1427.
  Plots avoid scenes that depend on them, or gloss them within the 3 %.
- New speakers go in `data/cast.json`.
- One agent writes each level under the brief. A separate agent reads each story for grammar, natural
  Bulgarian, translations and questions, because the validator checks only vocabulary and structure.
- Merge: `python3 tools/validate_stories.py data/words.json data/stories.json <new file> -o data/stories.json`.
- Audio: `.venv/bin/python tools/build_audio.py`, then `npm run build`.

## Acceptance criteria
- `data/stories.json` holds 21 stories, 3 at each level 100–700, and the validator reports no errors.
- At word 500 the tab lists levels 600 and 700 as locked. At word 700 all 21 stories are open.
- A word of a new story resolves to a rank at or below its level, or to a glossed word.
- `build_audio.py --check` finds every clip of the new stories.
- The review read of each new story is finished and its findings are fixed.
- `npm test` and `check_decisions.py` pass.

## Effort and risks
About one evening. Content only, plus one validator constant and the brief. The main risk is
Bulgarian quality: the validator does not check grammar or natural style. The review read reduces
this risk, and the learner reports anything odd. Audio adds clips to `app/audio` and needs network
access.

## As built
- Built as proposed: six stories in `data/stories.json`, which now holds 21. `LEVELS` and the brief
  have the new levels, and `data/cast.json` has one new speaker, `Марков`.
- One agent wrote each level under the brief. A separate agent read all six. It found one wrong word
  lookup (`под` as "floor" in R600a), one misspelt name in a Dutch option, five unnatural passages
  and small translation slips. All are fixed, and no marked answer was wrong.
- No native speaker read the stories. The learner reports anything odd.
- The merge also corrected the stored `word_count` of R200a from 134 to 138. Its text did not change.

### Decisions taken
- `Извинете` and `Извинявай` are accepted like `Заповядайте`: fixed deck phrases, ranks 226 and 229,
  and R200c already uses `Извинете!`. The brief now says so.
- An open condition with `ако` and the present tense is allowed (R700c, as in R100a). The "no
  conditional" rule means the conditional mood.
- R700b glosses `снежен`, because `снежен човек` is the fixed term and `снежен` is not in the deck.

### Measurements
- 2026-11-03: 256–295 words at level 600 and 314–317 at level 700. Glossed words 0–0.3 % per story.
- 2026-11-03: 263 new clips and none removed, about 6 MB. Five short new clips have no word timings
  (for example `Всичко е наред`), so the story highlights them as a whole.

## Open questions
- Add level 800 next, with Christmas baking, theatre tickets and a storm at the beach?
- Add stories in later grammar stages, so a learner past the first stage reads other tenses?
