# D-050: Add two stories each at levels 350 to 950, built around words that no story uses yet

Status: done (2026-11-03) · Created: 2026-11-03 · Area: reading / content (`data/stories.json`, `data/cast.json`, `tools/validate_stories.py`: `LEVELS`, `tools/STORY_BRIEF.md`)

## Context
The Reading tab has three stories per 100 words, up to level 1000 (D-048). On 2026-11-03, 298 of the
first 1000 deck words occurred in no story and 236 in only one. In the range 701–1000, 49 % occurred
in no story. Everyday words such as уча, език, кино, поща and понякога were among them. A word waited
a median of 40–82 positions for its first story. The learner, at about word 300, asked for more stories
between the levels that exist.

## Proposal
1. Seven new levels, 350, 450, 550, 650, 750, 850 and 950, with two stories each. The tab then holds
   44 stories.
2. The rules of D-026 stay: words up to the level, at most 3 % glossed words, present tense and
   да-clauses (stage 1), the Petrov family, 3–5 questions, tap a word (D-027) and spoken text (D-005).
3. Each writer gets the words of the range (level − 100, level] that no story uses, and works in as
   many as sound natural.
4. Plots vary in setting and tone, to limit sameness across 44 stories about one family:
   - R350a: Мария's sister visits with her baby, and the baby does not sleep.
   - R350b: a girl who speaks another language comes to live in the building, and Ана learns from her.
   - R450a: Иван has a cold and is a very bad patient.
   - R450b: a guest comes to dinner, and all the food is meat.
   - R550a: the family moves furniture and finds lost things behind a wardrobe.
   - R550b: Петър finds his grandparents' home in Пловдив boring until дядо Георги shows him the
     watermelons.
   - R650a: a tourist in Sofia has lost a passport and speaks little Bulgarian.
   - R650b: a holiday in a village, where Иван dances and his belt breaks.
   - R750a: New Year's Eve in fog and on ice, and the family is late for midnight on the square.
   - R750b: Петър buys a hen at the market and brings it home by tram.
   - R850a: at Easter a wrong route brings the family to a monastery with bees.
   - R850b: Ана and Яна sell old things in the neighbourhood, and one of them should not be sold.
   - R950a: a holiday at a resort, a boat with a dead engine, and ducks.
   - R950b: Иван sees a crash at a traffic light and helps. The tone is serious.
5. The tab lists the new levels as locked until the learner reaches them, like the levels before.

Not proposed: levels 150 and 250, because those words are well covered and the learner has passed
them. Not proposed: a third story per level, tenses beyond stage 1, and changes to the Reading tab.

## Design notes
- `tools/validate_stories.py`: `LEVELS` gets the seven levels. `ui.js` takes its levels from the data.
- `tools/STORY_BRIEF.md`: the length rule gets the new levels, and a rule for target word lists.
- New speakers go in `data/cast.json`. Speakers that end up unused are removed before the merge.
- Agents write the stories under the brief. A separate agent reads each story for grammar, natural
  Bulgarian, translations, word lookups and questions.
- Another session works on the Grammar tab at the same time. This work stays in a separate worktree
  and does not change `ui.js`, `core.js`, `index.html`, `data/grammar.json` or the UI tests. It is
  rebased on `main`, and the generated `app/data.js` and `app/sw.js` are rebuilt before the merge.
- Merge: `python3 tools/validate_stories.py data/words.json data/stories.json <new files> -o data/stories.json`.
- Audio: `.venv/bin/python tools/build_audio.py`, then `npm run build`.

## Acceptance criteria
- `data/stories.json` holds 44 stories, and the validator reports no errors.
- At word 300 the tab lists level 350 as locked. At word 350 the two R350 stories open.
- The number of words 1–1000 that occur in no story falls, and the record gives the new number.
- `build_audio.py --check` finds every clip of the new stories.
- The review read of each new story is finished and its findings are fixed.
- `npm test` and `check_decisions.py` pass.

## Effort and risks
Content only, plus one validator constant and the brief. About 11 MB of audio. Forced target words
could make the Bulgarian unnatural, so writers skip a word rather than force it. The validator does
not check grammar or natural style; the review read reduces this risk. No native speaker reads the
stories, and the learner reports anything odd.

## As built
- Built as proposed: 14 stories in `data/stories.json`, which now holds 44. `LEVELS` and the brief have
  the new levels. `data/cast.json` has five new speakers: `Силвия`, `момичето`, `момчето`, `туристът` and `монахът`.
- The titles: R350a *Лека нощ, Рая!*, R350b *Сок или чорап?*, R450a *Лекарят е пациент*, R450b *Гостът
  не яде месо*, R550a *Зад гардероба*, R550b *Най-голямата диня*, R650a *Колко е часът?*, R650b
  *Коланът на Иван*, R750a *Нова година в мъглата*, R750b *Кокошка в трамвая*, R850a *Маршрутът на
  Иван*, R850b *Жабата от стъкло*, R950a *Деветнадесет патици*, R950b *Късно вечер*.
- Four agents wrote the stories under the brief. Two separate agents read them and fixed 6 errors, 13
  unnatural passages, 8 lookups and quoted-speech punctuation in 15 places. They removed one wrong
  quiz option and reworded two questions. No marked answer was wrong. The lead read the final
  Bulgarian and changed nothing further.
- No native speaker read the stories. The reviewers named these lines for a native check: R350a
  „Какво гърло има това бебе!“ and „Трябва ѝ баня“, R350a „ходи с нея по стаята“, R450a „Лягаш, пиеш
  хапчето и спиш“, R650b „Иван върви по-бързо и по-бързо“, R750a „гледа коляното ѝ“, R750b „В голямата
  стая“ for a museum hall, and R850a „Честит Великден!“ from a monk.
- A check in the real app code passed: 9 stories open at word 300 and 349, 11 at word 350, 14 at 400,
  16 at 450, 29 at 700, 31 at 750, 41 at 950 and 999, and 44 at 1000. Levels list in number order.
  Each new story opens and all its words can be tapped. This check is not in `npm test`.

### Decisions taken
- Мария's sister in R350a is Силвия, not Вера as first briefed: Вера is Николай's wife in R400c. For the
  same reason the woman with the dog in R850b is Катя.
- R550b is set at the grandparents' home in Пловдив, because `село` is rank 560, above the level.
- Some target words are unused, because they need a past tense (Разбрах) or sounded forced.
- Quoted speech in the new stories has a comma after `!“` and `?“`, as in the stories from level 500
  up. Levels 100–400 mostly lack it, and they stay as they are.

### Measurements
- 2026-11-03: words 1–1000 in no story, before → after: 298 → 76 (1–300: 36 → 20; 301–700: 115 → 12;
  701–1000: 147 → 44). In two or more stories: 466 → 579.
- 2026-11-03: 219–220 words at level 350, 258–260 at 450, 285–287 at 550, 259–299 at 650, 326–329 at
  750, 341–343 at 850, 363–367 at 950. Glossed words 0–2.9 % per story. The 30 existing stories did
  not change.
- 2026-11-03: 604 new clips and none removed, about 13 MB. `app/data.js` grew from 4682 KB to 4944 KB.
  19 more short clips have no word timings (31 in total).

## Open questions
None.
