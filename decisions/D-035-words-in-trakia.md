# D-035: Learn the deck's words in Trakia: word cards on the same FSRS schedule, one daily limit, the Anki position kept up to date

Status: accepted · Created: 2026-10-28 · Area: practise (`ui.js`: the words run; `index.html`: `#words-run`, button on the Practise home), scheduling (`core.js`: `wordQueue`, `wordRank`, `gradeWord`, `seedWords`, `parseKey`), settings (the Anki position), stats, tooling (`tools/anki_progress.py`)

## Context
The learner studies the 2,952 words of the Anki deck *Bulgarian 2952 (mixed)* in Anki and the
sentences built on them in Trakia. Two apps cause three problems:
- **No shared daily limit.** On 2026-10-28 Anki showed 20 new, 12 learning and 180 reviews due,
  on top of Trakia's sentences. The learner had to find and lower Anki's new-card limit by hand.
- **The Anki position is typed in by hand** (Settings), so sentences and stories unlock late or
  early.
- **Progress and stats are split** over two apps.

What the app already has: the same scheduler as Anki (FSRS-6, D-001, with Anki's default
parameters and 90 % desired retention); all 2,952 words with meaning, forms, part of speech and an
example sentence (`data/words.json`); every word in two voices (D-005); sync between devices
(D-025).

The learner's Anki collection (read on 2026-10-28, read only):
- 2,952 notes, 5,904 cards: one Bulgarian → English and one English → Bulgarian card per word.
- 243 words started (ranks 1–243); 460 cards no longer new.
- 431 cards carry Anki's FSRS state (stability, difficulty, last review time), with the default
  parameters (decay 0.154) and desired retention 0.9.

The learner wants the switch to be immediate: no import step, and their progress as it is in Anki.

## Proposal
1. **Words on the Practise home.** A *Words* button shows today's counts as Anki does: new (blue),
   learning (red), due (green). It starts a run of word cards:
   - Bulgarian → English: the Bulgarian word, spoken (D-005 voices, sound permitting).
   - English → Bulgarian: the English meaning.
   - Tap, Space or Enter shows the back: the other side, the forms, the part of speech and the
     deck's example sentence (Bulgarian and English), with a play button for the word.
   - The learner grades with *Again*, *Hard*, *Good*, *Easy* (keys 1–4); each button shows its next
     interval. Scheduling is FSRS-6, the same as the sentences.
   - Failed and learning cards come back in the same run when due (the 10-minute step of D-024).
     The run ends when nothing is left for today.
2. **New words in deck order.** A new word starts with its Bulgarian → English card; its English →
   Bulgarian card joins from the next day (Anki's "bury siblings").
3. **One daily limit for words and sentences.** Settings (shared, synced):
   - *New words per day*: default 10.
   - *Daily reviews limit*: default 150. New words are offered only while today's reviews (word and
     sentence cards due today, done or not) are below it. Reviews themselves are never capped: a
     capped review only moves the pile to later. The Words button says so when new words pause.
4. **The Anki position follows the words.** Once any word card exists, the position is the highest
   rank R such that every word up to R has been started. Settings shows it read-only, and
   sentences, stories and the sneak peek (D-031) follow it without manual input.
5. **Starting point, no import in the app:**
   - **This learner**: their Anki progress (every started card with its real schedule) is merged into
     their sync gist (D-025) once, by the developer, with the tool below. Every device picks it up
     at its next sync; the learner does nothing and stops using Anki from then on.
   - **A new learner**: the first time *Words* opens without any word progress, it asks where to
     start: "Words 1–N count as known" (N defaults to the Anki position; 0 starts from the first
     word). The known words get review cards spread over the coming weeks, so day one is not a
     pile of reviews.
   - **Another Anki user** can run the tool on their own collection and use *Import progress*.
6. **Stats tab**: a words line (started, to go, due now, reviewed today, predicted recall).

Not proposed: sending progress back to Anki; typing the answer on word cards; Dutch meanings for
the words (open question); a failed word in a sentence pulling its word card forward (open
question); audio for the deck's example sentences (open question); words beyond the deck's 2,952.

## Design notes
- **Card keys**: `w:<rank>|bg2en` and `w:<rank>|en2bg`. `parseKey` adds `word: true` and `rank` for
  an id `w:<digits>`. Sentence ids never contain a colon: bundled ids are letters and digits,
  `hashId` gives `u…`, and `rowToSentence` replaces a colon in an imported id. Word records are
  ordinary `ProgressRecord`s in `progress`, so export, gist sync, `mergeSnapshots` (newest `last`
  wins) and history compaction (D-029) carry them unchanged. Word answers go into `log`
  (Again 0, Hard 1, Good and Easy 2), so the chart and "answers today" include them.
