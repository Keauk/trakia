#!/usr/bin/env python3
"""Report how many sentences each deck word appears in, and list the gaps.

Usage: python3 tools/coverage.py [--min 2] [--max-rank 1200] [--tsv gaps.tsv]

Counts, per deck word, the sentences whose `lemmas` list resolves to that word (dictionary form
or a form from the deck's Forms column; the validator's rules). Prints a per-band table and, with
--tsv, writes the words that appear in fewer than --min sentences (up to --max-rank) as
  rank <TAB> bulgarian <TAB> english <TAB> pos <TAB> have <TAB> need
"""
import json, os, re, sys, unicodedata
from collections import Counter

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def norm(s):
    return unicodedata.normalize('NFC', s).strip().lower().replace('ѝ', 'и')

def main(argv):
    opts = {'--min': '2', '--max-rank': '2952', '--tsv': None}
    i = 0
    while i < len(argv):
        if argv[i] in opts: opts[argv[i]] = argv[i + 1]; i += 2
        else: sys.exit(__doc__)
    need_min, max_rank = int(opts['--min']), int(opts['--max-rank'])
    words = json.load(open(os.path.join(root, 'data/words.json'), encoding='utf-8'))
    sents = json.load(open(os.path.join(root, 'data/sentences.json'), encoding='utf-8'))
    idx = {}
    for w in words:
        keys = {norm(w['bg'])}
        for part in re.split(r'[(),/;]', w.get('forms', '')):
            if part.strip(): keys.add(norm(part))
        for k in keys:
            if k not in idx or w['rank'] < idx[k]: idx[k] = w['rank']
    count = Counter()
    for s in sents:
        ranks = set()
        for l in s['lemmas']:
            l = norm(l.split('#')[0])
            if l in idx: ranks.add(idx[l])
        for r in ranks: count[r] += 1
    print(f'{len(sents)} sentences, {len(words)} words')
    print(f'{"band":>10}  {"words":>5}  {">=1":>5}  {">=2":>5}  {">=3":>5}')
    for lo, hi in ((1, 300), (301, 600), (601, 1200), (1201, 2000), (2001, 2952)):
        ws = [w for w in words if lo <= w['rank'] <= hi]
        c = lambda k: sum(1 for w in ws if count[w['rank']] >= k)
        print(f'{lo:>5}-{hi:<4}  {len(ws):>5}  {c(1):>5}  {c(2):>5}  {c(3):>5}')
    gaps = [w for w in words if w['rank'] <= max_rank and count[w['rank']] < need_min]
    deficit = sum(need_min - count[w['rank']] for w in gaps)
    print(f'\n{len(gaps)} words up to rank {max_rank} appear in fewer than {need_min} sentences (total deficit {deficit} sentence slots)')
    if opts['--tsv']:
        with open(opts['--tsv'], 'w', encoding='utf-8') as fh:
            fh.write('rank\tbulgarian\tenglish\tpos\thave\tneed\n')
            for w in gaps:
                fh.write(f"{w['rank']}\t{w['bg']}\t{w['en']}\t{w['pos']}\t{count[w['rank']]}\t{need_min - count[w['rank']]}\n")
        print('gap list written to', opts['--tsv'])

if __name__ == '__main__':
    main(sys.argv[1:])
