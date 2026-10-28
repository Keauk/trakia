# D-034: Hands-free listening: Dutch, a pause to answer in your head, then the Bulgarian; and Bulgarian in the background

Status: in progress · Created: 2026-10-28 · Area: practise (`ui.js`: the listening player; `index.html`: `#listen-run`, button on the Practise home; `core.js`: `listenItems`), audio pipeline (`tools/audio_lib.py`: Dutch prompt clips)

## Context
All practice in the app needs the eyes and the hands: reading, typing, tapping. The learner wants
to practise while walking, cycling or doing chores, with the phone in a pocket and the screen off.

What the research supports (looked up 2026-10-28):
- **Retrieval by ear works**: hearing the prompt, recalling the answer in a pause, then hearing it is
  retrieval practice, the mechanism behind flashcards and behind audio courses such as Pimsleur's.
- **Passive listening sharpens the ear, not the vocabulary**: extra exposure to sounds, without a
  task, between short practice sessions improved learning of a new sound distinction about as much
  as twice the practice (Wright et al., Journal of Neuroscience 2010). Background listening without
  practice does not teach new words.
- **Learning during sleep**: replaying words learned that day during deep sleep helps memory
  (Schreiner & Rasch 2015; Hu et al. 2020), but needs the sleep stage known; not proposed here.

D-005 made every Bulgarian sentence available in two voices. Dutch prompts need clips of their own.

## Proposal
1. A **Listen (hands-free)** button on the Practise home opens a player with two modes:
   - **Practice** (default): per sentence, the Dutch in a Dutch voice, a pause in which the learner
     says or thinks the Bulgarian, then the Bulgarian in Kalina's or Borislav's voice, and (setting
     *Repeat*, default on) once more in the other voice. Sentences the learner has seen, weakest
     first; a learner with none gets the easiest eligible ones.
   - **Background**: Bulgarian only, sentences the learner has seen and paragraphs of stories they
     have read, shuffled, both voices, short gaps. Said plainly in the player: it trains the ear,
     not the vocabulary.
2. It keeps playing with the screen off and shows on the lock screen and in the headphones' controls
   (play, pause, next).
3. Settings in the player (per device): *Pause* (Auto, 3, 5 or 8 seconds; Auto grows with the length
   of the sentence), *Repeat*, *Stop after* (10, 20, 30 or 60 minutes, or never; default 20).
4. With the screen on, the player shows the sentence being played: the Dutch, then the Bulgarian
   once it has been spoken.
5. Listening does not change the schedule: nobody grades a thought answer. Minutes listened are
   shown on the Stats tab (today), on this device only.
6. Pressing play turns the sound on (D-005's *Sound off*), since it is an explicit request for sound.

Not proposed: a sleep mode, English prompt clips (generated when the learner practises in English;
until then English sentences play without a prompt), speech input, listening in the background while
another tab of the app is open.

## Design notes
- **Dutch clips**: `audio_lib.py` gains the voice `fenna` (`nl-NL-FennaNeural`, letter `n`); every
  sentence's `nl` gets a clip (about 2,700 clips, 40–50 MB). `build_data.py` writes `au_nl` (the
  key of `nl`) on each sentence. `build_audio.py --check` covers them.
- **Items**: `C.listenItems(sentences, progress, settings, mode, now, rand)` (pure): practice:
  sentences with any progress, eligible, ordered by lowest recall of their cards (`recallNow`),
  or the 30 easiest eligible ones; background: the seen sentences shuffled.
- **Keeping the page alive with the screen off**: a phone suspends a page's timers when nothing
  plays, so every pause is played as silence on the same audio element (a generated WAV of the
  pause length), never as `setTimeout`. Clips are fetched one item ahead.
- **Media Session API**: `navigator.mediaSession.metadata` per item (title: the Bulgarian,
  artist: Trakia) and handlers for play, pause, next track and stop; feature-detected.
- `playClip` is split into `playClip(voice, key)` and `playSrc(url)`, so silences and Dutch clips
  share the player, the stop logic and the Safari unlock of D-005.
- Leaving the Practise tab stops the player (as other audio stops, D-005).
- Settings `listenMode`, `listenPause`, `listenRepeat`, `listenLimit` are device settings; minutes
  per day in `trakia.listened` (not synced).

## Acceptance criteria
- Unit tests for `listenItems` (seen sentences weakest first, the fallback, background shuffle).
- Smoke test with the media stub: practice plays Dutch, silence, Bulgarian, silence, the other
  voice, in that order; background plays Bulgarian only; Stop and the time limit end it; play turns
  the sound on.
- On the learner's Android phone in Brave: it keeps playing with the screen off, and the lock-screen
  and headphone controls work.
- `build_audio.py --check` passes with the Dutch clips; `npm test` and `check_decisions.py` pass.

## Effort and risks
One evening plus about 15 minutes of generation. Risks: a phone that still suspends the page with
the screen off (mitigated by playing silence; tested on the learner's phone); the repository grows
by about 45 MB.

## As built
Built and published; the screen-off test on the learner's phone is still to come.
- `tools/audio_lib.py`: the voice `fenna` (`nl-NL-FennaNeural`) and a Dutch clip for every
  sentence's `nl` (2,653 clips; three sentences share their Dutch); `build_data.py` writes `au_nl`.
- `core.js`: `listenItems`; `listenMode`, `listenPause`, `listenRepeat`, `listenLimit` are device
  settings. `ui.js`: the player (`lrOpen`, `lrLoop`, `lrSteps`, `lrPlay`, `lrPause`, `lrStop`),
  `silenceUrl` (generated WAVs, cached per 250 ms), the Media Session handlers, *min listened* on the
  Stats tab; `playClip` now calls the new `playSrc`, which also plays data: URLs. `index.html`: the
  *Listen (hands-free)* button and `#listen-run`.
- Tests: a unit test group for `listenItems`; the smoke test plays practice and background with the
  media stub and checks the order of Dutch, silences and both voices, that play turns the sound on,
  Next, the time limit, and the minutes kept.

### Decisions taken
- A button on the Practise home rather than a seventh tab: seven tabs do not fit the phone's
  bottom bar.
- Pause *Auto* is 1.8 s plus 70 ms per character of the Bulgarian, at most 9 s.
- Background mode mixes in the paragraphs of the stories the learner marked as read, played in their
  story voices (Kalina, Borislav for the men).

### Measurements
- 2026-10-28: 2,653 Dutch clips, 57 MB, 0 failed (about 160 clips a minute); the audio folder is now
  244 MB for 14,273 clips. In Chrome at phone width the first practice item played Dutch, the pause
  ("…"), then the Bulgarian, with no errors.

## Open questions
- English prompt clips, if the learner practises in English?
