# D-021: A quieter result panel, and blocks of cards per keyboard instead of a switch on every card

Status: done (2026-10-23) · Created: 2026-10-23 · Area: feedback UI (`ui.js`: `renderAlts`, `showFeedback`; `index.html`: `.links`, `.link-btn`) and session builder (`core.js`: `spreadOut`, `buildSession`, new `fullBlocks`; `ui.js`: retry queueing; new setting `dirRun`)

## Context
The learner's report, after a few days with the English practice language:
- The "other accepted answers" toggle remembers being opened (D-012), so after one look every
  later card opens with a long list under the answer.
- "My answer was correct" sits next to that toggle at the same weight. It is a rare action and
  reads as an equal choice.
- Under the answer the third language is shown ("NL De kinderen slapen in de kleine kamer ·
  rank 412", D-011). When practising English the Dutch sentence is noise.
- The session alternates directions on every card (D-003 `spreadOut`), so the learner types
  Bulgarian, then English, then Bulgarian, and switches the phone keyboard between Cyrillic and
  Latin on nearly every card.

## Proposal
1. **The alternatives always start collapsed.** Opening the list applies to that card only; the
   next card starts closed again. This replaces D-012's remembered open state.
2. **"My answer was correct" moves under the toggle**, smaller and fainter (12 px, the faint ink
   colour, a light underline that darkens on hover).
3. **No third-language translation under the answer.** The line keeps the rank ("rank 412");
   grammar drills keep their "See: …" link.
4. **Blocks of cards per keyboard.** New setting *Cards in a row before switching keyboard*
   (`dirRun`): 1 (default, today's behaviour: switch every card), 2, 3, 4, 5, 6, 8 or 10. With N
   above 1, cards answered in Dutch or English (Latin keyboard) and cards answered in Bulgarian
   (Cyrillic keyboard) come in blocks of N. Inside a block the same direction is kept where
   possible, so a Mixed session does not alternate Dutch and English either.
   - **Full blocks.** The length of a session depends on how many reviews are due, so it cannot
     be fixed to a multiple of N in advance. Instead, for each keyboard, up to N − 1 of the least
     urgent reviews wait for the next session, so that the blocks come out full. New sentences are
     never left out. The last block can still be shorter when only new cards are left, or when one
     direction has fewer cards than a block (for example early on under "Both — into Bulgarian
     unlocks …").
   - When one keyboard runs out, the rest of the session stays on the other one, with no switch.
   - Inside a block, staying on the keyboard comes before the D-003 rule that consecutive cards do
     not share a content word, so two Cyrillic cards in a row may share one. At a switch the rule
     comes first: when no card for the other keyboard fits, the block runs on, so the reverse of
     the sentence just answered never comes straight after it.
   - Cards answered wrong come back at the end of the session (as now), grouped by keyboard.

Not proposed: separate block sizes per direction, changing how many new sentences a session takes,
or blocks in grammar drills (they are all Cyrillic).

## Design notes
- `index.html`: `.links` becomes a column (`flex-direction: column; align-items: flex-start`),
  so the button lands under the toggle; `.link-btn` 400 12px in `--faint`, underline in
  `color-mix(in oklab, currentColor 40%, transparent)`, `--ink-2` and a full underline on hover.
- `ui.js`: `renderAlts` sets `open = false` every time; the `toggle` listener and the
  `trakia.altsOpen` key go. `showFeedback` writes only the rank to `#gloss`.
- `core.js`: `spreadOut(keys, byId, run)`. With `run` ≤ 1 the current loop runs unchanged. With
  `run` > 1, each position wants the keyboard of the previous card while its block is shorter than
  `run`, otherwise the other one (direction ending in `2bg` or not). Each remaining card gets a
  score and the earliest card with the highest score wins. Inside a block: wanted keyboard, no
  shared word and the previous direction (4), wanted keyboard and no shared word (3), wanted
  keyboard (2), other keyboard and no shared word (1). At a switch: wanted keyboard and no shared
  word (3), other keyboard and no shared word (2), wanted keyboard (1).
- `core.js`: `fullBlocks(dueKeys, freshKeys, run)` drops, per keyboard, the last `n mod run` due
  keys (the least urgent, as due cards are sorted most-forgotten first) when that keyboard has more
  than `run` cards and enough due cards to remove; otherwise it changes nothing. `buildSession`
  applies it before `interleave`, and to the free-practice pool.
- `ui.js`: with `dirRun` > 1, a retried card is inserted after the last queued retry with the same
  keyboard, otherwise at the end.
- Setting: `DEFAULTS.dirRun = 1`, `Settings.dirRun` in `types.d.ts`, a `<select id="set-run">`
  under *Directions*, bound as a number.
- Tests: `spreadOut` with `run` 3 on a mixed list gives blocks of three; with `run` 1 the output is
  unchanged; `fullBlocks` drops the least urgent due keys and never a new one; `buildSession` with
  `dirRun` 4 gives full blocks. Smoke test: alternatives closed again on the next card after being
  opened, no `trakia.altsOpen` key, the gloss is "rank N" without the other language, the button
  sits under the toggle, the new setting is stored.

## Acceptance criteria
- Open the alternatives on one card: the next card shows them closed.
- "My answer was correct" is under the toggle and visibly quieter than it, in light and dark.
- Practising English, the line under the answer reads "rank N", with no Dutch.
- With the setting on 4 and enough cards of both kinds, a session runs four Latin cards, four
  Cyrillic, four Latin, and so on; with 1 the order is what it was.
- `npm test` and `python3 tools/check_decisions.py` pass.

## Effort and risks
About 60 lines plus tests, one sitting. Risks: blocks make the direction more predictable, which
takes a little of the interleaving benefit (D-003). The default stays 1, so the learner chooses
the trade-off. Deferring up to N − 1 reviews per keyboard delays them by one session, at most a
few cards, and they lead the next session because they are only more forgotten by then.

## As built
- Built as proposed. `renderAlts` closes the list on every card and the `trakia.altsOpen` key is
  gone; `.links` is a column with "My answer was correct" under the toggle in 12 px `--faint`;
  `#gloss` shows only the rank. Checked in Chromium at 360 px (light) and 1280 px (dark).
- `spreadOut(keys, byId, run)` and the new `fullBlocks` in `core.js`; `buildSession` applies both
  (also to free practice). Retries with `dirRun` > 1 join the retries on the same keyboard.
- Setting *Cards in a row before switching keyboard* (`set-run`, `dirRun`, default 1). Cache
  version `trakia-v33`.
- Tests: a `D-021 keyboard blocks` group in `tools/test_core.js` (run 1 unchanged, blocks of 3 and
  4, one keyboard running out, direction kept inside a block, the shared-word rule inside a block
  and at a switch, `fullBlocks`, `buildSession` with blocks of 4). The smoke test checks that the
  next card starts collapsed, the button order, no stored open state, the rank-only gloss, and a
  session with the setting on 4.

### Decisions taken
- Inside a block the keyboard comes before the shared-word rule (proposal changed during the
  work). The first version let the rule win everywhere; with two Cyrillic cards that shared a word
  the smoke test got "C LLLL C LLLL", three switches where one was enough. At a switch the rule
  still wins, so the reverse of a sentence never follows it directly.

### Measurements
2026-10-23: the smoke test passed 12 of 12 runs with the final ordering (11 of 12 with the first).

## Open questions
- Should the default become 4 or 5 once the learner has used blocks for a while?
