# Trakia — Bulgarian sentence trainer, design

Goal: a Bulgaro-style typing trainer for Dutch ⇄ Bulgarian sentences that runs locally (laptop and
Android), tracks progress across unlimited daily sessions, accepts several correct answers, lets you
import your own sentence files, and only shows sentences built from words you have already reached
in the Anki deck *Bulgarian 2952 (mixed)*.

## 1. Recommendation in one paragraph

Build it as a **static web app with no build step** (`app/index.html` for markup and CSS, `app/ui.js` for the UI script, `app/core.js` for the logic; plain JavaScript checked by `tsc` through JSDoc types, D-013)
that is installable as a **PWA** on Android. It runs from a plain folder with
`python3 -m http.server`, works offline once installed, and stores progress in the browser
(`localStorage`, with JSON export/import for backups and for moving between laptop and phone).
This gets you a working trainer in a day, with zero Android tooling. If you later want a "real"
APK (Play-Store-style icon, no server step at all), wrap the same folder with Capacitor; nothing in
the app has to change. Native Android (Kotlin) is not worth it for this: the hard parts are data,
matching and scheduling, all of which are trivially done in JS.

## 2. What the deck tells us (and how alignment works)

The `.apkg` contains 2952 notes with fields `Bulgarian, English, Sentence_BG, Sentence_EN, POS,
Category, Rank, Forms`. The **Rank field is exactly the order in which Anki introduces new cards**
("mixed" order: function words first, then interleaved nouns/verbs/adjectives by topic). In the
export you gave me, ranks 1–102 have been studied; everything from 103 up is still new.

Alignment therefore reduces to one number: **your current Anki position N** (today: 102).

* `tools/export_anki_words.py deck.apkg` → `data/words.json`: every word with its rank, English
  meaning, POS, listed forms, and `learned: true/false`. Re-run it whenever you re-export the deck
  and the app picks up the new N automatically; or just move the slider in the app.
* Every sentence carries `lemmas` (the dictionary forms of the content words it uses) and a computed
  `max_rank` = the highest rank among those lemmas. A sentence is **eligible when
  `max_rank ≤ N + tolerance`** (tolerance default 0; set it to e.g. 20 if you want to be pulled
  slightly ahead of Anki).
* Because `max_rank` is derived from lemmas, not hard-coded, re-ordering the deck or importing a
  different word list just means re-running the validator.
* The app can show the "new-for-you" words of a sentence (rank > N) with a tooltip, so you can also
  practise slightly ahead in a "preview" mode without being penalised.

## 3. Data files and formats

```
trakia/
  DESIGN.md, README.md
  data/words.json          exported from the apkg (2952 entries, ordered by rank)
  data/sentences.json      2656 generated sentences (validated, with max_rank)
  tools/export_anki_words.py   apkg -> data/words.json
  tools/validate_sentences.py  generated JSON -> data/sentences.json (lemma check, max_rank, dedupe)
  tools/build_data.py          data/*.json -> app/data.js (run after any data change)
  tools/find_combinations.js   lists mixtures of two accepted answers that are not accepted yet (D-020)
  tools/test_core.js           unit tests for app/core.js  (node tools/test_core.js)
  tools/check_decisions.py     checks decisions/D-*.md against decisions/TEMPLATE.md and the README table
  tools/SENTENCE_BRIEF.md      the brief the sentence-writing agents followed
  app/index.html           the trainer UI: markup and CSS
  app/ui.js                the UI script (DOM, sessions, settings, library, stats); was inline until D-013
  app/types.d.ts           shared shapes for the type check (Sentence, Settings, ProgressRecord, ...)
  app/core.js              pure logic: normalise, check, diff, translit, scheduling, import parsing
  app/data.js              generated bundle of words + sentences (so file:// and offline work)
  app/manifest.json, app/sw.js, app/icon*.{svg,png}   PWA install + offline cache
```

### 3.1 Sentence record (`data/sentences.json`, also the JSON upload format)

```json
{
  "id": "B017",
  "bg": "Утре ще ходя на пазар с майка ми.",
  "nl": "Morgen ga ik met mijn moeder naar de markt.",
  "nl_alt": ["Morgen ga ik naar de markt met mijn moeder."],
  "bg_alt": ["Утре ще отида на пазар с майка ми."],
  "en": "Tomorrow I'll go to the market with my mother.",
  "en_alt": ["Tomorrow I'm going to the market with my mother."],
  "en_loose": ["Tomorrow I'll go shopping with my mother."],
  "lemmas": ["утре", "ходя", "пазар", "с", "майка", "мой"],
  "max_rank": 231,
  "tags": ["shopping", "future", "family"],
  "source": "generated-2026-10"
}
```

