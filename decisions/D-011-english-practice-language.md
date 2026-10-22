# D-011: English as a second practice language (BG ⇄ EN)

Status: done (2026-10-22) · Created: 2026-10-22 · Area: data (`en`, `en_alt`), `core.js` (directions, normalisation), Settings, Library, import/export

## Context
The app practises Dutch ⇄ Bulgarian only. The Anki deck is Bulgarian ⇄ English, so the learner
already meets every word with an English meaning, and practising sentences in English as well would
align the trainer with the deck and double the ways a sentence can be retrieved. Every sentence
already carries `en`: a full, natural English sentence written alongside the Dutch (checked so far
only for contradicting the Bulgarian, not as an answer to be typed). No sentence has English
alternatives, and the checker has no English-specific leniency (contractions, British/American
spelling).

## Proposal
1. **Data.** Add `en_alt` (1–3 accepted alternatives) to every sentence and review `en` as a primary
   answer: natural, faithful, same tense / number / politeness as the Bulgarian. One agent pass over
   all 2656 sentences in chunks of ~150 (same brief style as the Dutch review, English edition),
   writing patches `{id, en?, en_alt}`; applied with `apply_patches.py` (which gains `en_alt`), kept
   by the validator (pass-through field). The Excel/CSV import gains an `en_alt` column.
2. **Practice language setting**: *Dutch* (default), *English*, or *Mixed*. The chosen language is
   the "other side" in both directions: BG → X (type the X sentence) and X → BG (read X, type
   Bulgarian). With *Mixed*, each new sentence is assigned a language once (alternating, stored in
   the record) so a sentence is practised in one language, not both; the learner can switch at any
   time and already-seen cards keep their language.
3. **Progress per language.** Card keys stay `id|bg2nl` / `id|nl2bg` and gain `id|bg2en` /
   `id|en2bg`. Switching the setting shows the other language's cards; nothing is lost or merged.
   D-004's production gating, the stage filter, FSRS and the almost policy apply unchanged.
4. **Checker.** English normalisation adds: contractions expanded both ways (I'm / I am, don't /
   do not, it's / it is, we'll / we will, can't / cannot …), British and American spellings treated
   as equal for the common pairs (colour/color, favourite/favorite, neighbour/neighbor, travelling/
   traveling, centre/center), and "ok / okay". Accents are irrelevant. Bag-of-words stays Bulgarian-only.
5. **UI.** Direction badges "BG → EN" / "EN → BG"; prompt and answer `lang` attributes; the Library
   shows the selected language under the Bulgarian and lists `en_alt` in the row details; "My answer
   was correct" stores alternatives under the language-specific key; the home summary names the
   language. Export of sentences includes `en_alt` plus user alternatives for both languages.
6. **Tests.** Contraction and spelling equivalence; language-specific keys in `cardKeys` and
   `buildSession`; mixed assignment is stable; the headless test runs one English card each way.

## Design notes
- `settings.lang` ∈ `nl | en | mixed`; `cardKeys(s, progress, settings)` chooses the suffixes from
  the sentence's assigned language (`progress.langOf[id]` for mixed, else the setting).
- `normalise(s, 'en', opt)` applies the contraction and spelling maps after lowercasing; the maps are
  small fixed tables in `core.js`.
- The gating rule (NL→BG after BG→NL) becomes "X→BG after BG→X" for the assigned language.
- Stats: per-direction blocks show both languages when both have cards.

## Decisions taken
- Mixed ships in the first version (a stable split by sentence id, no stored assignment).
- The Library follows the selected language; Stats shows every direction that has cards, plus the
  current language's directions.

## As built (2026-10-22)
- Data: 18 reviewers × ~150 sentences; `en` corrected on 48 sentences (calques, dropped objects,
  reporting-verb tense, register), 5394 alternatives added (2614 sentences have 1–3 `en_alt`, 42 very
  short ones have none because no meaningfully different correct wording exists). Changes listed in
  `data/REVIEW_CHANGES.md`. The validator and `apply_patches.py` carry `en_alt`; the import accepts an
  `en_alt` column; the sentence export includes `en_alt` plus user alternatives for both languages.
- `core.js`: `normalise(s, 'en')` expands contractions (straight and curly apostrophes) and maps the
  common British spellings to American before comparing; `langFor(id, settings)`, `cardKeys` with
  `bg2<lang>` / `<lang>2bg` keys and per-language gating; `parseKey`; `acceptedFor(s, dir)`;
  production-card priority works for either language; `rowToSentence` reads `en_alt`.
- UI: *Practice language* (Dutch / English / Mixed) in Settings; direction badges and prompts follow
  the card's language; the third language is shown as a gloss after answering; the Library shows the
  selected language's sentence and status columns; Stats lists each direction that has cards; progress
  keys are separate per language (Dutch progress untouched when switching, covered by the UI test).
- Bundle: `app/data.js` is now 1.8 MB (the alternatives added ~260 KB); splitting it is still the
  next step before another large batch.

## Acceptance criteria
- Every sentence has 1–3 `en_alt` entries and a reviewed `en`.
- With the setting on English, a full session runs BG → EN and EN → BG with the same verdicts; "I'm"
  and "I am" are both correct; "colour" and "color" are both correct.
- Switching Dutch → English → Dutch keeps both sets of progress intact (test with export/import).
- Imports with an `en_alt` column round-trip through export.

## Effort and risks
Data pass: one agent round (~18 agents × 150 sentences), about an hour of wall-clock. Code: ~120
lines plus tests, one evening. Risk: the English review is model-written like the Dutch; the "My
answer was correct" button remains the correction channel. Mixed mode adds a little complexity; it
can ship after the two plain modes.

## Open questions
- Ship *Mixed* in the first version, or Dutch / English only?
- Should the Stats and Library default to showing both languages, or only the selected one?
