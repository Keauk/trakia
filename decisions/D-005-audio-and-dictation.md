# D-005: Hear every sentence, word and story in two natural Bulgarian voices, and add a dictation mode

Status: done (2026-10-27) · Created: 2026-10-21 · Area: data pipeline (`tools/build_audio.py`, `data/audio.json`, `data/cast.json`, `app/audio/`), `app/sw.js`, practise UI (`renderCard`, `showFeedback`, word card), reading UI (`openStory`), `core.js` (dictation direction)

## Context
Practice is reading and typing only. That builds a silent vocabulary: the learner may know a
sentence on paper and still not recognise it when spoken. Recognising a word by ear is a separate
skill, and Bulgarian stress is free and unwritten (*па́ра* steam, *пари́* money; *лъжа́* a lie,
*лъ́жа* I deceive), so it can only be learned by hearing it.

The first version of this record used the device's own voice (Web Speech API). Tested on
2026-10-27, that route is dropped:
- Device voices differ per device. Apple's Daria exists only on Mac and iPhone and sounds dated;
  Android's Google voice is not guaranteed; the learner uses Android, Mac and others and wants the
  same sound everywhere.
- Free voices compared by ear on the same 7 sentences: Microsoft's neural voices **Kalina**
  (female) and **Borislav** (male) were "the best by far" in the learner's judgement. Piper's open
  voice Dimitar put the stress on the wrong syllable in 6 of 17 test words (пари, парата, кафе,
  книгата, къде, градината). Google's Chirp 3 HD voices need a billing account.

Hearing a word from **more than one speaker** helps: in L2 vocabulary studies, words learned from
several talkers were recognised and produced better than words learned from one (Barcroft &
Sommers 2005; Sommers & Barcroft 2007). With two voices the app can vary the speaker on purpose.

## Proposal
Built in three phases; each is usable on its own.

**A. The audio corpus (generated once, served as files).**
1. Every practice sentence (`bg`, not the alternatives) and every deck word (`bg`) is spoken by
   **both** Kalina and Borislav.
2. Every story is spoken with **Kalina as the narrator** and for female characters, and
   **Borislav for every line a male character says**, the boy Petar included; both voices are
   used as they are, with no pitch change. Each quoted line in `stories.json` records who says it;
   a cast table records each character's gender.
3. The clips are generated on the laptop by a tool, stored in the repository as mp3 files and
   published with the app. No account, key or service is needed at run time; the app works the
   same on every device and offline.

**B. Listening in the app.**
4. A speaker button next to every Bulgarian text: the prompt (BG → NL/EN), the expected answer
   after a reveal (NL/EN → BG), the word card (tap-a-word, sneak peek) and each story.
5. *Auto-play* (default on): BG → NL/EN prompts play when the card appears; the expected
   Bulgarian plays on reveal.
6. **Voice variety**: each card plays in a random voice; each replay switches to the other voice,
   so the learner hears both. Setting *Voices*: Both (default), Kalina only, Borislav only.
7. Setting *Speed*: Normal (default) or Slow (0.8×, pitch kept).
8. Stories: *Listen* reads the story clip by clip and highlights **each word as it is spoken**;
   pause and resume; a speaker under each paragraph plays from that paragraph.
9. Settings: *Download all audio for offline use* (about 200 MB, with progress) and *Remove
   downloaded audio*. Without it, clips are kept as they are played, and a session's clips are
   fetched when the session starts.

**C. Dictation.**
10. A `listen` direction: the prompt is audio only, in a random voice, with replay (switching
    voice) and a *Meaning* button that shows the Dutch/English translation as a hint; the learner
    types the Bulgarian. It is checked with the Bulgarian rules, against the sentence heard only.
    Setting *Dictation* (default on, shared between devices).
11. Dictation **takes over from reading, it does not add a card**: once a sentence's BG → NL/EN
    card is mature (stability ≥ 21 days) and its NL/EN → BG card was answered correctly once,
    the `listen` card is unlocked; from its first answer the BG → NL/EN card retires (no longer
    scheduled, history kept). Only with both directions on: dictation is typed in Bulgarian.
    The reading card comes back only if the `listen` card lapses twice, as in D-004's retirement
    rule. The review load stays the same, and the easiest card becomes a harder one.
12. **Sound off** (a toggle in the top bar, per device): for places without headphones. Nothing
    plays, the speaker buttons hide, and a sentence in its dictation phase is served as its
    reading card (Bulgarian text → NL/EN) instead.
13. **Show text** on a dictation card: the same switch for one card, when listening is not
    possible right now.
    In both cases the answer counts for the reading card's own schedule; the `listen` card stays
    due until there is sound again, so reading reviews never count as listening.

