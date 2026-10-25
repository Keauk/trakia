# D-023: A moving wallpaper behind the app: a built-in fireplace or the learner's own video

Status: done (2026-10-25) · Created: 2026-10-25 · Area: look (`index.html`: `#wallpaper`, Settings card *Wallpaper*; `ui.js`: `applyWallpaper`, `fire*`, `media*`), `sw.js` untouched

## Context
The learner wants a moving background while practising: a fireplace, or a film scene they like
("a Lord of the Rings wallpaper"). The app cannot ship film footage, which is copyrighted, but it
can draw a fire itself and it can play a clip the learner provides. The cards and the header are
opaque, so a background behind them does not touch legibility; the page background is the only
thing that changes.

## Proposal
1. Setting **Wallpaper** (`wallpaper`, default `none`): *None*, *Fireplace*, *My video*.
   - *Fireplace*: an animated fire drawn by the app on a canvas (no file, works offline).
   - *My video*: a video file chosen from the device (MP4 or WebM; kept in the browser's
     IndexedDB on that device, never uploaded), or a direct video URL. Played muted, looped,
     inline, without sound.
2. Setting **Dim** (`wallpaperDim`, 0–90, default 55): an overlay in the theme's background
   colour over the wallpaper, so it stays a background in light and dark mode.
3. The wallpaper pauses while the tab is hidden, and it is not shown at all when the system asks
   for reduced motion (the Settings card says so).
4. The wallpaper file is not part of exports or backups.

Not proposed: sound, bundled stock videos (size and licensing), a still-image wallpaper.

## Design notes
- `index.html`: `<div id="wallpaper">` with a `<canvas>` and a `<video muted loop playsinline>`,
  `position: fixed; inset: 0; z-index: -1`, so it paints above the page background and below the
  content; an `::after` overlay in `var(--bg)` with the dim as opacity. Settings card *Wallpaper*
  before *Danger zone*: select, "Choose a video" file input, URL field, dim range, a help line.
- `ui.js`: `applyWallpaper()` on load and on every change of the three settings; `fireStart` /
  `fireStop` run the Doom-style fire (a 120 × 72 heat buffer, 36-step palette, about 24 frames a
  second, drawn as `ImageData` and scaled by CSS with a slight blur); `mediaPut` / `mediaGet` wrap
  IndexedDB (`trakia` database, `media` store, key `wallpaper`); a chosen file becomes an object
  URL for the video element. `visibilitychange` pauses and resumes.
- Settings: `wallpaper: 'none' | 'fire' | 'video'`, `wallpaperUrl: string`, `wallpaperDim: number`;
  whether a file is stored is read from IndexedDB at apply time (URL wins when both exist? No: the
  file wins when present; the URL field says "a chosen file takes precedence").
- The smoke test runs without a canvas context (jsdom), so the fire must start and stop without
  one.

## Acceptance criteria
- *Fireplace* shows a moving fire behind the cards in light and dark mode; the cards stay readable
  at the default dim.
- *My video* with a chosen file plays it looped and muted after a reload; with a URL, plays it.
- *None* removes it; the dim slider changes the darkness at once.
- The smoke test switches to *Fireplace* and back and sets a URL; `npm test` and
  `python3 tools/check_decisions.py` pass.

## Effort and risks
About 120 lines plus CSS, one sitting. Risks: battery use on phones (mitigated by pausing when
hidden, the low-resolution fire, and the default *None*); a large video file in IndexedDB (the
help line suggests a short loop of a few megabytes); a URL that blocks hotlinking shows nothing
(the help line says to use a direct video link).

## As built
- Built as proposed. `index.html`: `#wallpaper` (canvas + video, `z-index: -1`, `::after` overlay
  in `var(--bg)` with `--wp-dim`), the Settings card *Wallpaper* (select, file button, URL field,
  dim range) before *Danger zone*. `ui.js`: `applyWallpaper`, `renderWallpaperFields`, `fireStart` /
  `fireStop`, `mediaDb` / `mediaPut` / `mediaGet` (IndexedDB `trakia` → `media` → `wallpaper`),
  file and clear handlers, `visibilitychange`. Settings `wallpaper`, `wallpaperUrl`,
  `wallpaperDim` (defaults `none`, `''`, 55). Cache version `trakia-v37`.
- The fire is the Doom algorithm on a 120 × 72 buffer at 24 frames a second, with the original
  37-colour palette, cooling by 0–3 per row (so the flames reach about a third up with ragged
  tips) and a fade to transparent below heat 6. Checked in Chromium at 360 px (light) and 1280 px
  (dark): the fire sits behind the cards, which stay opaque and readable.
- The smoke test switches to *Fireplace*, moves the dim slider, selects *My video* with a URL and
  back to *None*, and checks the stored settings; it runs without a canvas context or media
  playback (jsdom), which the code tolerates.

### Decisions taken
- The first palette and decay (0–1 per row) left a flat yellow block with a hard top edge at
  mid-screen; the Doom palette and the 0–3 decay fixed both.
- `applyWallpaper()` runs at the end of the script, after the fire constants are declared; a call
  from the earlier start-up line hit the temporal dead zone.

## Open questions
- A still-image wallpaper as a cheaper third option?
