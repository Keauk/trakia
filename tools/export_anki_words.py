#!/usr/bin/env python3
"""Export the word list of an Anki .apkg (the 'Bulgarian 2952 (mixed)' deck) to data/words.json.

Usage:  python3 tools/export_anki_words.py "path/to/deck.apkg" [data/words.json]

Output: a JSON array ordered by the deck's Rank field (= the order in which Anki introduces new
cards), one object per note:
  {"rank": 1, "bg": "и", "en": "and", "pos": "conj", "cat": "conjunction", "forms": "",
   "sentence_bg": "...", "sentence_en": "...", "learned": true}
'learned' is true when the note has at least one card that is no longer 'new' in the export, so
it tells the app where you are in Anki right now (the app lets you override this with a slider).
"""
import json, sqlite3, subprocess, sys, tempfile, zipfile, os, shutil

def main(apkg, out='data/words.json'):
    tmp = tempfile.mkdtemp()
    try:
        with zipfile.ZipFile(apkg) as z:
            z.extractall(tmp)
        if os.path.exists(os.path.join(tmp, 'collection.anki21b')):
            # new-style export: zstd-compressed sqlite
            db = os.path.join(tmp, 'collection.sqlite')
            subprocess.run(['zstd', '-d', '-q', os.path.join(tmp, 'collection.anki21b'), '-o', db], check=True)
        else:
            db = os.path.join(tmp, 'collection.anki21' if os.path.exists(os.path.join(tmp, 'collection.anki21')) else 'collection.anki2')
        con = sqlite3.connect(db)
        learned = {nid for (nid,) in con.execute('select distinct nid from cards where type != 0')}
        rows = []
        for nid, flds in con.execute('select id, flds from notes'):
            f = flds.split('\x1f')
            if len(f) < 8:
                continue
            rows.append({'rank': int(f[6]), 'bg': f[0], 'en': f[1], 'pos': f[4], 'cat': f[5],
                         'forms': f[7], 'sentence_bg': f[2], 'sentence_en': f[3], 'learned': nid in learned})
        rows.sort(key=lambda r: r['rank'])
        os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
        with open(out, 'w', encoding='utf-8') as fh:
            json.dump(rows, fh, ensure_ascii=False, indent=0)
        n_learned = sum(r['learned'] for r in rows)
        print(f'{len(rows)} words written to {out}; {n_learned} marked learned (highest learned rank: '
              f'{max((r["rank"] for r in rows if r["learned"]), default=0)})')
    finally:
        shutil.rmtree(tmp)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(*sys.argv[1:3])