Not proposed: audio for the alternative answers (`bg_alt`), Dutch or English audio, a separate
slow recording, recording the learner's own voice, pitch-changed voices for children, clips of the
deck's example sentences (`sentence_bg`), word-by-word highlighting outside the stories.

## Design notes
**Generation: `tools/build_audio.py`** (Python, new dependency `edge-tts`, installed with pip).
- Voices `bg-BG-KalinaNeural` and `bg-BG-BorislavNeural`, default rate and pitch. Output as the
  service delivers it: mp3, 24 kHz, 48 kbps, mono. No re-encoding, so no ffmpeg.
- Reads `words.json`, `sentences.json`, `stories.json`, `cast.json`, `audio_overrides.json`;
  generates only the clips that are missing; resumable after an interruption; at most 4 requests
  at a time, with retries and back-off. `--prune` deletes clips that no item uses any more.
- Fallback: if `edge-tts` stops working, the same two voices come from Azure Speech's free tier
  (500,000 characters a month, one full generation is about 238,000) in the same mp3 format. The
  Azure key is read from the environment variable `AZURE_SPEECH_KEY` only, never written to the
  repository, the manifest or a log.

**Storage.**
- File name = the first 12 hex digits of SHA-256 of the spoken text (NFC, trimmed). Path:
  `app/audio/<voice>/<first 2 digits>/<key>.mp3`, `voice` = `kalina` or `borislav`. The same
  text gives the same file, so editing a sentence only creates one new clip per voice.
- `data/audio.json` (manifest): per clip its voice, text, duration in ms, engine and date.
- `data/audio_overrides.json`: spoken text that differs from the written text, by item: words by
  rank, sentences by id. For a word or sentence the learner reports as read wrongly, with a
  respelling; a stress mark does not help (see *Measurements*).
- `build_data.py` adds the key to each item in `data.js`: `au` on sentences and words; on story
  paragraphs a list of segments `[from, to, voice, key]` (character offsets in `bg`). About
  +120 KB before compression.
- Stays in this repository: `publish.sh` publishes `app/` as it is, and clips change only when a
  text changes, so the history grows slowly. Considered: a separate repository `trakia-audio` on
  GitHub Pages (same origin `keauk.github.io`), which keeps clones small; it is the move to make if
  the audio is ever regenerated as a whole.

**Stories.**
- `data/cast.json`: name → `m` or `f`, for every speaker (Иван, Петър, дядо Георги, господин
  Стоянов, Николай, Стефан, съседът, зъболекарят, a waiter …; Мария, Ана, баба Елена, Нина …).
- Each paragraph gets `speakers`: one name per „…“ quote, in order. Of the 121 quotes, about 60
  name the speaker next to them (`казва Петър`); a helper proposes the rest from `той`/`тя` and
  the previous speaker, and every proposal is checked by hand.
- Segments: each quote is one clip in its speaker's voice; narration is one clip per sentence in
  Kalina. The speech tag (`казва той`) is narration.
- Word timings: story clips are generated with `edge-tts`' word boundaries (`WordBoundary`), and
  the manifest keeps each word's start in ms and its character offset. `build_data.py` adds them to
  the story segments in `data.js` (about 2,600 words, a few KB). During playback the word whose
  start has passed (`timeupdate` and `requestAnimationFrame`) is highlighted. A segment without
  timings falls back to highlighting the whole segment.
- `validate_stories.py`: every quote has a speaker, every speaker is in the cast.
  `STORY_BRIEF.md` asks writers for `speakers` in new stories.

**Checks (`npm run check`, no network).** Every sentence, word and story segment has its clip
in each required voice; every file in the manifest exists; no clip is unused (fix: `--prune`).

**Service worker.**
- Clips stay out of `SHELL`, so `stamp_cache.py` and the shell cache are unaffected.
- They go into their own cache `trakia-audio`. `activate` must keep that cache: today it deletes
  every cache except `CACHE_VERSION`. The fetch handler must not put `/audio/` responses in the
  versioned cache: today it caches every same-origin GET there, so all audio would be fetched
  again after each release.
- The app plays a clip by fetching it and playing a Blob URL, not by setting `audio.src` to the
  file. Safari asks for byte ranges for media, and a service worker cannot answer a range request
  from a cached full response without extra code.
- *Download all*: fetches every clip into `trakia-audio` and asks for persistent storage
  (`navigator.storage.persist()`).

**UI.** Replay keyboard shortcut: chosen during the build. It must not clash with typing or with
switching keyboard layouts (Ctrl+Space on macOS). Settings for voices and speed are device
settings (`DEVICE_SETTINGS`, D-025). The dictation direction joins `cardKeys` and `buildSession`
behind a setting; Stats and the Library show it with a 🎧 badge. Retirement of the BG → NL/EN
card is a state on its progress record (`retired: true`), set and cleared by `core.js` after each
answer, so it syncs (D-025) like the rest of the progress. A retired reading card is eligible
again while *Sound off* is on, or for the one card after *Show text*; the sound setting is a
device setting (`DEVICE_SETTINGS`).