Only `bg` and `nl` are mandatory in an upload; everything else is optional. `lemmas` is what makes
rank-filtering precise. If a row has no lemmas, the importer falls back to matching the lowercase
tokens of `bg` against the word list (dictionary forms + the `Forms` column); tokens it cannot match
are ignored, so `max_rank` may be too low. Such rows get `"rank_estimated": true` and show a small
"≈" badge so you know the filter is approximate.

### 3.2 Excel / CSV upload

One sheet, header row, one sentence per row. Column names are matched case-insensitively:

| column    | required | notes                                                     |
|-----------|----------|-----------------------------------------------------------|
| `bg`      | yes      | Bulgarian sentence                                        |
| `nl`      | yes      | primary Dutch translation                                 |
| `nl_alt`  | no       | extra accepted Dutch answers, separated by ` \| `          |
| `bg_alt`  | no       | extra accepted Bulgarian answers, separated by ` \| `      |
| `en`      | no       | English gloss                                             |
| `en_alt`  | no       | extra accepted English answers, separated by ` \| `       |
| `nl_loose`, `en_loose` | no | looser accepted answers (shown with "≈ looser", D-014), ` \| ` |
| `bg_alt_en` | no      | Bulgarian answers accepted only for the English prompt: the other "you" form (ти/вие, D-018), ` \| ` |
| `lemmas`  | no       | dictionary forms separated by `, `                        |
| `tags`    | no       | separated by `, `                                         |
| `id`      | no       | stable id; generated from a hash of `bg` if missing       |

XLSX is read in the browser with SheetJS (`xlsx.full.min.js`, one `<script>` tag, loaded from a CDN
or vendored next to `index.html` for offline use); CSV/TSV is parsed with a 20-line parser. Import
is a **merge**: existing ids keep their progress, new ids are added, changed text is updated.

### 3.3 Progress record (one per sentence *per direction*)

```json
"B017|nl2bg": { "box": 3, "due": 1761052800000, "reps": 5, "lapses": 1,
                "last": 1761031200000, "streak": 2,
                "hist": [[1761031200000, 1, "Утре ще ходя на пазар с майка ми"]] }
```

Stored as one JSON blob in `localStorage` under `trakia.progress` (1000 sentences × 2 directions ×
~150 bytes ≈ 300 KB; well under the 5 MB limit). Settings in `trakia.settings`, user-added accepted
answers in `trakia.userAlts`. **Export / Import progress** buttons write/read a single JSON file so the
laptop and the phone can be kept in sync manually (sync is deliberately out of scope).

## 4. Core behaviours

### 4.1 Answer checking ("multiple answers can be correct")

Three layers, in order:

1. **Normalisation** of both the typed answer and every accepted answer: Unicode NFC, trim,
   lowercase, collapse spaces, strip all punctuation and quotes (`.,!?;:…«»"'-–—`), map `ѝ → и`
   (the stressed ѝ is impossible to type on most keyboards), and for Dutch optionally strip accents
   (`één → een`). Settings let you make punctuation or ѝ strict again.
2. **Exact match** against the primary answer, the `*_alt` list (for an English prompt also
   `bg_alt_en`, D-018), and your own accepted answers (`userAlts`). → *Correct*. Then against
   the *looser* translations `nl_loose` / `en_loose` (D-014, D-017): right, but not a faithful
   translation of the Bulgarian (drift in number, definiteness, tense, structure or word choice;
   the exact tier holds only answers a teacher would mark with no comment). → *Correct* with a
   "≈ looser" tag; the expected line, labelled "→ Exact translation", then shows the closest
   exact answer, highlighted against what was typed.
3. **Near miss**: Damerau-Levenshtein distance to the closest accepted answer. If
   `distance ≤ max(1, round(0.08 × length))` (≈ one typo per 12 characters) → *Almost*: shown as
   correct with the differing characters highlighted, counts as correct for scheduling but does
   not advance the box. (D-002 has since staged this by card maturity.) A near miss that is really a
   different word form (Sunday/Sundays, книга/книгата, in/on, a missing or extra word; "real word"
   = it occurs in the corpus) is *Wrong*, not *Almost* (D-014, setting *A wrong word form is an
   error*). Above that → *Wrong*, and the alternatives are listed behind a toggle.

