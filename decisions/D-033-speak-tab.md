# D-033: A Speak tab: say the Bulgarian for a Dutch or English word or sentence, checked by speech recognition

Status: rejected (2026-10-28) · Created: 2026-10-27 · Area: new tab (`index.html`: nav, `#tab-speak`; `ui.js`: speak session, recogniser; `core.js`: speak cards, transcript check)

## Context
The app trains reading, typing and (with D-005) listening, but never speaking. Typing a sentence
and saying it are different skills: saying it needs the sounds, the stress and the speed, and a
learner who only types freezes in conversation.

Evidence that speaking aloud is worth practising on its own:
- **Production effect**: words said aloud are remembered better than words read silently
  (MacLeod et al. 2010).
- **Output**: producing the language makes learners notice what they cannot say yet (Swain's
  output hypothesis).
- **Speech recognition as feedback**: learners who practised with a phone's speech recogniser
  improved their pronunciation of a hard sound more than a group without it (Liakin, Cardoso &
  Liakina 2015).
- **Shadowing** (repeating a model speaker right after hearing them) improves listening and the
  rhythm and stress of speech (Hamada 2016).

Not to be confused with D-005's dictation (hear Bulgarian, type it). This record is the other
way round: see Dutch or English, **say** the Bulgarian.

**How to hear the learner** (researched 2026-10-27; the app is static, so there is no server):
- **The browser's speech recognition (Web Speech API, `SpeechRecognition`, `bg-BG`)**: free,
  no key. Chrome on Android and on the laptop and Edge support it; Chrome sends the audio to
  Google's recogniser, so it needs a connection. Firefox has none. Safari has the API, but whether
  it recognises Bulgarian depends on the device's dictation languages, and probably not on an
  iPhone. Chrome can also recognise on the device (`processLocally`), but only for a few large
  languages so far.
- **Whisper in the browser** (open model, runs on the device): Bulgarian needs the larger models
  (hundreds of MB) to be usable, which is too heavy and slow on a phone. Rejected for now.
- **A paid cloud recogniser with a free tier** (Azure: 5 hours a month; Google Cloud: 60 minutes):
  needs a key in the browser, like the gist token (D-025). Azure's pronunciation scoring does not
  list Bulgarian. A fallback only if the browser's recogniser proves too poor.

**What recognition can and cannot judge**: a recogniser writes down the most likely Bulgarian
words. It shows whether the learner *said the right words* clearly enough to be understood, which
is the point of recall. It does not grade pronunciation: a wrong stress usually still gives the
right word. Pronunciation is trained by hearing the model voice (D-005) right after speaking and,
where the device allows, by hearing one's own recording next to it.

## Proposal
1. A **Speak** tab with a session like Practise: the prompt is Dutch or English (the practice
   language setting), the learner taps the microphone button (Space on the laptop) and says the
   Bulgarian. Listening stops by itself after a pause, or with a second tap.
2. Two kinds of cards: **sentences** that the learner has already typed correctly once in NL/EN →
   BG, and **deck words** up to the Anki position (prompt: the deck's English meaning). They are
   scheduled with FSRS like the other cards, as their own cards, so speaking progress is kept apart
   from typing progress. A word card accepts only the form asked for, the deck's dictionary form
   (книга, not книгата).
3. **Result**: *Heard: "…"* (what the recogniser wrote), the verdict (correct, almost, wrong) from
   the same checker as typing, the expected Bulgarian with the differences highlighted, and the
   model sentence played at once in Kalina's or Borislav's voice (D-005).
4. Buttons on the result: **Try again** (does not count, up to 3 tries), **I said it right** (for
   a recogniser mistake; counts as correct, like "My answer was correct"), **Continue**.
5. **Hear yourself**: where the device can record alongside recognition, the learner's own attempt
   can be played back right after the model voice. Recordings stay in memory and are gone after
   the card.
6. **Type instead**: on a device without Bulgarian recognition, without a microphone, or offline,
   the card can be answered by typing; the tab says once why the microphone is missing.
7. **Shadowing**, a second mode of the tab: the sentence plays in Kalina's or Borislav's voice,
   the learner says it straight after, and the recogniser checks it against the sentence. The
   Bulgarian text is hidden by default, with *Show text* for support; *Again* replays the model,
   switching voice. Shadowing uses sentences within the learner's Anki position and grammar stage,
   is not scheduled (it is imitation, not recall) and is counted on the Stats tab. With *Sound off*
   (D-005) the mode is unavailable.
8. **Before building the tab, a test (phase 0)**: a hidden test page where the learner says 30
   known sentences on the phone and the laptop; it records what the recogniser heard and whether the
   checker accepts it. The tab is built only if at least 85 % of correctly said sentences are
   accepted. If not, this record goes back to the choice of recogniser.

Not proposed: scoring pronunciation (no free recogniser does this for Bulgarian), free
conversation, speaking in the Reading tab, storing or uploading recordings.

## Design notes
- **Recogniser**: `window.SpeechRecognition || window.webkitSpeechRecognition`, `lang = 'bg-BG'`,
  `maxAlternatives = 5`, `interimResults = true` (the words appear while speaking),
  `continuous = false`. Every alternative is checked; the best verdict counts. Availability: the
  API exists and a first `start()` does not end in `language-not-supported`; the result is kept
  per device.
- **Checking the transcript**: the typing checker `C.check` against `bg`, `bg_alt` and the
  learner's own accepted answers (a word card: only the deck's `bg`; a shadowing card: only `bg`), with punctuation ignored (recognisers add none or their own) and
  numerals as digits mapped to words (`3` → `три`) before checking. Word order counts as for
  typing (bag of words, D-014).