**Types and tests.** `AudioRef` and the segment tuple in `types.d.ts`. The headless UI test stubs
`fetch` for `/audio/` and `HTMLAudioElement.play`.

## Acceptance criteria
- Phase A: `tools/build_audio.py` produces every clip; a second run generates nothing.
  `npm run check` fails, naming the fix, when a clip is missing or unused or a story quote has no
  speaker. The learner listens to 30 random sentences, the one-letter words, the duplicate words
  and every story with dialogue, and reports no wrong voice or wrong stress that has no override.
- Phase B: on Android (Chrome) and Mac (Safari and Chrome), prompts play automatically; replay
  switches the voice; a story plays from start to end with Borislav for male lines only. After
  *Download all*, everything plays in airplane mode, and audio is not downloaded again after a new
  release. The smoke test covers auto-play, the voice switch, story segment order and voices.
- Phase B: in a story with dialogue the highlighted word follows the voice within a word or two,
  on the phone and the laptop.
- Phase C: the dictation card appears when the BG → NL/EN card is mature, which then retires; two
  lapses of the dictation card bring it back. It plays audio only and is checked like NL/EN → BG.
  Unit tests for `cardKeys`, `buildSession` and the retirement rule.
- No secret in the repository, the manifest, `data.js` or the published site.
- `npm test` and `check_decisions.py` pass.

## Effort and risks
Size, estimated from the 14 sample clips (48 kbps; about 4.8 KB + 0.64 KB per character):
sentences 2,656 × 2 voices ≈ 143 MB, words 2,952 × 2 ≈ 54 MB, stories ≈ 11 MB: **about 200 MB**
and 11,800 clips, about 238,000 characters. Generation: about an hour unattended (to measure).
Effort: phase A one evening plus annotating 121 quotes; phase B two evenings; phase C one evening.

Risks:
- `edge-tts` uses Edge's read-aloud service unofficially and can stop working or be throttled.
  Mitigation: resumable runs, at most 4 requests at a time, the Azure fallback with the same
  voices. Once generated, the clips do not depend on the service.
- A wrong stress or a wrong reading of a lone word. Mitigation: the listening check, the overrides
  file; whether the voices honour a written stress mark (U+0301) is tested in phase A.
- Petar is a child but speaks with Borislav's adult voice: accepted, because a pitch-shifted voice
  distorts exactly the sounds the learner is copying.
- Word timings: if `edge-tts` returns no word boundaries for Bulgarian, the story highlight stays
  per segment; checked on the first story in phase A.
- 200 MB in every clone and CI checkout; GitHub Pages allows 1 GB per site.
- Mobile data: *Download all* is a deliberate choice in Settings, never automatic.
- D-004 (proposed) also retires the reading card, when the production card is known. If both are
  built, one rule must decide: a reading card that D-004 retires hands over to dictation.

## As built
All three phases built: A and B in fd0c206, C (dictation, items 10–13) in the commit that closes
this record.
- Phase A: `tools/audio_lib.py` (which clips exist: keys, story segments, voices),
  `tools/build_audio.py` (generation with `edge-tts` 7.3.1 from `.venv`, `--check`, `--prune`,
  `--only`, `--limit`), `tools/requirements-audio.txt`, `data/cast.json` (17 speakers),
  `speakers` on every story paragraph with quotes (121 lines), the speaker rule in
  `validate_stories.py` and `STORY_BRIEF.md`, `data/audio_overrides.json` (empty, see below),
  `data/audio.json`, `app/audio/`. `build_data.py` writes `au` on sentences and words and the
  segments on story titles and paragraphs. `npm run check` runs `build_audio.py --check`.
- Phase B: `ui.js` audio section (`playClip`, `stopAudio`, the practise card's speaker with
  auto-play and voice switch, Alt+R, session prefetch, `[data-au]` buttons on the word card and in
  the sneak peek, the story reader with word highlight, the sound switch, *Download all audio*);
  `index.html`: speaker buttons, the sound switch in both top bars, *Listen* on a story, the
  *Sound* card in Settings; `sw.js`: the `trakia-audio` cache; `core.js`: `sound`, `autoplay`,
  `voices`, `speed` are device settings. The smoke test fakes media playback and checks auto-play,
  the voice switch, sound off, a full story in the right voices and order, word offsets, and the
  word card.
