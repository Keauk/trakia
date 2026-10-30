# D-041: Tap the Тракия logo to go to the Practise tab

Status: in progress · Created: 2026-10-30 · Area: header (`index.html`: the logo; `ui.js`: `showTab`)

## Context
The Тракия wordmark in the top-left corner does nothing when tapped. On most websites and apps the
logo leads to the home page, and the learner expects that here: from Library, Stats or Settings,
tapping the logo should bring them back to practising.

## Proposal
1. Tapping or clicking the logo opens the Practise tab, exactly as the Practise tab button does.
   A running session or words run stays where it was.
2. The logo shows a pointer on hover and a focus ring for the keyboard, and screen readers announce
   it as "Тракия, go to Practise".

Not proposed: a change to the logo's look, or ending a running session from the logo.

## Design notes
- `index.html`: the `h1` holds a `<button id="logo">` with the reset look of the wordmark (font,
  colour and size inherited from `h1`), so it stays keyboard-reachable without looking like a button.
- `ui.js`: `$('logo')` calls `showTab('practise')`.

## Acceptance criteria
- Smoke test: from the Stats tab, a click on the logo makes the Practise tab and its tab button active.
- On the phone: the logo looks as before; a tap opens Practise.
- `npm test` passes.

## Effort and risks
A few lines. No known risk.

## As built
Built and published; the check on the phone is still to come.
- `index.html`: the wordmark is a `<button id="logo">` inside the `h1`, styled to look as before.
- `ui.js`: a click calls `showTab('practise')`. Smoke test added.

## Open questions
None.