- **Cards**: keys `<sentence id>|say` and `w<rank>|say`, in `progress` like every card, so they
  sync (D-025). `C.cardKeys` stays for Practise; a `C.speakKeys(sentences, words, progress,
  settings)` gives the Speak tab's cards; `buildSession` is reused with them.
- **Recording own voice**: `getUserMedia` + `MediaRecorder` while recognition runs. Some phones do
  not give the microphone to both at once; phase 0 tests it, and without it the "hear yourself"
  button is left out on that device.
- **Microphone permission**: asked once by the browser (an https page or localhost); a refusal
  switches the tab to typing with a note on how to allow it.
- **Privacy**: with Chrome's recogniser the spoken audio goes to Google, as with Android's voice
  typing. The tab says so once, before the first use. The app itself stores no audio.
- **Phase 0 page**: `app/speak-test.html` (not linked from the app): 30 eligible sentences, a
  microphone button, the transcripts and verdicts, and a button that copies the results as text.
- **Shadowing**: a mode switch at the top of the tab (*Translate* / *Shadow*); a shadowing round is
  10 sentences picked like free practice; the model plays from the D-005 clips with `playClip`;
  results go to a log like the drill log (`speakLog`), synced, not to `progress`.
- Stats: a line for speaking (cards seen, accuracy today, shadowing rounds), like the drills.

## Acceptance criteria
- Phase 0: on the learner's Android phone and Mac, 30 sentences said correctly: at least 85 %
  accepted; the result is recorded under *Measurements*. Below that, the tab is not built.
- The Speak tab runs a session of sentence and word cards; the transcript, the verdict, the
  highlighted differences and the model voice appear after speaking; *Try again*, *I said it right*,
  *Type instead* and *Continue* work, by touch and by keyboard.
- On a browser without Bulgarian recognition the tab offers typing and says why.
- Speaking cards are scheduled, synced and counted on the Stats tab, apart from the typing cards.
- A word card marks an inflected form (книгата for книга) as not the form asked for.
- Shadowing: the model plays, the learner speaks, the transcript is checked against the sentence;
  *Show text* and *Again* work; the mode is hidden with *Sound off*.
- No recording is stored or uploaded by the app; the privacy note is shown before the first use.
- Unit tests for `speakKeys` and the transcript check (digits, punctuation, alternatives); the
  smoke test stubs `SpeechRecognition` with a fixed transcript.
- `npm test` and `check_decisions.py` pass.

## Effort and risks
Phase 0: one evening. The tab: two to three evenings. Depends on D-005 (the model voice).

Risks:
- **Recognition quality for a learner's Bulgarian**: the recogniser may not understand an accent
  and mark a right answer wrong. Mitigation: phase 0 measures it before anything is built;
  alternatives are all checked; *I said it right*.
- **Too forgiving**: the recogniser may "correct" a wrong form into a right one (книга heard as
  книгата). Accepted: the model voice after every card still lets the learner hear the right form.
- **Online only** with Chrome's recogniser: in a tunnel the tab falls back to typing.
- **iPhone**: probably no Bulgarian recognition; the tab then works as typing plus "hear yourself"
  where recording works.
- Chrome may change or limit its free recogniser; the fallback is a cloud recogniser with the
  learner's own key, which would need its own record.

## As built
Rejected on 2026-10-28, after phase 0; nothing of it remains in the app. Phase 0 (a speech test page,
`app/speak-test.html` and `.js`, with `C.speechCandidates` and `C.checkSpoken` and a headless test)
was published in a0b877a and removed again.

### Decisions taken
- The first real test failed: the learner uses Brave, which ships the Web Speech API but blocks its
  recognition results (Brave issue #2802), and Firefox has no recogniser at all. The learner wants
  the app to work in every browser, so the browser's recogniser is out.
- The browser-independent options all had a cost the learner did not want: a cloud recogniser
  (Azure, Google, Groq) needs a key stored in the browser, where any page on `keauk.github.io` or a
  compromised script could read it; Whisper on the device is a 150–250 MB download, slow on a phone
  and weak at Bulgarian; the phone keyboard's voice typing works in any browser but adds a tap per
  card and only on the phone.
- On the device, recording alongside recognition took the microphone from the recogniser
  (`no-speech`), so "hear yourself" would not have worked during recognition either.
- The learner found the whole flow too awkward for now and scrapped the idea. If it comes back,
  start from the keyboard's voice typing (no key, any browser) or a recogniser behind a key that
  cannot cost money (Azure F0).

## Open questions
- ~~Should a word card accept any form of the word (книгата for книга), since the prompt gives no
  context?~~ No: only the form asked for, the deck's dictionary form (Proposal item 2).
- ~~Hold-to-talk or tap-to-start on the phone?~~ Tap to start: a button press starts listening,
  a pause or a second tap ends it (Proposal item 1).
- ~~Should the Speak tab also offer shadowing: hear the model sentence, then say it, without a
  prompt in Dutch or English?~~ Yes, as a second mode of the tab (Proposal item 7).