- **Pure functions in `core.js`**:
  - `gradeWord(p, rating, now, settings, rand)`: `fsrsReview` with the rating (1–4) as given; sets
    `first`, `reps`, `lapses` (Again on a review card), `box`, `rating`, like `applyResult`.
  - `dayLoad(progress, now)`: reviews today = records not first answered today whose `due` falls
    before the end of today or whose `last` falls within it; new words today = `w:*|bg2en` records
    first answered today.
  - `wordQueue(words, progress, settings, now)` → `{ learning, due, fresh, paused }`: learning and
    relearning cards due within 20 minutes (Anki's learn-ahead); review cards due by the end of
    today, oldest due first; fresh cards: English → Bulgarian siblings of words started before
    today, then new words by rank, at most `newWords` − new words today, and none while the
    reviews today reach `dailyMax` (`paused` says why).
  - `wordRank(progress)`: the highest rank R such that every rank 1…R has a word card.
  - `seedWords(words, n, now, settings)`: review records for both cards of words 1…n. Stability
    falls linearly from 45 days (rank 1) to 3 days (rank n); `last` = now − age, with age a fixed
    fraction (0.15–0.95, from the rank) of the interval, so the reviews spread over the coming
    weeks; `reps` 1, `first` unset (not young).
- **UI** (`ui.js`): the run picks the next card from `wordQueue` after every grade (learning due
  now, then reviews and new cards mixed: a new card after every four reviews), so a card answered
  Again returns when due. After every first answer, `settings.rank` is set to `wordRank`; this also
  runs at load and after a sync. The Settings slider and number field are disabled while word cards
  exist. Settings `newWords` (10) and `dailyMax` (150) are shared settings.
- **The tool** `tools/anki_progress.py [collection.anki2 | deck.apkg] [out]`:
  - Reads a copy of the collection (with its `-wal` file), read only. Takes the deck's notes; the
    Rank field (index 6) gives the rank. Card `ord` 0 is Bulgarian → English and `ord` 1 English →
    Bulgarian; the tool checks this against the template names.
  - Per card that is not new: `s`, `d` from the card's FSRS data; `last` = `lrt` × 1000; `state`
    from `type` (1 learning, 2 review, 3 relearning); `due` = (collection `crt` + `due` days) × 1000
    for review cards and `due` seconds × 1000 for learning cards; `reps`, `lapses` from the card.
    Cards without FSRS data become learning cards, due now.
  - Writes a progress snapshot (`app: 'trakia'`, `progress` only) to a path outside the
    repository, `~/Downloads/trakia-anki-progress.json` by default; **it refuses a path inside the
    repository**: the file holds a person's review history, and the repository is public.
    `.gitignore` gains `*anki-progress*`.
  - Merging into the learner's gist is a one-off by the developer with `C.mergeSnapshots` and the
    `gh` login, after a backup of the gist; no token or progress is written to the repository.

## Acceptance criteria
- Unit tests: `parseKey` for word keys; `gradeWord`; `dayLoad`; `wordQueue` (deck order, the
  sibling the next day, the `newWords` limit, new words pause at `dailyMax`, learning before
  reviews); `wordRank` (a gap stops it); `seedWords` (both cards, spread due dates, none due
  today in bulk); no bundled sentence id contains a colon.
- A test for the tool on a small fake collection built in the test (no real data): the card fields
  map to the expected records, and it refuses an output path inside the repository.
- Smoke test: the Words start screen seeds words; a words run shows a card, flips it, grades it,
  and the record, the log and the Anki position change; the Practise home shows the counts.
- On the learner's devices: after the merge, Trakia's words due today match Anki's due count
  within a few cards; the position shows 243; a week of daily use stays under the daily limit.
- `npm test` and `check_decisions.py` pass.

## Effort and risks
About 2–3 evenings.
- **Depends on D-025** (gist sync): after the switch the word history lives in the browser and the
  gist only. Mitigation: a backup of the gist before the merge, and *Export progress*.
- **A wrong mapping** of Anki's fields would reschedule 460 cards. Mitigation: the tool prints the
  count per state and the due count for today, compared with Anki's before the merge; it can be
  merged again (the newest review wins).
- Anki's learning steps differ from Trakia's single 10-minute step; it affects only cards in
  learning on the day of the switch.

## As built
Not started.

## Open questions
- Dutch meanings for the 2,952 words, so Dutch is the practice language for words too? It needs
  2,952 translations written and checked.
- Should a word missed in a sentence (D-030 word maps) pull its word card forward?
- Audio for the deck's example sentences: about 2,950 clips (about 45 MB) in one voice, or both
  voices (about 90 MB)?
- After the deck: continue with the next most frequent words (3,000–5,000) for B2?
