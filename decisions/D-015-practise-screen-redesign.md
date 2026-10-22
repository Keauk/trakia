# D-015: Restyle the app after the practise-screen design: new palette and type, progress bar, phone tab bar, word highlights

Status: done (2026-10-22) · Created: 2026-10-22 · Area: look and feedback UI (`index.html`: CSS and practise markup; `ui.js`: `renderCard`, `renderDrillCard`, `showFeedback`, `checkDrill`, `applyTheme`; `core.js`: new `wordMarks`; `sw.js`; new `app/fonts/`)

## Context
The learner commissioned a visual design for the Practise tab ("Trakia Practice Final" handoff,
2026-10-22, light and dark, desktop and phone). It is high fidelity: the colours, type, spacing,
radii and states are final. The current look is a teal header with underlined tabs, system fonts
and a merged character diff under the expected answer. The diff is the part D-010 already called
confusing. On a phone the buttons sit under the answer field, and the session counter is a bare
"3 / 14".

The handoff covers only the practise screen. Its tokens are meant for the whole app ("all component
styles must use the tokens"), so the other tabs move to the same palette.

## Proposal
1. **Palette and type.** Neutral grey page, white cards (18 px radius, soft shadow) and a blue
   primary colour, all defined as CSS custom properties with a light and a dark set. Golos Text
   for the interface, PT Serif for the Тракия wordmark, IBM Plex Mono for counters and meta lines.
   The fonts are bundled with the app so it keeps working offline. The existing Theme setting
   (System / Light / Dark) switches the token set; System follows the phone.
2. **Top bar (wide screens, ≥ 768 px).** White bar with the wordmark on the left, a pill-shaped tab
   switcher in the middle and "word N · stage S" on the right.
3. **Tab bar (phones, < 768 px).** The tabs move to a bar at the bottom of the screen. The top
   bar keeps only the wordmark and the position. While a session is running it is replaced by a
   row with ✕ (end session), the progress bar and "3/14". While the answer field has focus on a
   touch screen, the tab bar hides so the keyboard has room.
4. **Session progress bar.** One segment per card in the session queue: done cards in the primary
   colour, the current card dark, the rest grey. Queues longer than 30 cards are shown as one
   continuous bar. Retries that get appended to the queue add segments. Next to it: "3 of 14"
   (phone "3/14").
5. **Practise card.** Above the card: chips for the direction (BG → EN), free practice and
   retry, plus an "End session ✕" link. Inside the card: progress, the prompt (32 px; 26 px on a
   phone), new-word chips, the answer field and the buttons "Don't know" and "Check ↵". On a phone
   the buttons sit at the bottom of the screen, above the tab bar or above the keyboard.
6. **Result bar.** After checking, a tinted bar docks to the bottom of the card, coloured by the
   result: green *✓ Correct*, amber *≈ Almost*, red *✕ Not quite*, blue *→ Answer* (after "Don't
   know"). The answer field's border takes the same colour. The bar shows a short note (typo count,
   free-pass rule, wrong word form, "Accepted — small differences highlighted"), the expected
   sentence with the differing **words** highlighted, the "N other accepted answers" toggle, "My
   answer was correct", and a mono line with the third language and the rank. "Continue ↵" sits
   on the right; on a phone it is a full-width button at the bottom.
7. **Word highlights replace the character diff.** The merged `<ins>/<del>` line goes away. What
   you typed stays visible in the (now read-only) answer field directly above the expected
   sentence. In the expected sentence, the words that do not match your answer are highlighted.
   The comparison is case-sensitive and ignores surrounding punctuation, so an accepted
   "sunday" still highlights "Sunday". "Don't know" shows the answer without highlights.
8. **Enter** checks when the field is idle and continues when the result is showing. Holding Enter
   down no longer runs through cards.

Not proposed: any change to checking, scheduling, session building or the data. "Almost" stays a
separate verdict, even though the handoff shows only three states. The other tabs keep their
layout and only take the new tokens.

## Design notes
- `index.html`: replace the `:root` variables with the handoff's token table (light set on `:root`,
  dark set under `prefers-color-scheme: dark` unless `data-theme=light`, and under
  `data-theme=dark`). Add tokens for the almost state, which the handoff does not define:
  light `oklch(0.54 0.12 65)` on tint `oklch(0.96 0.045 80)`, dark `oklch(0.82 0.13 80)` with a 10 %
  tint. The light value gives white text a contrast of 5.2:1, the same as the other states. The
  old names `--ok`, `--bad` and `--accent` in the Stats chart and the Library badges map to
  `--correct`, `--wrong` and `--primary`.
- Fonts: woff2 subsets from Google Fonts in `app/fonts/` (Golos Text variable 400–700 latin +
  cyrillic, PT Serif 700 cyrillic, IBM Plex Mono 400/500 latin, about 110 KB), with `OFL.txt`.
  `@font-face` with `font-display: swap`; `font-feature-settings: "locl" 0` stays, so Bulgarian text
  keeps the standard Cyrillic letterforms. The fonts are added to the service worker's shell list.
- The run card gets `data-state="idle|correct|almost|wrong|revealed"`; CSS derives the accent, tint
  and border colours from that one attribute.
- One `<nav>` for both layouts: a CSS media query turns it into the fixed tab bar on phones. The
  progress bar and the chips are rendered into a desktop and a phone container (`#segs`/`#segs-m`,
  `#chips-d`/`#chips-m`). The answer actions and the Continue row are `position: fixed` on phones.
  The viewport gets `interactive-widget=resizes-content`, so on Android the buttons ride above the
  keyboard.
