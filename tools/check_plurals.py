#!/usr/bin/env python3
"""Check data/plurals.json, the plural of every deck noun for the sneak peek (D-037):
    python3 tools/check_plurals.py
Fails when a noun has no key or another word has one, a value is not null or [Bulgarian, English],
the Bulgarian differs from the plural in the deck's Forms column, or a sentence uses a plural form
(-и, or -те with the article) of a noun that the file does not give.
"""
import json, os, re, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load = lambda f: json.load(open(os.path.join(root, 'data', f), encoding='utf-8'))
words, sentences, plurals = load('words.json'), load('sentences.json'), load('plurals.json')
key = lambda s: s.strip().lower()

# brackets in the Forms column that complete the name instead of giving the plural: май (месец), микровълнова (фурна), …
NOT_PLURAL = {1099, 1623, 1949, 2307}
errors = []
nouns = {str(w['rank']): w for w in words if w['pos'] == 'noun'}
for r in sorted(set(nouns) - set(plurals), key=int):
    errors.append(f'word {r} {nouns[r]["bg"]}: a noun without a key (give [plural, English plural] or null)')
for r in sorted(set(plurals) - set(nouns), key=int):
    errors.append(f'word {r}: a key for a word that is not a noun')
for r, v in plurals.items():
    w = nouns.get(r)
    if v is not None and not (isinstance(v, list) and len(v) == 2 and all(isinstance(x, str) and x.strip() for x in v)):
        errors.append(f'word {r}: {v!r} is not null or [Bulgarian, English]')
        continue
    m = w and re.match(re.escape(w['bg']) + r' \(([^()/,;]+)\)', w['forms'])
    if m and int(r) not in NOT_PLURAL and (v is None or key(v[0]) != key(m.group(1))):
        errors.append(f'word {r} {w["bg"]}: the deck gives the plural {m.group(1)}, the file {v and v[0]}')

# the sentences' plural forms: a form ending in -и or -те that is not the dictionary form must be the plural, with or without the article
# (one-word nouns only: a sentence maps each word of бял дроб or четка за зъби to the whole noun)
by_bg, by_rank = {}, {w['rank']: w for w in words}
for w in sorted(words, key=lambda w: w['rank']):
    by_bg.setdefault(key(w['bg']), w)
for s in sentences:
    for form, lemma in (s.get('words') or {}).items():
        f, _, r = lemma.partition('#')
        w = by_rank.get(int(r)) if r else by_bg.get(key(f))
        if not w or w['pos'] != 'noun' or ' ' in w['bg'] or form == key(w['bg']) or not re.search(r'(и|те)$', form):
            continue
        v = plurals.get(str(w['rank']))
        pl = v and key(v[0])
        if form not in (pl, f'{pl}те', f'{pl}та'):
            errors.append(f'{s["id"]}: {form} (word {w["rank"]} {w["bg"]}) is not the plural {pl} in data/plurals.json')

for e in errors:
    print(e)
given = sum(1 for v in plurals.values() if v)
print(f'{len(errors)} errors; {given} nouns with a plural, {len(plurals) - given} without' if errors else
      f'data/plurals.json OK: {given} nouns with a plural, {len(plurals) - given} without')
sys.exit(1 if errors else 0)
