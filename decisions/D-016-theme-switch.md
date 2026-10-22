# D-016: Switch between light and dark mode from the top bar

Status: done (2026-10-22) · Created: 2026-10-22 · Area: top bar (`index.html`: header, phone session row; `ui.js`: `applyTheme`, `toggleTheme`)

## Context
Since D-015 the app has a full light and a full dark palette, but the only way to change it is
Settings → Typing → Theme, at the bottom of the longest tab. The default, System, follows the
device, so a phone in dark mode always opens the app dark. The learner asked for a small switch
that is reachable from any page.

## Proposal
1. A sun/moon icon button in the top bar, right of "word N · stage S", on every tab. It shows a
   moon in light mode and a sun in dark mode. A tap switches to the other one.
2. On phones during a session the top bar is replaced by the session row (D-015), so the same
   button sits at the right end of that row.
3. A tap stores an explicit choice (Light or Dark) in the existing `theme` setting. Settings →
   Theme still offers System, which is the only way back to following the device.
4. Tapping the switch while typing does not move the focus out of the answer field, so the phone
   keyboard stays open.

Not proposed: a three-way switch (System / Light / Dark) in the top bar, or an automatic schedule.

## Design notes
- `index.html`: `#btn-theme` in a right-hand group with `#hdr-rank`, and `#btn-theme-m` in the
  phone session row. Both buttons contain a sun and a moon SVG. CSS shows one of them using the
  same two dark-mode conditions as the token blocks, so the icon never lags behind the colours.
  The buttons are 32 px on wide screens and 44 px on phones (tap target).
- `ui.js`: `isDark()` reads `settings.theme` and, for System, `prefers-color-scheme`.
  `toggleTheme()` stores the opposite of what is showing, saves, calls `applyTheme()` and updates
  the Settings select. `applyTheme()` also sets the buttons' `aria-label`/`title` ("Switch to dark
  mode" / "Switch to light mode"). It reruns when the system scheme changes while on System.
- Mousedown on the buttons is cancelled, as for Check and Don't know (D-015).
- Test: the smoke test clicks the switch twice and checks `data-theme`, the stored setting and the
  Settings select.

## Acceptance criteria
- The switch is visible on all five tabs on a wide screen and on a phone, and in the phone
  session row; one tap flips the colours and the browser bar colour.
- After a reload the chosen mode is kept; Settings → Theme shows it, and choosing System there
  follows the device again.
- `npm test` passes.

## Effort and risks
About 40 lines. Low risk. The phone session row loses 44 px of progress-bar width.

## As built
- Shipped as proposed. `#btn-theme` is in the top bar on every tab. `#btn-theme-m` is at the
  right end of the phone session row. Both show a moon or a sun and flip between light and dark.
  The service worker cache is `trakia-v27`.

### Measurements
- 2026-10-22, headless Chrome at 1280 px and 360 px with a dark system scheme. The app opens dark
  on System. One tap gives light; a tap mid-session gives dark again, and the focus stays in the
  answer field. After a reload the choice is kept. No console errors.

## Open questions
None.
