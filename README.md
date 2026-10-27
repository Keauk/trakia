# Тракия (Trakia)

Dutch/English ⇄ Bulgarian sentence trainer, aligned with the Anki deck *Bulgarian 2952 (mixed)*.
See [DESIGN.md](DESIGN.md) for the design and how to run it.

```
data/words.json        word list exported from the Anki deck (ordered by Rank = study order)
data/grammar.json      grammar reference tables and drill paradigms (Grammar tab)
data/sentences.json    practice sentences with Dutch translations, alternatives and max_rank (reviewed twice; see data/REVIEW_CHANGES.md)
tools/                 export_anki_words.py, validate_sentences.py, build_data.py, build_audio.py, find_combinations.js, check_decisions.py, publish.sh, tests
decisions/             decision log, one record per feature (see decisions/README.md and CLAUDE.md)
app/                   the PWA: index.html (markup + CSS), ui.js (UI script), core.js (logic), types.d.ts (shared shapes), data.js (generated bundle), audio/ (spoken clips, D-005), sw.js, manifest.json, fonts/ (bundled woff2 subsets, OFL.txt)
```

## Run

```bash
cd ~/dev/trakia/app && python3 -m http.server 8080 --bind 0.0.0.0
```
Laptop: open http://localhost:8080. Phone (same Wi-Fi): open http://<laptop-ip>:8080 in Chrome,
menu → *Add to Home screen*. After that it works offline. Opening `app/index.html` directly as a
file also works on the laptop.

## Develop

```bash
npm install                                   # once: jsdom for the headless UI test
npm run build                                 # after editing data/*.json or app/: regenerate app/data.js, stamp the cache version
npm test                                      # everything below, plus unit tests (incl. FSRS reference vectors), headless UI test, type check
npm run check                                 # records, data validators, data.js and cache version up to date (fast, no JS tests)
npm run typecheck                             # tsc --noEmit over app/core.js and app/ui.js (JSDoc types, see app/types.d.ts)
.venv/bin/python tools/build_audio.py         # after editing sentences, words or stories: speak the new texts (D-005)
python3 tools/export_anki_words.py deck.apkg  # refresh data/words.json from a new Anki export
```
The service worker's `CACHE_VERSION` is a hash of the app files, written by `npm run build`, so
installed phones pick up every new version; `npm test` fails when it is stale (D-032). GitHub
Actions runs `npm test` on every push.

Audio (D-005) comes from Microsoft's neural voices through `edge-tts`; set it up once with
`python3 -m venv .venv && .venv/bin/pip install -r tools/requirements-audio.txt`. `npm test` fails
while a clip is missing or unused and names the command that fixes it.

## Publish (GitHub Pages)

The site https://keauk.github.io/trakia/ is served from the `gh-pages` branch, which holds only the
`app/` folder. After committing on `main`:

```bash
tools/publish.sh
```

It runs `npm test` first and publishes nothing when a check fails (D-032).
