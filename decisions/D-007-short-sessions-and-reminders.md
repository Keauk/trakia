# D-007: Short, frequent sessions and a reminder nudge

Status: proposed · Created: 2026-10-21 · Area: session builder, PWA (`sw.js`, `manifest.json`), Settings

## Context
The scheduler already supports many sessions per day, but a session today can be up to 40 reviews
plus 10 new cards, which is a 15–20 minute sitting. Distributed-practice results favour several
5–10 minute sessions over one long one, and a short review before sleep helps consolidation. Nothing
currently nudges the learner to come back when cards are due.

## Proposal
**Session size.** Default to a target of about 20 answers per session (`maxDue` 15, `newPerSession`
5), show a "15 more due — continue?" button at the end instead of silently truncating, and show the
elapsed time on the end screen. Keep the current caps available in Settings.

**Reminders.** Three tiers, from certain to best-effort:
1. **App badge** (Badging API, Android Chrome): when the app opens or a session ends, set the badge
   to the number of due cards; clear it when nothing is due. Reliable, zero permissions.
2. **Evening review slot**: a Settings time (default 21:30) and a one-tap "Add to calendar" that
   produces an .ics with a daily recurring reminder pointing at the app URL. Works everywhere,
   needs no push server.
3. **Periodic background sync** (Chrome on Android, installed PWA only): register a periodic sync
   with a 12-hour minimum; on wake, the service worker reads the progress from IndexedDB (requires
   moving progress out of `localStorage`, which a service worker cannot read) and shows a local
   notification "N sentences are due" if N ≥ 10. Best-effort: the browser decides when to run it.
Not proposed: a web-push server. It is the only fully reliable option, but it needs a backend and
subscription management, which the static-hosting design deliberately avoids.

## Design notes
- Tier 3 implies moving `progress` and `log` from `localStorage` to IndexedDB (a wrapper of ~60
  lines; keep the export/import JSON shape identical). Tiers 1 and 2 do not.
- `navigator.setAppBadge(n)` and `clearAppBadge()`; feature-detect.
- Notification permission is requested only from the Settings toggle, never on load.
- Session end screen: add "continue" (builds another session immediately) and "done for now".

## Acceptance criteria
- A learner with 60 due cards gets three sessions of ~20 with "continue" between them, and the
  Stats sessions-today count increases by three.
- On Android with the app installed: the icon badge shows the due count after closing the app.
- The .ics reminder opens the app URL from the calendar event.
- Periodic sync, where supported, shows a notification once a day at most when ≥ 10 cards are due.

## Effort and risks
Session size: ~30 lines. Badge and .ics: ~40 lines. Periodic sync with the IndexedDB move: ~150
lines and the riskiest part (browser support is limited to Chromium on Android and depends on the
site engagement score). Do tiers 1–2 first and treat tier 3 as optional.

## Open questions
- Is 20 answers the right default, or should it be time-based (stop offering after 8 minutes)?
- Should the badge count due cards in both directions or only production cards (D-004)?