The result bar (D-015) shows the verdict in its colour (green correct, amber almost, red wrong,
blue "→ Answer" after *Don't know*) and the expected sentence with the words that differ from the
typed answer highlighted (`wordMarks`: word-level LCS, case-sensitive, surrounding punctuation
ignored). The typed answer stays visible in the read-only field directly above it. This replaced
the earlier inline `<ins>/<del>` character diff.

After a *Wrong* there is always a **"My answer was correct"** button. It adds your typed answer to
`userAlts` for that sentence+direction, re-scores the attempt as correct, and the alternative is
included in the "Export sentences" file, so the dataset improves as you use it. This is the honest
way to handle "multiple answers can be correct if they make sense": the generated alternatives
cover the common variants, and you adjudicate the long tail.

Bulgarian word order is flexible; to avoid rejecting good answers the checker also tries a
**bag-of-words match** for the Bulgarian direction (same multiset of normalised tokens as an
accepted answer) and treats that as *Almost* rather than *Wrong*. Enable/disable in settings.

### 4.2 Scheduling (unlimited sessions per day)

> Superseded 2026-10-22 by decision D-001: scheduling is now FSRS-6 (see `decisions/D-001-fsrs-scheduler.md`).
> The ladder below is kept for history; its intervals survive only as the migration table.

Day-granular SRS like Anki is the wrong fit when you want to practise several times a day, so use
a **minute-granular Leitner ladder**:

| box | interval after a correct answer |
|-----|----------------------------------|
| 0   | 0 (again this session)           |
| 1   | 10 min                           |
| 2   | 1 h                              |
| 3   | 6 h                              |
| 4   | 1 day                            |
| 5   | 3 days                           |
| 6   | 7 days                           |
| 7   | 16 days                          |
| 8   | 35 days (= "mastered")           |

Correct → box+1; Almost → same box, interval re-applied; Wrong → box = max(0, box−2) and due now.
Intervals get ±10 % jitter so cards don't clump.

**Session builder** (the "Practise" button):

A session holds `sessionSize` cards (default 20), one per sentence, and skips a sentence answered
in the last 4 hours (D-024):

1. reviews first: cards with `due ≤ now`, most forgotten first; while more are due than fit, the
   session is reviews plus 2 new cards,
2. once the due reviews fit, unseen cards with `max_rank ≤ N + tolerance` fill the free places, at
   most `newPerSession` (default 10); if fewer new cards are available, more due cards fill the session,
3. if nothing is due and no new cards are left: **free practice** — a random mix of the lowest
   boxes; answers still update the record but never push `due` further out than it already is, so
   extra sessions never "waste" a review.

Directions are separate cards: `bg2nl` (read Bulgarian, type Dutch) and `nl2bg` (read Dutch, type
Bulgarian). Setting *Direction mix*: BG→NL only, NL→BG only, both, or "NL→BG unlocks after the
BG→NL card has been answered correctly once" (default; recognition before production).

### 4.3 Progress tracking (Stats tab)

* today: sessions, answers, accuracy, minutes; 7-day and 30-day bars (one `<canvas>`, no library)
* per direction: unseen / learning (box 1–4) / known (5–7) / mastered (8) counts
* coverage vs Anki: of the sentences eligible at your current N, how many are known
* streak (consecutive days with ≥1 session)
* "hardest 20" (most lapses) with a *drill these* button
* all numbers derived on the fly from the progress blob; nothing to keep in sync

### 4.4 Rank alignment UI

A slider/number input *"I'm at word … in Anki"* (default from `words.json`'s learned count, i.e.
102), a *tolerance* field, and a read-out: "eligible sentences: 184 of 1000 (next unlock at rank
118: *ресторант*)". Optional: a **"Re-import deck"** file picker: the app cannot read `.apkg`
itself (zstd + SQLite in the browser is possible but heavy), so you run the Python tool and pick
the resulting `words.json`; the slider updates. In practice the slider is enough.

### 4.5 Typing Cyrillic

* Android: add *Bulgarian* to Gboard (BDS or phonetic layout) and switch with the globe key.
* Laptop: add a Bulgarian (phonetic) layout in your OS; or use the app's optional
  **transliteration mode**: type Latin (`kupih hlqb i mlqko`) and the input converts to Cyrillic
  as you type (standard phonetic mapping: q→я, w→в… configurable; `sht`→щ, `yu`→ю, `ya`→я, `ch`→ч,
  `sh`→ш, `zh`→ж, `ts`→ц, `y`→ъ). A row of on-screen keys for ъ ь щ ю я ѝ helps in either mode.
* Answers are compared after normalisation, so the layout you use does not matter.

## 5. Getting it onto your phone (running locally)

**Option A — PWA (recommended, no tooling):**

