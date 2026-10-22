#!/usr/bin/env python3
"""Validate and merge generated sentence files into data/sentences.json.

Usage:  python3 tools/validate_sentences.py data/words.json out/A.json out/B.json ... -o data/sentences.json

For every sentence it:
  * checks required fields (id, bg, nl, lemmas) and types,
  * resolves each lemma against the word list (dictionary form, or any form listed in the
    'forms' column, case-insensitive),
  * computes max_rank = highest rank among resolved lemmas (the sentence becomes available in the
    app once your Anki position >= max_rank),
  * drops exact duplicate Bulgarian sentences,
  * reports unknown lemmas so they can be fixed or mapped.
Sentences whose lemmas cannot all be resolved keep max_rank from the resolved ones and get
"unresolved": [...] so the app (or you) can decide what to do with them.
"""
import json, re, sys, unicodedata
from collections import Counter

def norm(s):
    s = unicodedata.normalize('NFC', s).strip().lower()
    s = s.replace('ѝ', 'и')
    return s

# Words the deck lists twice with different meanings. When the sentence's English gloss contains
# one of the hint words the higher-ranked sense is chosen; otherwise the lower rank is used.
# A lemma can also be disambiguated explicitly as "под#413".
SENSE_HINTS = {
    ('под', 413): ('under', 'below', 'beneath', 'underneath'),
    ('син', 2433): ('blue',),
    ('моля', 548): ('ask', 'request', 'beg', 'plead'),
    ('май', 1325): ('probably', 'seem', 'think', 'guess', 'maybe', 'apparently', 'i suppose'),
    ('лъжа', 1082): ('a lie', 'the lie', 'lies ', 'his lie', 'her lie', 'that lie', 'white lie'),
}

def build_index(words):
    # exact dictionary forms win over inflected forms listed in the Forms column
    # (e.g. "те" = they, rank 47, not the accusative of "ти"); forms are the fallback
    exact, forms = {}, {}
    for w in words:
        k = norm(w['bg'])
        if k not in exact or w['rank'] < exact[k]:
            exact[k] = w['rank']
        # forms like "аз (ме, мен, ми)" or "съм / бъда" or "в (във)"
        for part in re.split(r'[(),/;]', w.get('forms', '')):
            part = norm(part)
            if part and (part not in forms or w['rank'] < forms[part]):
                forms[part] = w['rank']
    idx = dict(forms); idx.update(exact)
    return idx

# words a sentence may use without listing them (see BRIEF.md): never block on these
FREE = {'ли', 'не', 'да', 'ще', 'съм', 'си', 'е', 'сме', 'сте', 'са', 'се', 'бях', 'беше', 'бяхме', 'бяха',
        'по', 'най', 'ѝ', 'и'}

def resolve_lemma(lem, idx, en=''):
    """rank of a lemma as written in a sentence's lemma list, or None. Honours "lemma#rank" and the
    homograph sense hints (checked against the sentence's English gloss)."""
    n = norm(lem)
    if '#' in n:
        n, _, forced = n.partition('#')
        return int(forced)
    if n not in idx:
        return None
    r = idx[n]
    for (word, hi), hints in SENSE_HINTS.items():
        if n == word and any(h in (en or '').lower() for h in hints):
            r = hi
    return r

def main(argv):
    out = 'data/sentences.json'
    if '-o' in argv:
        i = argv.index('-o'); out = argv[i + 1]; del argv[i:i + 2]
    words_path, *files = argv
    words = json.load(open(words_path, encoding='utf-8'))
    idx = build_index(words)
    merged, seen, unknown, problems = [], set(), Counter(), []
    for path in files:
        try:
            data = json.load(open(path, encoding='utf-8'))
        except Exception as e:
            problems.append(f'{path}: cannot parse JSON: {e}'); continue
        for s in data:
            sid = s.get('id', '?')
            for k in ('id', 'bg', 'nl', 'lemmas'):
                if k not in s:
                    problems.append(f'{sid} ({path}): missing field {k}')
            if any(k not in s for k in ('id', 'bg', 'nl', 'lemmas')):
                continue
            key = norm(re.sub(r'[^\w\s]', '', s['bg']))
            if key in seen:
                problems.append(f'{sid}: duplicate of an earlier sentence, dropped'); continue
            seen.add(key)
            ranks, unresolved = [], []
            for lem in s['lemmas']:
                r = resolve_lemma(lem, idx, s.get('en', ''))
                if r is not None:
                    ranks.append(r)
                elif norm(lem) in FREE:
                    pass
                else:
                    unresolved.append(lem); unknown[lem] += 1
            rec = {
                'id': s['id'], 'bg': s['bg'].strip(), 'nl': s['nl'].strip(),
                'nl_alt': [a.strip() for a in s.get('nl_alt', []) if a.strip()],
                'bg_alt': [a.strip() for a in s.get('bg_alt', []) if a.strip()],
                'en_alt': [a.strip() for a in s.get('en_alt', []) if a.strip()],
                'en': s.get('en', '').strip(), 'lemmas': s['lemmas'],
                'max_rank': max(ranks) if ranks else None,
                'tags': s.get('tags', []), 'source': s.get('source') or 'generated-2026-10',
            }
            for loose in ('nl_loose', 'en_loose', 'bg_alt_en'):   # looser translations (D-014); BG for the English prompt only (D-018)
                if any(a.strip() for a in s.get(loose, [])):
                    rec[loose] = [a.strip() for a in s[loose] if a.strip()]
            for extra in ('grammar', 'note', 'rank_estimated'):   # pass-through fields
                if s.get(extra) not in (None, [], ''):
                    rec[extra] = s[extra]
            if unresolved:
                rec['unresolved'] = unresolved
            merged.append(rec)
    merged.sort(key=lambda r: (r['max_rank'] or 10**6, r['id']))
    json.dump(merged, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    n_unres = sum(1 for r in merged if 'unresolved' in r)
    print(f'{len(merged)} sentences written to {out}; {n_unres} with unresolved lemmas')
    bands = Counter((r['max_rank'] or 0) // 300 * 300 for r in merged)
    print('max_rank distribution (bucket start -> count):', dict(sorted(bands.items())))
    if problems:
        print(f'\n{len(problems)} problems:'); print('\n'.join(problems[:60]))
    if unknown:
        print(f'\n{len(unknown)} distinct unresolved lemmas (most frequent first):')
        print(', '.join(f'{k}×{v}' for k, v in unknown.most_common(80)))

if __name__ == '__main__':
    main(sys.argv[1:])
