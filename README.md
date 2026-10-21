# Trakia

Dutch ⇄ Bulgarian sentence trainer, aligned with the Anki deck *Bulgarian 2952 (mixed)*.
See [DESIGN.md](DESIGN.md) for the design and how to run it.

```
data/words.json        word list exported from the Anki deck (ordered by Rank = study order)
data/sentences.json    practice sentences with Dutch translations, alternatives and max_rank (reviewed twice; see data/REVIEW_CHANGES.md)
tools/                 export_anki_words.py, validate_sentences.py
app/                   the PWA: index.html (UI), core.js (logic), data.js (generated bundle), sw.js, manifest.json
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
node tools/test_core.js                       # unit tests for the matching / scheduling logic
python3 tools/build_data.py                   # regenerate app/data.js after editing data/*.json
python3 tools/export_anki_words.py deck.apkg  # refresh data/words.json from a new Anki export
```
After changing index.html, core.js or data.js, bump `CACHE_VERSION` in `app/sw.js` so installed
phones pick up the new version.

## Publish (GitHub Pages)

The site https://keauk.github.io/trakia/ is served from the `gh-pages` branch, which holds only the
`app/` folder. After committing on `main`:

```bash
tools/publish.sh
```
