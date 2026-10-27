# D-032: Nothing reaches the phone unchecked: tests before every publish, and no manual cache bump

Status: in progress · Created: 2026-10-27 · Area: tooling (`tools/publish.sh`, `tools/stamp_cache.py`, `tools/build_data.py`, `tools/validate_sentences.py`, `tools/validate_stories.py`, `package.json`, `.github/workflows/test.yml`, `app/sw.js`, `CLAUDE.md`)

## Context
Three steps that protect the learner's phone are done by hand and can be forgotten:
1. `npm test` and `python3 tools/check_decisions.py` must pass before committing, but
   `tools/publish.sh` publishes whatever is committed without running either.
2. After a data edit, `python3 tools/build_data.py` must regenerate `app/data.js`; if it is
   forgotten, the app ships the old data while the repository shows the new.
3. After a change to `index.html`, `ui.js`, `core.js` or `data.js`, `CACHE_VERSION` in `app/sw.js`
   must be raised by hand. If it is forgotten, the service worker keeps serving the old files from
   its cache, and the phone never sees the new version.

The data validators (`validate_sentences.py`, `validate_stories.py`) also only run when someone
remembers to; a hand edit to a sentence or a story can break an invariant they check (every word
mapped, nothing above a story's level) without anyone noticing.

## Proposal
1. `npm test` checks everything: the unit and UI tests and the type check as today, plus the
   decision records, both data validators (checking only, writing nothing), that `app/data.js` is
   up to date with `data/*.json`, and that the cache version matches the app files.
2. The cache version is no longer a number raised by hand: it is a hash of the files the service
   worker caches. `npm run build` regenerates `data.js` and stamps the hash into `sw.js`; the test
   fails with "run npm run build" when either is stale.
3. `tools/publish.sh` runs `npm test` first and stops when it fails.
4. A GitHub Actions workflow runs `npm test` on every push to `main` (free for a public
   repository), so a broken commit is visible on GitHub as well.
5. `CLAUDE.md` says `npm run build` instead of "bump CACHE_VERSION".

Not proposed: blocking pushes on GitHub (branch protection), deploying from Actions instead of
`publish.sh`, a pre-commit hook (it would need a one-time local setup on every clone).

## Design notes
- `tools/stamp_cache.py [--check]`: reads the `SHELL` list from `app/sw.js`, hashes those files
  (SHA-256 of path and contents, in list order), writes `CACHE_VERSION = 'trakia-<12 hex>'`; with
  `--check` it only compares and exits 1 when they differ. `sw.js` itself is not hashed: a browser
  installs a changed `sw.js` anyway.
- `tools/build_data.py --check`: builds the bundle in memory and compares it with `app/data.js`.
- `tools/validate_sentences.py --check data/words.json data/sentences.json`: runs the full
  validation and derivation, writes nothing, exits 1 on any problem or when the result differs from
  the file (a stale `max_rank`, `lemmas` or `vocative`). `validate_stories.py` gains `-q` (errors
  and the summary only) and already exits 1 on an error.
- `package.json`: `build` = build_data + stamp; `test` runs the JavaScript tests, then
  `check` (records, validators, freshness).
- `.github/workflows/test.yml`: `ubuntu-latest`, Node 22, Python 3, `npm ci`, `npm test`.

## Acceptance criteria
- `npm test` passes on the current tree and fails, with a message naming the fix, when: `data.js`
  is stale, `sw.js` has a stale version, a sentence has an unmapped word, a story has a word above
  its level, a decision record is malformed. Each case tried once by hand.
- `tools/publish.sh` stops before pushing when `npm test` fails.
- The workflow runs green on GitHub after the next push.

## Effort and risks
An hour or two. Risk: the check makes `npm test` slower (the sentence validator reads 3 MB); a
few seconds. Risk: a hash over the files changes the cache name on every content change, which is
exactly the intent; the old caches are deleted by the existing `activate` handler.

## As built
- Built as proposed; not yet committed or pushed, so the GitHub workflow has not run yet.
  `tools/stamp_cache.py` (new), `--check` in `build_data.py` and `validate_sentences.py`, `-q` in
  `validate_stories.py`; `package.json`: `build`, `check`, and `test` ending in `check`;
  `tools/publish.sh` runs `npm test` before pushing; `.github/workflows/test.yml`; `CLAUDE.md`,
  `README.md` and `DESIGN.md` say `npm run build` instead of "bump CACHE_VERSION". The cache name
  went from `trakia-v42` to `trakia-012a0fba4b1a`.

### Decisions taken
- `npm test` runs the Python checks after the JavaScript ones (`npm run check`), so `npm run
  check` alone is a fast way to look at the data without the UI test.

### Measurements
- 2026-10-27, each failure tried once by hand and restored: a story title edited without a
  rebuild ("app/data.js is stale: run npm run build"); a line added to `ui.js` without a stamp
  ("app/sw.js has cache version …, the app files give …: run npm run build"); a sentence given an
  unmapped word (`A059: "вчера" is not in words`); a story given a word above its level
  (`R100a: above level 100 and not glossed: бедният (беден #1653)`); a broken status line in a
  decision record. All five made `npm run check` exit 1.
- `tools/publish.sh` in a throwaway git worktree, on a commit with an unstamped change and with
  `git push` replaced by a stub: it printed "npm test failed: not publishing" and never pushed.

## Open questions
- Deploy from GitHub Actions on every green push to `main`, instead of running `publish.sh`?