- `core.js`: `wordMarks(typed, expected)` returns the expected sentence's words, each with a `miss`
  flag, from a word-level LCS against the typed words. Words are compared case-sensitively after
  stripping leading and trailing punctuation. The handoff compares words by position. LCS gives
  the same result when the word count matches and does not cascade after a missing or extra word.
- `ui.js`: `showFeedback` and `checkDrill` render the marks into `#expected` as `<mark>` elements and
  write the note into `#verdict-note`. For a correct answer whose normalised form matches several
  accepted answers (contractions, case), the line shows the one with the fewest marked words.
  `#expected-label` is shown only for the looser-answer case (D-014, "Closer to the Bulgarian").
- `theme-color` meta tags for light and dark (white / `#16171a`) are updated by `applyTheme` when the
  theme is forced. `manifest.json` colours follow.
- The Enter handler on the answer field stops propagation and ignores key repeat. Until now the
  document-level handler could see the same keypress after the field was disabled and skip the
  result straight away.
- Tests: `tools/test_core.js` covers `wordMarks`. `tools/smoke_ui.js` checks the result states,
  the `<mark>` highlights, the progress segments and the new counter format.

## Acceptance criteria
- `npm test` passes, with new tests for `wordMarks` and the result states.
- Screenshots of the practise screen at 1280 px and 360 px, light and dark, idle and result, match
  the handoff.
- The other tabs render in both themes with no hard-coded colours left in `index.html` outside the
  token blocks.
- The app works offline after one load, fonts included (they are in the service worker's shell list).
- On the phone, Enter → check → Enter → next works with the on-screen keyboard. The Check and
  Continue buttons are reachable while typing.

## Effort and risks
About one evening, mostly CSS. Risks:
- **Keyboard behaviour on phones** cannot be tested headlessly. `interactive-widget` is
  Android-Chrome only. On iOS the buttons can sit behind the keyboard, but Enter still works there.
- **Dropping the character diff** removes letter-level detail. The typed text stays visible right
  above the expected line, so a one-letter slip is still easy to spot. D-010's per-letter marks
  can be added on top later.
- **oklch colours** need a browser from 2023 or later; older browsers would show default colours.
  The learner's phone runs current Chrome.

## As built
- Shipped as proposed: token palette (light and dark) in `index.html`, bundled fonts in
  `app/fonts/` with `OFL.txt`, pill tabs on wide screens and a bottom tab bar on phones, the
  session row (✕, progress bar, "3/14") replacing the top bar on phones during a session, a progress
  bar with one segment per card, the four-colour result bar, word highlights from
  `core.js: wordMarks`, and the Enter fix.
- The other tabs (home, done, Grammar, Stats, Library, Settings) keep their layout and use the new
  tokens: 18 px cards, grey stat tiles, state tints for the Library badges, and the state colours
  in the Stats chart.
- `#diff` is gone. `C.diff` stays in `core.js` (tested, unused by the UI) in case D-010 adds
  per-letter marks.

### Decisions taken
- **Four result states, not three.** *Almost* keeps its own amber colour (see Design notes).
  *Don't know* shows "→ Answer" in blue but is still scored as wrong, as before.
- **Word-level LCS instead of the handoff's positional comparison**, so a missing word marks only
  that word.
- **Wrong-answer note** follows the handoff ("Differences highlighted") instead of "N characters
  off". The typo count stays for *almost*, and the word-form slips (D-014) stay for wrong answers
  caused by a different word form.
- **Answer field after checking** stays disabled (styled to look read-only) and the focus moves
  to Continue, as before. The handoff says read-only. Disabling closes the phone keyboard after
  checking, which the learner already knows.
- **Check and Don't know do not take the focus from the answer field** (mousedown is cancelled).
  Without that, a tap on Check blurred the field, the tab bar came back and moved the button away
  before the click landed. The screenshot run found this.
- **Placeholders**: "Type the English translation" on wide screens and "Type in English" on
  phones, as in the handoff (Dutch the same). Into-Bulgarian cards keep "Въведи превод".
- **End session** still opens the session summary. The handoff's "resets the session" describes
  its mock only.
- Hover colours apply only on devices that can hover, so tab labels do not stay dark after a tap.
- Two layout bugs fixed along the way: the Library filter dropdown and the file input were wider
  than a 360 px phone, which zoomed the page out. The rank column was too narrow for "RANK" in the
  new font.

### Measurements
- Bundled fonts: 111 KB (Golos Text latin 38 KB + cyrillic 22 KB, PT Serif 21 KB, IBM Plex Mono
  2 × 15 KB). They are cached once by the service worker (`trakia-v26`).
- 2026-10-22, headless Chrome: 1280 × 820 and 360 × 760, light and dark. Checked: idle, correct
  with a case difference, almost, wrong with the alternatives open, revealed, and all four other
  tabs. No console errors. Enter checks and stays on the result (it used to skip). No horizontal
  overflow on any tab at 360 px.

## Open questions
- ~~Should D-010 (two aligned lines) be closed now that the typed line sits right above the expected
  line, or kept for the per-letter marks inside a changed word?~~ Closed as rejected on 2026-10-22
  (the learner's call); per-letter marks would get a new record.
