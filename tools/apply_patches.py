#!/usr/bin/env python3
"""Apply reviewer patch files to data/sentences.json, then re-validate.

Usage: python3 tools/apply_patches.py data/sentences.json patches/*.json [-o data/sentences.json]

Patch file: JSON array of {"id": ..., "<field>": <new value>, ..., "drop": true?, "reason": "..."}.
Fields bg, nl, nl_alt, bg_alt, bg_alt_en, en, en_alt, nl_loose, en_loose, lemmas, tags replace the old value entirely. "drop": true removes
the sentence. After patching, lemmas are re-resolved against data/words.json (via
validate_sentences.py) so max_rank stays correct; unresolved lemmas are reported.
"""
import json, sys, os, subprocess, tempfile
FIELDS = ('bg', 'nl', 'nl_alt', 'bg_alt', 'bg_alt_en', 'en', 'en_alt', 'nl_loose', 'en_loose', 'lemmas', 'tags')

def main(argv):
    out = None
    if '-o' in argv:
        i = argv.index('-o'); out = argv[i + 1]; del argv[i:i + 2]
    src, *patch_files = argv
    out = out or src
    sentences = json.load(open(src, encoding='utf-8'))
    by_id = {s['id']: s for s in sentences}
    changed, dropped, unknown, bad = set(), set(), [], []
    for pf in patch_files:
        try:
            patches = json.load(open(pf, encoding='utf-8'))
        except Exception as e:
            bad.append(f'{pf}: {e}'); continue
        for p in patches:
            s = by_id.get(p.get('id'))
            if not s:
                unknown.append(p.get('id')); continue
            if p.get('drop'):
                dropped.add(s['id']); continue
            for f in FIELDS:
                if f in p and p[f] != s.get(f):
                    s[f] = p[f]; changed.add(s['id'])
    result = [s for s in sentences if s['id'] not in dropped]
    tmp = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8')
    json.dump(result, tmp, ensure_ascii=False); tmp.close()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    words = os.path.join(root, 'data', 'words.json')
    r = subprocess.run([sys.executable, '-I', os.path.join(root, 'tools', 'validate_sentences.py'), words, tmp.name, '-o', out], capture_output=True, text=True)
    os.unlink(tmp.name)
    print(f'{len(changed)} sentences changed, {len(dropped)} dropped, {len(result)} remain -> {out}')
    if unknown: print('unknown ids in patches:', unknown)
    if bad: print('unreadable patch files:', *bad, sep='\n  ')
    print(r.stdout.strip())
    if r.returncode: print(r.stderr)

if __name__ == '__main__':
    main(sys.argv[1:])
