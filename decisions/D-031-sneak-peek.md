# D-031: Sneak peek: guess the meaning of the next Anki words from a sentence, before Anki teaches them

Status: done (2026-10-27) · Created: 2026-10-27 · Area: practise (`core.js`: `peekItems`; `ui.js`: the sneak-peek run; `index.html`: `#peek-run`, button on the Practise home)

## Context
Trakia follows the learner's Anki position: a sentence opens once Anki has taught its words. The
words just beyond that position are met for the first time in Anki, as a bare flashcard.

Memory research finds a **pretesting effect**: trying to answer before being taught, even with a
wrong guess, makes the later learning stick better than studying alone (Potts & Shanks 2014 with
unfamiliar vocabulary; Pan & Sana 2021 found pretests beat post-tests). Learners judge guessing to
be useless, so they rarely do it unprompted. Guessing a word from a sentence also trains the skill
reading depends on: inferring meaning from context.

The data now allows it: every practice sentence maps each word to its dictionary form (D-030), so
the app can find, for any upcoming word, a sentence that uses it, and tell which other words in
that sentence the learner does not know yet. A measurement over 30 upcoming words at positions
102, 150, 300, 500 and 1000 found a sentence for every one.

## Proposal
1. A **Sneak peek** button on the Practise home starts a run of up to 10 of the next words after
   the learner's Anki position that they have not peeked at yet (if all of the next 60 are
   peeked, the next 10 again).
2. Each item shows a Bulgarian practice sentence with the word highlighted and asks "What does
   *word* mean here?" with 4 options (the deck's English meanings). The help line says a wrong
   guess helps too. Other words in the sentence beyond the learner's position are glossed under
   it, so the highlighted word is the only puzzle.
3. After the guess: right or wrong is shown, then the dictionary form, its meaning and its rank,
   and the sentence's translation in the practice language.
4. The run ends with a summary ("6 of 10 guessed; Anki will teach these next").
5. Which words were peeked (and whether the guess was right) is stored and synced, only to choose
   the next run. It does not touch the review schedule, stats or eligibility.

Not proposed: peeking at words far ahead, counting peeks on the Stats tab, typing the meaning
instead of choosing it, audio.

## Design notes
- `C.peekItems(words, sentences, settings, peeked, n, rand)` (pure, in `core.js`): candidate words
  are ranks `rank + 1 … rank + 60` not in `peeked`, in order, `n` of them. For each word: the
  sentences whose lemmas contain it; the chosen one has the fewest other lemmas above
  `settings.rank`, then the fewest words; the forms to highlight are the keys of its `words` map
  that point to the word. Distractors: 3 deck words with a different meaning, chosen with `rand`
  from the first of these groups that has 3: the same deck topic (`cat`) and part of speech within
  400 ranks, the same part of speech within 150, any word within 150. Returns
  `{word, sentence, forms, others: Word[], options: Word[], answer}`.
- Ranks of lemmas come from the deck by dictionary form (`lemma#rank` honoured), as in the
  validators.
- UI: `#peek-run` in the Practise tab, built like the questions of D-028 (`.opt` buttons), one item
  at a time with *Next*; Enter goes on after the answer.
- State: `trakia.peeks` = `{rank: {at, ok}}`, part of the D-025 snapshot; merge keeps the newer
  `at` per rank; *Reset all progress* clears it.
- Bump `CACHE_VERSION`.

## Acceptance criteria
- Unit tests: `peekItems` returns words after the position, skips peeked ones, every item's
  sentence contains the word, the right meaning is among 4 distinct options, and the sentence
  prefers known words.
- Smoke test: the button starts a run; an item shows the sentence with the word marked; choosing
  an option reveals the meaning and the translation; after the run `trakia.peeks` holds the words
  and the export carries them.
- `npm test` and `check_decisions.py` pass.

## Effort and risks
An evening. Risk: a sentence that gives the meaning away (or gives no clue at all); the guess still
pays off by the pretesting research, and the sentence choice prefers sentences with known words.
Risk: distractors that are also plausible; the same part of speech makes them plausible on purpose,
the deck meaning is the answer.

## As built
- Built as proposed; not yet committed. `core.js`: `peekItems`, peeks in `mergeSnapshots`.
  `ui.js`: `startPeek`, `renderPeek`, `pickPeek`, `nextPeek`, `stopPeek`, keys 1–4 and Enter;
  state `peeks` in the snapshot, cleared by *Reset all progress*. `index.html`: *Sneak peek* button
  on the Practise home, `#peek-run`, `#peek-done`, styles. `build_data.py` now carries each word's
  deck topic (`cat`, +44 KB, +6 KB compressed).
- Tests: a core group (words after the position, peeked ones skipped, marked forms, four distinct
  meanings with the answer among them, mostly sentences with only the new word unknown, grammar
  stage 1, start over when all 60 are peeked, merge); the smoke test runs a full peek at word 150
  with clicks and keys, checks the reveal, the stored peeks, the next run and the export.

### Decisions taken
- Sentences within the learner's grammar stage come first: the first try picked "Видях те в
  ресторанта" (past tense) for a learner at stage 1.
- Distractors by deck topic: the first screenshot offered "Miss", "parent" and "granddaughter"
  next to "rakia", which needs no sentence at all; with the topic it is "ayran", "juice", "coffee".

## Open questions
- Show the deck's own example sentence when no practice sentence fits?
- A small "next in Anki" reminder on the home screen when unpeeked words are waiting?