- Phase C: `core.js`: the `listen` direction in `parseKey`, `acceptedFor` (only `bg`) and
  `cardKeys` (the hand-over rule, `LISTEN_AFTER` = 21 days); `ui.js`: the dictation card (hidden
  prompt, *Listen again*, *Meaning*, *Show text*, no new-word chips), the switch to the reading
  card on *Show text* and on *Sound off*, the 🎧 → BG badge, dictation on the Stats tab and in the
  Library; `index.html`: `#listen-box`, the *Dictation* setting. Unit tests for the hand-over rule
  (mature reading card, production card right once, sound off, setting off, no clip, two lapses,
  one card per sentence in a session); the smoke test answers a dictation card, uses *Meaning*,
  *Show text* and *Sound off*, and checks which card the answer counted for.

### Decisions taken
- The reading card retires at the dictation card's first answer, not at the unlock: a dictation
  card starts as a new card, drawn a few per session, so retiring at the unlock would leave every
  newly unlocked sentence without any review until its dictation card came up.
- No dictation with *Out of Bulgarian only*: old progress could otherwise unlock a card that is
  typed in Bulgarian, which that setting opts out of.
- The Library's reading column shows the dictation card (🎧) once it has taken over.
- Retirement is not stored: `cardKeys` derives it from the progress records (a dictation card
  exists and has lapsed fewer than two times), so there is no `retired` flag to sync or to get out
  of step. The planned `retired: true` field was dropped.
- The hint is a *Meaning* button the learner can press at any time, instead of appearing after a
  first wrong attempt: a second attempt on the same card would need a new answer flow, and the
  learner decides best when they need the meaning.
- A dictation card accepts only the sentence that was heard, not the other translations in
  `bg_alt`, which the voice did not say.
- The manifest keeps per clip only its length in ms, its source (`edge-tts 7.3.1`) and, for story
  clips, the word timings: the text is already in the data files (the key is its hash) and git
  keeps the date.
- A story plays from a paragraph's own speaker button, not by tapping a sentence: a tap on a word
  already opens its word card.
- Clips are stored once per text: a sentence and a story segment with the same text share a clip,
  and so do the two `лъжа` and the other duplicate words until an override separates them.
- Narration is cut into sentences only before a capital letter, so "и… ключа" stays one part;
  the speech tag after a quote (`казва Петър.`) is a part of its own in Kalina's voice.
- The first tap anywhere plays a moment of silence on the one shared audio element, so Safari
  allows it to play later clips that arrive after a fetch.

### Measurements
- 2026-10-27: 11,620 clips (2,947 words and 2,656 sentences in both voices, 357 story parts by
  Kalina and 57 by Borislav), 236,750 characters. Word timings came back for every word of the
  first 30 story clips; the service joins hyphenated words (по-добре) into one, which the highlight
  handles.
- Listening check by the learner, 2026-10-27: the one-letter words в, с, а, и sound right on
  their own in both voices, so they need no override (the planned в → във and с → със were
  dropped). A written stress mark changes the clip but not the stress: лъжа, лъ́жа and лъжа́
  sound the same, so overrides cannot tell homographs apart; the noun and the verb лъжа share
  one clip, an accepted flaw. The overrides file stays for respellings, should a word ever be
  read wrongly.
- Generation, 2026-10-27: 11,620 clips, 187 MB in `app/audio/`, manifest 740 KB, all with zero
  failures. About 200 clips a minute with 4 requests at a time, so about an hour of running time
  (spread over three hours, as the laptop slept twice); after waking it ran at about 60 a minute.
  After the second sleep the run hung on dropped connections; `build_audio.py` now gives each clip
  60 seconds before retrying, and a rerun made the 12 missing clips. Every story part has word
  timings. `app/data.js` grew from 3,206 KB to 3,364 KB with the keys, segments and timings.
- In Chrome at phone width, story R100b played part by part with the highlight following the voice
  word by word (Иван, Ана, Петър, вратата, апартамента, …).

## Open questions
- ~~Should Petar (a child) speak with Borislav at a raised pitch, or with Kalina?~~ Borislav,
  unchanged. A raised pitch makes the voice sound artificial and bends the vowels and stress the
  learner should copy; Kalina would make his lines sound like the narrator and break the rule
  "male lines are Borislav". Ana is a child too and speaks with Kalina's adult voice.
- ~~Should a word clip also have the deck's example sentence (`sentence_bg`)?~~ No. The practice
  sentences and stories already give every word spoken context; the example sentences would add
  about 140 MB for something Anki shows already.
- ~~Should dictation replace BG → NL/EN for mature sentences instead of adding a third card?~~
  Replace (Proposal item 11). A mature reading card adds little; dictation is the harder version
  of the same recognition, and the number of reviews stays the same.
- ~~Word-by-word highlighting in stories, from the word timings that `edge-tts` can return?~~ Yes,
  for the stories (Proposal item 8). Reading while listening works best when eye and ear stay
  together, and the timings come for free when the clips are made; they are captured in phase A
  so nothing needs generating again. Not for single sentences, which are short enough to follow.