```bash
cd ~/dev/trakia/app
python3 -m http.server 8080 --bind 0.0.0.0   # on the laptop; find its IP with: hostname -I
```

Phone on the same Wi-Fi → Chrome → `http://<laptop-ip>:8080` → menu → *Add to Home screen*.
With `manifest.json` + a service worker that caches `index.html`, `sentences.json`, `words.json`
(and the SheetJS file) the installed app opens full-screen and works offline; the laptop server is
only needed again when you ship a new version (bump `CACHE_VERSION` in `sw.js`). Progress lives in
the phone's own browser storage; use Export/Import to copy it to the laptop.

**Option B — serve it on the phone itself:** install Termux, `pkg install python`, copy the folder,
`python -m http.server`, open `http://localhost:8080`. Same PWA install step; no laptop needed.

**Option C — real APK with Capacitor** (when you want an icon without the server step):
`npm init @capacitor/app`, point `webDir` at `app/`, `npx cap add android`,
`npx cap open android`, build the APK in Android Studio, side-load it. Storage still works the
same (WebView localStorage), and you can later add the Filesystem plugin for export/import to the
Downloads folder. Estimated: half a day the first time, mostly installing Android Studio.

On the laptop, simply opening `app/index.html` as a file also works in Firefox/Chrome (localStorage
is per-file-origin; the service worker is skipped). Use the http.server route if you want the
same behaviour as on the phone.

## 6. Implementation plan (milestones)

| # | milestone | what is done | effort |
|---|-----------|--------------|--------|
| 0 | data | `words.json` export, 2656 generated sentences (validated, `max_rank` computed) | done |
| 1 | core loop | rank slider, pick sentence, type answer, check (normalise + exact + near-miss), correct/almost/wrong verdict with diff, progress in localStorage | done |
| 2 | scheduling + stats | Leitner ladder, session builder, free practice, stats tab with 14-day chart, export/import progress | done |
| 3 | import + adjudication | JSON/CSV/XLSX import with merge, "my answer was correct", export merged sentence set, delete/restore | done |
| 4 | PWA | manifest, service worker, icons, install on Android | done (bump `CACHE_VERSION` in `sw.js` on each release) |
| 5 | nice-to-have | transliteration input (done), dark mode (done); TTS via Web Speech API (`bg-BG` voice on Android), Anki's own 2952 example sentences translated to Dutch as a second pack, edit-in-place in the Library | later |

Suggested `index.html` structure (all in one file, ~900 lines total when finished):

```
<header> wordmark · tabs (a bottom tab bar on phones, D-015) · deck position · light/dark switch (D-016)
<main id=practise>  prompt card (sentence, direction badge, new-word tooltips)
                    <input> or <textarea> + on-screen helper keys
                    session progress bar (one segment per card)
                    result bar (correct / almost / wrong / revealed + word highlights + alternatives + "I was right")
<main id=stats>     numbers + 1 canvas chart + hardest list
<main id=library>   table of sentences with filter (eligible / all / tag), import/export buttons
<main id=settings>  rank slider, tolerance, direction mix, new per session, strictness toggles
<script>  state (load/save) · normalise · levenshtein · diff · check() · schedule() ·
          buildSession() · render*() · importers (json/csv/xlsx) · exporters
```

State shape:

```js
state = {
  words: [...],                        // from words.json
  sentences: {id: {...}},              // from sentences.json + imports
  progress: {"B017|nl2bg": {...}},     // §3.3
  userAlts: {"B017|nl2bg": ["..."]},
  settings: {rank: 102, tolerance: 0, sessionSize: 20, newPerSession: 10,
             directions: "gated", strictPunct: false, strictYi: false,
             nearMiss: true, bagOfWords: true, translit: false},
  session: {queue: [...], i: 0, correct: 0, startedAt: ...}
}
```

## 7. Notes on the generated sentences

* Written by five parallel agents, each restricted to a cumulative vocabulary band of the deck
  (ranks 1–150, 1–300, 1–600, 1–1200, 1–2952) and told to prefer the upper part of its band, so
  the 1000 sentences are spread across the whole deck and unlock progressively.
* `tools/validate_sentences.py` resolves every listed lemma against the deck (dictionary form or any
  form in the `Forms` column), computes `max_rank`, drops duplicates and reports lemmas it cannot
  find. The report is in the chat summary; unresolved lemmas are kept in the record so you can fix
  them in the Library tab or in the JSON.
* They are LLM-written. Expect a few unnatural phrasings; the "My answer was correct" button plus
  a Library edit form are the cheap fix. If a sentence is wrong, delete it from the Library (deleted
  ids are remembered so a re-import does not bring them back).
