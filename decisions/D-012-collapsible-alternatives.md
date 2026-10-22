# D-012: Collapse the "Also accepted" list behind a subtle toggle

Status: done (2026-10-22) · Created: 2026-10-22 · Area: feedback UI (`index.html`: `showFeedback`, `checkDrill`)

## Context
After answering, the feedback panel lists every other accepted answer inline ("Also accepted: … · …").
Since the generous English pass, sentences average almost five alternatives and some have eight or
more, so the list pushes the Next button down and buries the verdict and the correct answer, which
are what the learner needs to see first.

## Decision
- Replace the inline list with a small, muted toggle under the expected answer:
  "▸ 7 other accepted answers". Tapping it expands the list; tapping again collapses it.
- Collapsed by default for every answer. The expanded state is remembered per device
  (`trakia.altsOpen` in localStorage), so a learner who always wants to see them opens it once.
- Expanded, the alternatives are shown one per line (easier to scan than a "·"-joined run-on),
  in the same muted style.
- No toggle at all when there are no other answers; a single alternative still uses the toggle so
  the panel looks the same every time.
- The toggle is a real `<button>` inside a `<details>`-style element, so it works with keyboard and
  screen readers; Enter in the answer field still goes to Next, not to the toggle.
- Applies to sentence answers and grammar drills alike.

## Acceptance criteria
- After a wrong answer on a sentence with several alternatives, the panel shows the verdict, the
  expected answer and a one-line toggle; the list is hidden until the toggle is used.
- The open/closed choice survives the next card and a reload.
- The headless UI test covers the toggle (hidden by default, shown after a click, count matches).
