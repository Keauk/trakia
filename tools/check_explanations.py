#!/usr/bin/env python3
"""Check the word-by-word explanations of the practice sentences (D-039):
    python3 tools/check_explanations.py                  data/explanations.json, an entry for every sentence (npm test)
    python3 tools/check_explanations.py --file B.json    one batch: only the sentences in that file
    python3 tools/check_explanations.py --partial        data/explanations.json, missing sentences allowed
An entry is {"note"?: str, "w": [{"f": form, "m": meaning here, "l"?: [labels], "e"?: changed ending, "n"?: note}, ...]},
one item per word of the sentence's `bg`, in order. Labels come from data/grammar_labels.json and must fit the word's
part of speech; noun forms are cross-checked with data/plurals.json and the article endings, verb forms in -х with
person and tense.
"""
import json, os, re, sys, unicodedata
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load = lambda f: json.load(open(f if os.sep in f else os.path.join(root, 'data', f), encoding='utf-8'))
args = sys.argv[1:]
file = args[args.index('--file') + 1] if '--file' in args else os.path.join(root, 'data', 'explanations.json')
partial = '--partial' in args or '--file' in args
words, sentences, plurals, labels = load('words.json'), load('sentences.json'), load('plurals.json'), load('grammar_labels.json')
entries = load(file) if os.path.exists(file) else {}

key = lambda s: unicodedata.normalize('NFC', s).lower()
tokens = lambda s: re.findall(r'[^\W\d_]+', unicodedata.normalize('NFC', s))   # as C.storyTokens: runs of letters
by_rank = {w['rank']: w for w in words}
by_bg = {}
for w in sorted(words, key=lambda w: w['rank']):
    by_bg.setdefault(key(w['bg']), w)
def deck_word(lemma):
    f, _, r = lemma.partition('#')
    return by_rank.get(int(r)) if r else by_bg.get(key(f))

def noun_needs(form, w):
    """the labels a noun form must carry: one of each inner set"""
    b, v = key(w['bg']), plurals.get(str(w['rank']))
    pl = v and key(v[0])
    if form == b or ' ' in b:
        return []
    stem = b[:-1] if b.endswith('й') else b
    end = form[len(stem):] if form.startswith(stem) else None
    sg = ([{'the-full'}] if end in ('ът', 'ят') and not b.endswith('й') or b.endswith('й') and end == 'ят' else
          [{'the'}] if end in ('та', 'то') else [{'the-short', 'count', 'the'}] if end in ('а', 'я') else [])
    if pl and form in (pl + 'те', pl + 'та'):
        return [{'pl'}, {'the'}]
    if pl and form == pl:   # крака: the plural, or the leg with the short article
        return [{'pl'} | sg[0]] if sg else [{'pl'}]
    return sg

CLITICS = {'ме', 'те', 'го', 'я', 'ни', 'ви', 'ги', 'ми', 'ти', 'му', 'ѝ', 'им', 'се', 'си', 'не'}
errors = []
by_id = {s['id']: s for s in sentences}
for sid in sorted(set(entries) - set(by_id)):
    errors.append(f'{sid}: no such sentence')
for s in sentences:
    e = entries.get(s['id'])
    if e is None:
        if not partial:
            errors.append(f'{s["id"]}: no explanation ({s["bg"]})')
        continue
    where = f'{s["id"]} ({s["bg"]})'
    if not isinstance(e, dict) or not isinstance(e.get('w'), list) or set(e) - {'w', 'note'}:
        errors.append(f'{where}: an entry is {{"note"?, "w": [...]}}')
        continue
    if 'note' in e and not (isinstance(e['note'], str) and 0 < len(e['note']) <= 220):
        errors.append(f'{where}: note is a string of 1–220 characters')
    toks = tokens(s['bg'])
    if [key(x.get('f', '')) for x in e['w'] if isinstance(x, dict)] != [key(t) for t in toks]:
        errors.append(f'{where}: the words are {toks}, the entry has {[x.get("f") for x in e["w"] if isinstance(x, dict)]}')
        continue
    wmap = s.get('words') or {}
    # after да / ще the verb is not the present tense: the first word with a person after the particle, short words skipped
    after = None
    yes = [m.end() < len(s['bg']) and s['bg'][m.end()] in ',!.' for m in re.finditer(r'[^\W\d_]+', unicodedata.normalize('NFC', s['bg']))]   # "Да," is yes
    for i, x in enumerate(e['w']):
        f = key(x.get('f', ''))
        if f in ('да', 'ще') and not (i < len(yes) and yes[i]):
            after = f
        elif after and f not in CLITICS:
            if 'pres' in (x.get('l') or []) and {'1sg', '2sg', '3sg', '1pl', '2pl', '3pl'} & set(x.get('l') or []):
                errors.append(f'{where}: {x["f"]} after {after} is not `pres`: give the person (and aspect) only')
            after = None
    for x in e['w']:
        f = key(x['f'])
        at = f'{where}: {x["f"]}'
        if set(x) - {'f', 'm', 'l', 'e', 'n'}:
            errors.append(f'{at}: unknown fields {sorted(set(x) - {"f", "m", "l", "e", "n"})}')
        if not (isinstance(x.get('m'), str) and 0 < len(x['m']) <= 40):
            errors.append(f'{at}: "m", the meaning here, is a string of 1–40 characters')
        ls = x.get('l', [])
        if not (isinstance(ls, list) and all(isinstance(l, str) for l in ls)) or len(ls) != len(set(ls)):
            errors.append(f'{at}: "l" is a list of different labels'); continue
        if 'e' in x and not (isinstance(x['e'], str) and x['e'] and len(x['e']) < len(f) and f.endswith(key(x['e']))):
            errors.append(f'{at}: "e" ({x.get("e")}) must be a shorter ending of the word')
        if 'n' in x and not (isinstance(x['n'], str) and 0 < len(x['n']) <= 180):
            errors.append(f'{at}: "n" is a string of 1–180 characters')
        w = deck_word(wmap[f]) if f in wmap else None
        for l in ls:
            if l not in labels:
                errors.append(f'{at}: unknown label {l}')
            elif w and ' ' not in w['bg'] and w['pos'] not in ('phrase', 'interj') and labels[l].get('pos') and w['pos'] not in labels[l]['pos']:   # кисело of кисело мляко is an adjective; a phrase or interjection (Извинете, Внимавай) can be any form
                errors.append(f'{at}: label {l} is for {"/".join(labels[l]["pos"])}, {w["bg"]} is a {w["pos"]}')
        if not w:
            continue
        if w['pos'] == 'noun':
            for need in noun_needs(f, w):
                if not need & set(ls):
                    errors.append(f'{at} (of {w["bg"]}): needs the label {" or ".join(sorted(need))}')
        if w['pos'] == 'verb' and f != key(w['bg']):
            for end, person in (('хме', '1pl'), ('хте', '2pl'), ('х', '1sg')):
                if f.endswith(end):
                    if person not in ls or not {'aor', 'impf', 'cond', 'sum-past'} & set(ls):
                        errors.append(f'{at} (of {w["bg"]}): a form in -{end} needs {person} and aor, impf, cond or sum-past')
                    break

for err in errors[:200]:
    print(err)
done = sum(1 for s in sentences if s['id'] in entries)
print(f'{len(errors)} errors in {os.path.basename(file)}' if errors else
      f'{os.path.basename(file)} OK: {len(entries)} entries' + ('' if partial else f', all {done} sentences explained'))
sys.exit(1 if errors else 0)
