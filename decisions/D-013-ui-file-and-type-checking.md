# D-013: Move the UI script out of index.html and type-check the JavaScript

Status: done (2026-10-22) · Created: 2026-10-22 · Area: tooling (`app/ui.js`, `app/core.js`, `tsconfig.json`, `npm test`)

## Context
The app is deliberately a no-build static site (DESIGN.md), but its UI code, about 450 lines of
JavaScript, lives inline in `index.html` in long one-line statements, which makes diffs hard to
read and agent edits error-prone. The shapes of the central objects (a sentence, a progress record,
the settings, a grammar card) are documented only in prose and in the code that reads them, so a
misspelled field or a wrong argument is found at run time, if at all. A full move to TypeScript was
considered and declined for now: at ~1000 hand-written lines with one developer it would add a
compile step, source maps and changes to publish and tests for little gain. The two cheapest steps
that give most of the safety are done here as one item.

## Proposal
1. Move the inline script to `app/ui.js`, loaded by `index.html` after `core.js`. No behaviour
   change, no build step; the service worker caches the new file and the smoke test loads it.
2. Type-check without compiling: `// @ts-check` at the top of `core.js` and `ui.js`, JSDoc
   typedefs for the shared shapes in `app/types.d.ts` (Sentence, Word, GrammarCard, Progress record,
   Settings, the data bundle and the `TrakiaCore` API), and `tsc --noEmit` as part of `npm test`.
   TypeScript is a dev dependency only; the browser still runs the plain files.
Not proposed: converting any file to `.ts`, a bundler, or splitting `data.js` (that stays the next
step noted in D-011).

## Design notes
- `tsconfig.json`: `allowJs`, `checkJs`, `noEmit`, `strict` with `noImplicitAny` off, so existing
  untyped locals are allowed but wrong field names, wrong argument counts and null misuse are errors.
  `lib: dom, es2022`; `app/data.js` excluded (generated, 2 MB) and declared via `types.d.ts`.
- Globals: `window.TRAKIA_DATA` and `window.TrakiaCore` declared in `types.d.ts`; `core.js` keeps
  its UMD wrapper so `tools/test_core.js` still `require`s it.
- Fixes needed to get to zero errors are kept to annotations, null checks and real bugs; no logic
  rewrites. Real bugs found this way are listed under As built.

## Acceptance criteria
- `index.html` contains no inline script; `app/ui.js` exists and the app behaves identically
  (smoke test and unit tests pass unchanged).
- `npm test` runs `tsc --noEmit` and it reports zero errors.
- Installed phones pick up the new file (cache version bumped).
- The documented layout (README.md, DESIGN.md) names `ui.js`.

## Effort and risks
~2 hours: the move is mechanical; the annotations are the bulk. Risk: `strict` can flag many
harmless patterns in dense code; mitigated by turning off `noImplicitAny` rather than sprinkling
`any`. Risk: the global type declarations drift from `build_data.py`; mitigated by checking the
bundle's keys once while writing them.

## As built
- `app/ui.js` holds the UI script, unchanged apart from annotations; `index.html` loads it after
  `core.js`, `sw.js` caches it, and the smoke test evaluates it like the other two files. The move
  landed in two commits because c1b52a3 (another session) swept up the edited `index.html` without
  the new file; f1097e4 added it.
- `tsconfig.json`: `allowJs`, `checkJs`, `noEmit`, `strict` with `noImplicitAny` off; includes
  `types.d.ts`, `core.js`, `ui.js`. `data.js` is declared rather than parsed; `sw.js` is excluded
  because worker globals conflict with the DOM library.
- `app/types.d.ts`: Word, Sentence, GrammarCard, GrammarData, TrakiaData, Settings, FsrsOptions,
  ProgressRecord, Progress, AppElement (what `$()` returns), the Window globals and `XLSX`.
- From 269 errors to zero with: a typed `$()` plus `q()` and `closest()` helpers, casts for file
  inputs and the input event, `String(val)` in `fillText`, a guard on `o.counter`, and
  `selectionStart ?? length`. No real bug surfaced: every error was a nullable DOM lookup or a field
  missing from the generic element type.
- `npm test` now ends with `tsc -p tsconfig.json` (`npm run typecheck` runs it alone);
  `typescript` 5.6.3 is a dev dependency. Checked: `core.js`, `ui.js`. Not checked: `sw.js`, `tools/`.

### Decisions taken
- `$()` returns a non-null `AppElement` instead of `HTMLElement | null`: every id is static in
  `index.html`, so a missing one is a bug the smoke test catches, not a case for the UI to handle.

## Open questions
- ~~Should `tsc` also check `tools/*.js` (the tests), or only `app/`?~~ Only `app/` for now; the
  tests use node and jsdom globals that would need `@types/node` first.
