# D-042: Pause new words on word reviews only, pause new sentences on sentence reviews, and show which is paused

Status: in progress · Created: 2026-10-30 · Area: scheduling (`core.js`: `dayLoad`, `wordQueue`, `sentenceLoad`, `buildSession`), practise home (`ui.js`: `renderHome`, `renderWordsButton`; `index.html`: the task cards), settings

## Context
Since D-035 one daily limit (150) covers words and sentences: new words pause while today's word
and sentence reviews together reach it. New sentences never pause; only `newPerSession` caps them.
On 2026-10-30 the learner had 219 reviews due, words and sentences together, and new words paused.
Sentences move more slowly than words, so the sentence pile held back the words.

That is the wrong way round. A sentence unlocks only when all its words are within the learner's
position, so words lead and sentences follow. Words should not wait for sentences. Sentences may
wait for their own pile.

## Proposal
1. **New words pause on word reviews only.** The setting *Daily word reviews limit* (`dailyMax`,
   default 150) counts word cards due today, done or not. Sentence reviews no longer count.
2. **New sentences pause on sentence reviews.** A new setting *Daily sentence reviews limit*
   (`sentenceMax`, default 100, shared) counts sentence cards due today, done or not. At or above it,
   a session holds no new sentence cards; reviews still come. A session with nothing due becomes
   free practice, as today.
3. **The Practise home shows which is paused.** A paused task card (Sentences, Words or both) gets:
   - a grey dashed line along its left edge;
   - its *new* number greyed and struck through, labelled *paused*; hovering it shows the numbers
     ("New sentences paused: 112 sentence reviews today, limit 100.").
   No line of text: the card stays as calm as an active one. The note under the two cards goes.
4. The end screen of a words run says why new words paused, with the word numbers.

Not proposed: a cap on reviews, a total limit over words and sentences, pausing sentences because
of the word pile.

## Design notes
- `C.dayLoad(progress, now)` → `{ reviews, newWords }` counts word cards only (`w:` keys). Rename
  nothing else; `wordQueue` keeps `paused: 'limit'`.
- `C.sentenceLoad(sentences, progress, settings, now)` (pure) → `{ reviews }`: the cards of
  `cardKeys` per sentence (the cards the learner practises in their language) due before the end
  of today or answered today, not first answered today. Cards of another language do not count.
- `buildSession` takes the pause from `sentenceLoad` and `settings.sentenceMax` (default 100): new
  slots become 0. It returns `paused` and `load`.
- `renderHome`, `renderWordsButton`: `.task.paused` on the card; the *new* tile gets `.off` and the
  reason as its `title`. The *Practise* button says *Free practice* when nothing is
  due and new sentences are paused.
- Settings: the field *Daily reviews limit* becomes *Daily word reviews limit*; a field *Daily
  sentence reviews limit* joins it, with one help line for both.

## Acceptance criteria
- Unit tests: sentence reviews no longer pause new words; word reviews at the limit do;
  `sentenceLoad` counts only the practised cards due today; `buildSession` holds no new cards at
  `sentenceMax` and still holds the reviews.
- Smoke test: with sentence reviews above the limit, the Sentences card has the dashed edge class
  and a greyed *new* with the reason as its tooltip; the Words card does not.
- On the phone: the paused card is clear at a glance, in light and dark mode.
- `npm test` passes.

## Effort and risks
About an hour. Risk: without a total limit the daily work can grow; the sentence pause stops new
sentences, and the learner sees both piles on the home. Risk: 100 is a guess; the setting changes it.

## As built
Built and published; the check on the learner's phone is still to come.
- `core.js`: `reviewToday`; `dayLoad` counts word cards only; `sentenceLoad`; `buildSession` holds
  no new cards at `sentenceMax` and returns `paused`, `load`, `sentenceMax`; `wordQueue` returns
  `held`. `types.d.ts`: `sentenceMax`.
- `ui.js`: `showPause` marks a task card; `taskNums` greys the *new* tile; `renderHome` and
  `renderWordsButton` use them; the setting `sentenceMax` (default 100).
- `index.html`: the dashed edge and the greyed tile; the two settings with one help line.
- Checked at 375 px (dark) and 1100 px (light) with both cards paused.

### Decisions taken
- A paused card's *new* tile shows the new cards held back today, struck through: for sentences
  the unseen cards, for words the words still allowed today (`held`), not Anki's 0.
- A card shows as paused only while new cards wait: a sentence pile over the limit with no unseen
  sentence shows no pause.
- 2026-10-30, after the learner's look on the phone: the line of text under the numbers ("New
  sentences paused: 109 sentence reviews today, limit 100.") read as too busy and went; the
  numbers moved to the tooltip of the greyed tile. The end screen of a words run keeps its sentence.

## Open questions
- Is 100 the right default for the sentence limit?
