# D-025: Sync progress between devices through a secret GitHub gist

Status: in progress · Created: 2026-10-26 · Area: sync / storage (`core.js`: `mergeSnapshots`, `sharedSettings`; `ui.js`: `snapshot`, `applySnapshot`, `sync*`, `gh`; `index.html`: Settings card *Sync between devices*)

## Context
All learner state lives in `localStorage` on one device. The learner practises on a laptop and a
phone and wants to continue on either. Today the only route is *Export progress* on one device and
*Import progress* on the other, which **replaces** everything on the receiving device, so a session
done on the second device in the meantime is lost. DESIGN.md §3.3 kept sync out of scope. The
learner has a lot of progress on one device and a little on the others, and wants both kept.

The app is static (GitHub Pages), so there is no server of its own. GitHub's REST API accepts
requests straight from the browser (CORS), and a gist is free storage on the learner's existing
account. A token pasted once per device is the "login".

## Proposal
1. A Settings card **Sync between devices**: a field for a GitHub token (fine-grained, only the
   account permission *Gists: read and write*), a *Connect* button, then *Sync now* and
   *Disconnect*, and a status line (last sync, a link to the gist, or the last error).
2. On connect the app looks for a gist of the account holding `trakia-progress.json`; if there is
   none it creates a **secret** gist from this device's state. Every device using a token of the
   same account finds the same gist.
3. Sync **merges**, never replaces: each device keeps what it has, adds what the gist has, and
   uploads the result. For a card practised on both devices the most recent answer wins.
4. Sync runs when the app opens, after every session or drill, when the app goes to the
   background or comes back to it, and when the device comes back online. Never during a running
   session. Offline the app works as before and syncs later.
5. Synced: progress, review and drill history, session starts, drill tallies, user-accepted
   answers, imported sentences, deleted sentences, and the settings, except the ones that belong to
   the device: theme, wallpaper (file, link, dim), Latin keyboard for Bulgarian, and cards in a row
   before switching keyboard.
6. Resets travel with the sync: *Reset all progress* and the per-sentence *reset* in the Library
   also clear the progress on the other devices at their next sync.
7. The token and the gist id are stored only in this browser, outside the progress data, so they
   are never part of an export file or of the gist.

Not proposed: a login screen with email or Google (would need a hosted backend), sharing with other
people, syncing the wallpaper video, live updates while two devices are open at the same time.

## Design notes
- **Snapshot** (`Snapshot` in `types.d.ts`): the object *Export progress* already wrote, plus
  `stamps: {settings, deleted, wiped}` and `cleared: {cardKey: ts}`. `settings` holds only the
  shared keys (`C.sharedSettings`, device keys in `C.DEVICE_SETTINGS`). Version 2; a version 1
  export file has no stamps and merges as if every stamp were 0.
