# D-005: Speak Bulgarian sentences and add a dictation mode

Status: proposed · Created: 2026-10-21 · Area: practise UI (`index.html`: `renderCard`, `showFeedback`), `core.js` (new direction)

## Context
Practice is reading and typing only. That builds a silent vocabulary: the learner may know a sentence
on paper and still not recognise it when spoken, and Cyrillic learners in particular benefit from
hearing the sound-to-spelling mapping. Android ships a Bulgarian (bg-BG) voice through Google
Text-to-speech, which the Web Speech API (`speechSynthesis`) exposes to an installed PWA at no cost.

## Proposal
1. **Speak on demand and on reveal.** A speaker button next to any Bulgarian text (prompt in BG→NL,
   expected answer in NL→BG feedback). Setting *Auto-speak* (default on where a bg voice exists):
   BG→NL prompts are spoken when the card appears; NL→BG expected answers are spoken on reveal.
2. **Dictation direction** `listen`: the prompt is audio only (with a replay button and, after one
   wrong attempt, the Dutch meaning as a hint); the learner types the Bulgarian. It is scheduled as a
   third card per sentence, unlocked after the NL→BG card has been answered correctly once, and
   checked with the Bulgarian rules (same accepted answers as NL→BG).
3. Graceful absence: if no `bg` voice is available (most desktop Linux installs, iOS without the
   Bulgarian voice downloaded), hide the speaker buttons and the dictation direction, and say so once
   in Settings with a hint on how to install a voice.

## Design notes
- Voice lookup: `speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('bg'))`;
  voices load asynchronously (`voiceschanged` event). Prefer a voice whose `localService` is true so
  it works offline.
- Autoplay rules: speech must follow a user gesture. Card appearance after pressing Enter/Next counts
  as a gesture in Chrome; the first card of a session is shown after the Practise button, also fine.
- Rate 0.9 for learners; a setting for 0.7–1.1.
- The sentence text sent to TTS should be the raw `bg` with punctuation (prosody), not the
  normalised form.
- `cardKeys` gains the `listen` direction behind a setting; `buildSession`, Stats and the Library need
  the third direction rendered (badge "🎧 BG").
- Dictation checks are strict on spelling by nature; the typo tolerance still applies, which is the
  point of the exercise (near-miss feedback shows which letter was mis-heard).

## Acceptance criteria
- On an Android phone with the Bulgarian voice installed: prompts are spoken automatically, replay
  works, and the dictation direction appears in sessions after the NL→BG card is known.
- On a machine without a Bulgarian voice nothing breaks and no audio controls are shown.
- Unit tests cover the new direction in `cardKeys` and `buildSession`; the headless smoke test stubs
  `speechSynthesis`.

## Effort and risks
~150 lines; one evening plus phone testing. Risks: voice availability varies by device; the dictation
direction adds review load (mitigated by D-004-style retirement of recognition cards).

## Open questions
- Should dictation replace BG→NL for mature sentences rather than add a third card?
- Record the learner's own voice for comparison? (Out of scope; note for later.)
