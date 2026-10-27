# Trakia — instructions for agents

Тракия is a Dutch/English ⇄ Bulgarian sentence trainer (a static PWA in `app/`). Read `DESIGN.md`
for the architecture and data pipeline, `README.md` for how to run, test and publish, and
`decisions/README.md` for the list of features and their status.

## This repository is PUBLIC: never commit a secret

Everything committed here is public on GitHub, and the `gh-pages` branch is served to the world.
A secret pushed once stays in the history and in forks and caches even after a later commit
removes it.

- Never commit, push or publish a token, key, password or credential of any kind: GitHub tokens
  (`github_pat_…`, `ghp_…`, `gho_…`), the gist sync token (D-025), Azure or Google keys (an
  `AZURE_SPEECH_KEY` for D-005, D-033), private keys (`-----BEGIN … PRIVATE KEY-----`), `.env`
  files, cookies, or a person's personal data.
- Secrets live outside the repository only: in an environment variable, the learner's browser
  (`localStorage` `trakia.sync`, never in an export, snapshot or the gist), or a password manager.
  Code reads them from there; it never writes them into a file in the repository, `data/`, a log or
  a test fixture. Tests use obvious fakes (`github_pat_SECRET123`).
- Before every commit, look at what is staged (`git diff --cached`), not only at the files you
  meant to change. Never use `git add -A` or `git add .` blindly; add files by name or check the
  list first. `.gitignore` excludes common secret files (`*.env`, `*token*`, `*secret*`, `*.pem`,
  …); do not weaken it.
- If a secret is ever committed: stop, do not push (or stop pushing), tell the user at once, and
  have the secret revoked. Removing it from the history is not enough on its own.

## Every feature has a decision record

A **feature** is anything that adds or changes what the app does for the learner or how it decides
things: a new tab, setting, direction, drill or filter; a change to scheduling, checking,
eligibility, session building or feedback; a change to the data schema, the data pipeline or the
briefs the writing agents follow; a new tool in `tools/`.

Not a feature, so no record needed: a bug fix that restores the intended behaviour, visual polish
with no behaviour change, copy edits, icon or font changes, data corrections to individual
sentences, and tooling or dependency housekeeping. If such a change touches an existing record's
area, name the record id in the commit message.

Rules:

1. **Record first, code second.** Before changing code for a feature, find its record in
   `decisions/README.md` or create one, even when the user asked for the feature directly: copy
   `decisions/TEMPLATE.md` to `decisions/D-NNN-short-slug.md` (next free number, three digits,
   lowercase slug with hyphens), fill every section, and add a row to the table in
   `decisions/README.md`. Never create a feature without its row.
2. **Status** lives on line 3 of the record and in the README table; keep both in step. The flow is
   `proposed → accepted → in progress → done (YYYY-MM-DD)` or `rejected (YYYY-MM-DD)`. A record
   the user asked for directly starts as `accepted`; one you propose yourself stays `proposed` until
   the user says yes. Switch to `in progress` when the first commit for it lands.
3. **Same structure, always.** Exactly the sections of `decisions/TEMPLATE.md`, with those names,
   in that order, each with a body: Context, Proposal, Design notes, Acceptance criteria, Effort and
   risks, As built, Open questions. Under *As built* write "Not started." until work begins; the
   only allowed subsections are `### Decisions taken` and `### Measurements`, in that order.
4. **When the scope changes mid-way**, edit the Proposal to say what is now intended and note the
   change under *As built → Decisions taken*. Do not leave the record describing something that
   was never built.
5. **Finishing a feature**: set the status to `done (date)`; fill *As built* with what shipped and
   where it differs from the proposal, plus measurements if any; strike through every answered open
   question and add the answer (`- ~~Question?~~ Answer.`); update the README row; put the id at
   the start of the commit message (`D-012: …`). A feature is not done while the record says
   otherwise.
6. **Check before committing**: `python3 tools/check_decisions.py` must pass (`npm test` runs it).
   It fails on a missing or misnamed section, wrong order, a bad status line, a record missing from
   the README table, or a README status that disagrees with the file.

## Before committing anything

- Run `npm run build` after changing `data/*.json` or anything in `app/`: it regenerates
  `app/data.js` and stamps the service worker's cache version (a hash of the app files, D-032;
  never edit `CACHE_VERSION` by hand).
- `npm test` must pass: unit tests, the headless UI test, the `tsc` type check, the decision
  records, both data validators, and the freshness of `data.js` and the cache version. It names the
  fix when something is stale. The JavaScript is checked through JSDoc types; shared shapes live in
  `app/types.d.ts`. Annotate new code, do not silence errors with `any` unless a DOM API leaves no
  alternative. `tools/publish.sh` runs `npm test` and refuses to publish when it fails; GitHub
  Actions runs it on every push.
- Committing, pushing and publishing (`tools/publish.sh`) are separate steps the user asks for.