- **`C.mergeSnapshots(local, remote)`**, pure, in `core.js`; output keys sorted so two equal
  states stringify identically and "anything changed?" is a string compare:
  - `progress`: per key the record with the larger `last` (tie: remote); records without FSRS
    fields go through `migrateRecord` first. A record survives only if its `last` is after
    `stamps.wiped` and after `cleared[key]`.
  - `log`, `drillLog`: union, deduplicated on timestamp + key, sorted, entries before `wiped`
    dropped. `sessions`: union of timestamps, same filter.
  - `drills`: per item the tally with the larger `last`, filtered by `wiped`.
  - `userAlts`: union per key, from the sides whose `wiped` is the newest (the alternatives have
    no timestamps, so a reset drops the older side's list). `userSentences`: union by id, remote
    wins on the same id.
  - `deleted`: the list with the newer `stamps.deleted`; on a tie (both 0 on a first sync) the
    union, so no deletion is lost.
  - `settings`: the side with the newer `stamps.settings`; on a tie the **remote** (the gist), so
    the device connected second takes the settings of the device connected first.
  - `stamps`: maximum per field; `cleared`: union, maximum per key.
- Local stamps: `save.settings` bumps `stamps.settings` only when a shared setting changed (a
  theme toggle does not); `save.deleted` bumps `stamps.deleted` only when the list changed (the
  sentence importer saves it on every import); *Reset all progress* sets
  `stamps.wiped`; the per-sentence reset sets `cleared` for its four card keys. Applying a merged
  snapshot writes storage directly and takes the merged stamps, so it does not bump anything.
- **Sync** (`ui.js`): `sync()` is a no-op without a token, while a session runs, or while a sync is
  in flight (it then queues one more). Steps: find or create the gist, `GET /gists/:id` (a
  truncated file over 1 MB is fetched again from its `raw_url`), merge, apply locally if the merge
  differs from local, `PATCH` if it differs from the gist. Requests use only `Accept`,
  `Authorization` and `Content-Type` headers and `cache: 'no-store'`. A 404 on the stored gist id
  forgets it and searches again; a 401 says the token was refused.
- Token and gist id: `localStorage` key `trakia.sync` (`SyncState`), never in `snapshot()`.
- *Import progress* (file) now goes through the same merge, so it no longer replaces; the help
  text says so.
- **Concurrency**: no locking. Two devices writing in the same moment: the later write wins on the
  gist, but each device still holds its own full state, so its next sync merges it back in. The
  state converges; nothing is lost.
- Tests: `test_core.js` for the merge rules (newer card wins, union of logs, wipe and clear,
  settings tie to remote, device keys untouched, merge of a state with itself is a no-op);
  `smoke_ui.js` with a `fetch` mock of the gist API: connect creates the gist, a change on the
  "other device" arrives after *Sync now*, and neither the export nor the gist holds the token.

## Acceptance criteria
- `npm test` passes with the new merge tests and the mocked gist sync in the UI smoke test.
- Connecting the device with the most progress first, then a second device, leaves both devices
  with the union of their progress; the second device takes the first device's settings, keeps its
  own theme and wallpaper.
- A session on the phone shows up on the laptop after the laptop syncs (open, or *Sync now*).
- The exported progress file and the gist contain no token.
- With no token, the app makes no network requests and behaves as before.

## Effort and risks
About an evening. Risks: the token sits in `localStorage` and works for every gist of the account;
mitigated by the narrow permission, an expiry, and the gist holding only Trakia data (a separate
GitHub account removes even that). A secret gist is unlisted, not private: anyone with its URL can
read it. A file over 1 MB depends on `gist.githubusercontent.com` answering cross-origin requests;
if it does not, sync reports an error instead of losing data. A race between two devices is healed
by the next sync.

## As built
- Shipped as proposed, not yet committed or tried on two real devices. `core.js`:
  `DEVICE_SETTINGS`, `sharedSettings`, `mergeSnapshots`. `ui.js`: `snapshot`, `applySnapshot`,
  the sync section (`gh`, `findGist`, `readGist`, `sync`, `renderSyncStatus`), stamps in
  `save.settings` / `save.deleted`, the reset buttons, *Import progress* now merging.
  `index.html`: Settings card *Sync between devices* before *Danger zone*; the Export help text.
- Tests: two merge groups in `test_core.js`; `smoke_ui.js` runs connect, a refused token, the
  gist created secret from local progress, a change from "another device" arriving with the theme
  kept, a second connect finding the same gist, and no token in the gist or the export.

### Decisions taken
- Resets travel with the sync (tombstones: `stamps.wiped`, `cleared`) rather than being undone by
  the next sync, so *Reset all progress* and the Library's per-sentence reset mean the same with
  and without sync. The reset confirmation says so when sync is on.
- *Import progress* (file) merges instead of replacing, through the same function as the sync.
- Device-only settings: theme, wallpaper, wallpaper link, dim, Latin keyboard, cards in a row
  before switching keyboard.
- Accepted answers in the merged state are sorted, so the order in which two devices list them
  does not cause an upload on every sync.
- A refused token on *Connect* is not stored; the status line shows why.
- After the requests return, the merged state is merged once more with the device's current state,
  so an answer given while the sync ran is not overwritten.

## Open questions
- Should the app show a small sync indicator in the top bar, or is the status line in Settings
  enough?
- When the log grows past 1 MB, should old log entries be compacted into daily totals?
