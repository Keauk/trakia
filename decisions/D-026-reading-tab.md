# D-026: A Reading tab with short stories at the learner's level

Status: in progress · Created: 2026-10-26 · Area: new tab / content (`index.html`: nav, `#tab-reading`; `ui.js`: `renderReading`, `openStory`; `core.js`: `storyEligible`, `storyTokens`; `data/stories.json`, `tools/validate_stories.py`, `tools/STORY_BRIEF.md`, `tools/build_data.py`)

## Context
Everything in the app today is single sentences: typed translation, drills, the library. The
learner wants to practise **reading comprehension** on connected text: a short story where the
same people and things come back, the words appear in context, and understanding builds over a
page instead of one line. The vocabulary filter that makes the sentences work (only words up to
the learner's Anki position, D-003, plus the grammar stage, D-008) should hold for the stories too,
so a story never leans on words the learner has not met.

Reading research puts comfortable, unassisted comprehension at 95–98 % known words (Hu & Nation
2000; Laufer & Ravenhorst-Kalovski 2010). A story limited to 100 % known words at a vocabulary of
100 is stilted; a handful of glossed words makes it read like a story.

## Proposal
1. A new tab **Reading**, after *Practise*.
2. Stories come in **levels by Anki position**: 100, 200, 300, 400 and 500. A level-N story uses
   words of rank N or lower, plus the function words and names the sentence brief already allows.
   **3 stories per level**, 15 in total.
3. **Glossed words** (learner's idea #1): a story may use a few words above its level, at most
   3 % of its running words. They are marked in the text and listed with their meaning under the
   paragraph, so they never block understanding.
4. **Recurring characters** (idea #4): all stories follow one family and their circle in Sofia
   (parents, two children, grandparents in Plovdiv, a neighbour), so later stories build on
   earlier ones. Each story stands on its own.
5. The tab shows the stories that fit the learner: every level up to their Anki position (plus
   the tolerance setting) whose grammar fits their stage. The highest open level comes first.
   Higher levels are listed as locked, with the word number that unlocks them.
6. Opening a story shows the title and the Bulgarian text paragraph by paragraph. The translation
   in the practice language (Dutch or English; *Mixed* picks one per story) is hidden behind a
   *Show translation* toggle under each paragraph.
7. A story can be marked as read; the list shows which ones are read.

Not proposed: audio, turning story sentences into cards, levels beyond 500, stories in other
tenses than the present (all 15 stay at grammar stage 1, so every learner can open them). Tapping
a word for its meaning is D-027; comprehension questions are D-028.

## Design notes
- **Data**: `data/stories.json`, an array of
  `{id, level, title: {bg, nl, en}, paragraphs: [{bg, nl, en}], words: {form: lemma}, names: [],
  extra: {lemma: {nl, en}}, grammar: [], questions: [...]}`.
  `words` maps every Bulgarian word form in the title and text (lower case) to its dictionary form
  as written in `words.json`, which makes the vocabulary check exact (every running word is
  checked, not just a hand-written lemma list) and gives D-027 its lookup. `extra` holds the
  glossed words above the level, with their meaning.
- **Validator** `tools/validate_stories.py words.json in.json … -o data/stories.json`: splits each
  text into words (hyphens split, so `по-голям` is `по` + `голям`); every word must be a name, one
  of the free function words (`FREE` in `validate_sentences.py`), or in `words`; every lemma must
  resolve to a rank (reusing `build_index` / `resolve_lemma`) or be in `extra`; a resolved rank
  above the level is an error unless the lemma is in `extra`; glossed words at most 3 % of the
  running words; grammar tags within stage 1. It writes `max_rank`, `stage` and `word_count` and
  prints per story the word count, the highest rank and the glossed share.
- **Writing brief** `tools/STORY_BRIEF.md`: the vocabulary and correctness rules of
  `SENTENCE_BRIEF.md`, faithful Dutch and English translations per paragraph, the cast, the
  schema, the gloss rule, and length: about 80–120 words at level 100 rising to 200–280 at 500.
- **Build**: `tools/build_data.py` adds `stories` to `window.TRAKIA_DATA`; `Story` in
  `types.d.ts`.
- **Eligibility**: `C.storyEligible(story, settings)`: `level <= rank + tolerance` and
  `C.grammarOk(story, settings)`.
- **UI**: `#tab-reading` with a list grouped by level and a reader view (title, paragraphs with a
  per-paragraph toggle, glossed words underlined with a "New words" line, *Mark as read*, *Back to
  stories*). The phone tab bar (D-015) gets a sixth button; six labels fit at 360 px at the
  current 11 px.
- **State**: `trakia.reading` = `{storyId: {read?: ts, quiz?: {at, score, total}}}`, added to the
  D-025 snapshot: per story the record with the newer timestamp wins; *Reset all progress* clears
  it.
- Bump `CACHE_VERSION`.

## Acceptance criteria
- `data/stories.json` holds 15 stories, 3 at each level 100–500, and `validate_stories.py`
  reports no errors (no unglossed word above the level, glossed share ≤ 3 %).
- At Anki position 102 the tab offers the three level-100 stories and lists 200–500 as locked; at
  500 all fifteen are open.
- A paragraph's translation appears only on request, in the practice language.
- Read marks survive a reload and travel with sync.
- `test_core.js` covers `storyEligible` and the tokenizer; the UI smoke test opens a story, shows a
  translation and marks it read. `npm test` and `check_decisions.py` pass.

## Effort and risks
About two evenings. Level 100 is a very small vocabulary (mostly function words and a few nouns
and verbs), so those stories are short and simple; the gloss rule eases this but does not remove
it. Bulgarian quality: stories are written by agents under the brief and checked by the validator
(vocabulary) and a review read (grammar, naturalness); the learner reports anything odd.

## As built
- Built as proposed; not yet committed. 15 stories in `data/stories.json` (3 per level), written
  by five agents under `tools/STORY_BRIEF.md`, each checked by `tools/validate_stories.py` and
  read once more by me; one line in R300b reworded ("пералнята вече не работи").
- `core.js`: `storyTokens`, `storyKey`, `storyEligible`, reading merge in `mergeSnapshots`.
  `ui.js`: the reading section (`renderReading`, `openStory`, `closeStory`, `storyHtml`), state
  `reading` in the snapshot, cleared by *Reset all progress*. `index.html`: nav button after
  *Practise*, `#tab-reading`, styles. `build_data.py` bundles the stories (data.js +~110 KB).
- Tests: tokenizer, eligibility, reading merge and "every word can be looked up" in
  `test_core.js`; the smoke test opens a level-100 story at word 150, checks that level 200 is
  locked, shows a translation, taps a word, answers the questions and finds the read mark and
  the Stats card.

### Decisions taken
- Ideas #1 (glossed words) and #4 (recurring cast) went into this record, as rules of the brief
  and the validator; #2 and #3 became D-027 and D-028.
- Every story is grammar stage 1 (present tense and да-clauses), so every learner can open the
  levels their vocabulary allows. The brief's `Заповядайте` (a fixed deck phrase) is accepted
  although it is formally an imperative.
- A form with two meanings in one story maps to the one it has most often there (`сестра` in
  R400a means sister, also inside `медицинска сестра`).

### Measurements
- 2026-10-26: 96–109 words at level 100, 127–134 at 200, 163–199 at 300, 201–237 at 400,
  210–225 at 500. Glossed words 0–2.0 % per story (кола, пръстен, страх, магазин, черпя, …).

## Open questions
- Read the story aloud with the browser's Bulgarian voice, together with D-005?
- Offer story sentences as practice cards (*Add to practice*), so reading feeds the typing
  trainer?
- Continue past 500 in steps of 100 as the learner advances in Anki, and add stories in later
  grammar stages?
