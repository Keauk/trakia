#!/usr/bin/env python3
"""Validate and merge generated sentence files into data/sentences.json.

Usage:  python3 tools/validate_sentences.py data/words.json out/A.json out/B.json ... -o data/sentences.json
        python3 tools/validate_sentences.py --check data/words.json data/sentences.json
          (D-032: writes nothing; exits 1 on any problem or when the file is not what validation would
           write, e.g. a stale max_rank, lemma list or vocative list; part of npm test)

For every sentence it:
  * checks required fields (id, bg, nl, lemmas) and types,
  * resolves each lemma against the word list (dictionary form, or any form listed in the
    'forms' column, case-insensitive),
  * computes max_rank = highest rank among resolved lemmas (the sentence becomes available in the
    app once your Anki position >= max_rank),
  * drops exact duplicate Bulgarian sentences,
  * lists a sentence's forms of address (госпожо, Петре) as `vocative`, for the word card (D-027),
  * when a sentence has a `words` map (word form -> dictionary form, D-030; proposed by
    tools/map_sentence_words.py): requires every word of `bg` to be mapped or free, adds to
    `lemmas` every dictionary form the map uses that the list lacks, and reports every sentence
    whose max_rank changes,
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

# numerals 1-20 count as free in a sentence (SENTENCE_BRIEF.md): mapped for lookup, not for the rank
NUMERALS = {'един', 'две', 'три', 'четири', 'пет', 'шест', 'седем', 'осем', 'девет', 'десет', 'единадесет', 'дванадесет',
            'тринадесет', 'четиринадесет', 'петнадесет', 'шестнадесет', 'седемнадесет', 'осемнадесет', 'деветнадесет', 'двадесет'}

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

WORD_RE = re.compile(r'[^\W\d_]+')


def vocative_form(form, lemma):
    """is `form` the vocative of the one-word dictionary form `lemma` (both lower case)? госпожа -> госпожо,
    госпожица -> госпожице, мария -> марийо, господин -> господине, лекар -> лекарю, петър -> петре, татко -> тате"""
    L, f = lemma, form
    if f == L or ' ' in L:
        return False
    return (L.endswith('ица') and f == L[:-1] + 'е'
            or L.endswith('а') and f == L[:-1] + 'о'
            or L.endswith('я') and f in (L[:-1] + 'йо', L[:-1] + 'ьо')
            or L.endswith('ко') and f == L[:-2] + 'е'
            or L[-1:] not in 'аеиоуъюя' and f in (L + 'е', L + 'ю', L + 'о')
            or len(L) > 3 and L[-2] == 'ъ' and f == L[:-2] + L[-1] + 'е')


def vocatives(s, pos_of):
    """the forms of address in a sentence: a vocative form of a noun or name (имаме, студено look alike but are
    a verb and an adjective) that stands next to a comma, ! or ? (so a plural like мъже inside a clause is not taken)"""
    text, out = unicodedata.normalize('NFC', s['bg']), []
    for m in WORD_RE.finditer(text):
        t = m.group(0).lower(); raw = s['words'].get(t, '').split('#')[0]; lem = raw.lower()
        pos = pos_of.get(norm(raw))
        if not (pos == 'noun' or pos is None and raw[:1].isupper()):
            continue
        before, after = text[:m.start()].rstrip(' „"'), text[m.end():].lstrip(' “"')
        set_off = after[:1] in (',', '!', '?') or before[-1:] in (',', '') or before.endswith(('—', '–', '!', '?', '.'))
        if lem and set_off and vocative_form(t, lem) and t not in out:
            out.append(t)
    return out


def lemmas_from_map(s, idx, problems):
    """the writer's lemma list plus every dictionary form the sentence's `words` map adds (names and free
    words aside), so the map can only add a forgotten word, never drop a listed one; complains about
    words of `bg` the map does not cover"""
    words = {unicodedata.normalize('NFC', k).lower(): v for k, v in s['words'].items()}
    out = list(s.get('lemmas', []))
    for tok in WORD_RE.findall(unicodedata.normalize('NFC', s['bg'])):
        t = tok.lower()
        if t not in words:
            if norm(t) not in FREE:
                problems.append(f'{s["id"]}: "{tok}" is not in `words`')
            elif t in s.get('lemmas', []) and t not in out:   # a free word the writer listed (по) still counts
                out.append(t)
            continue
        lem = words[t]
        is_name = lem[:1].isupper() and resolve_lemma(lem, idx) is None
        # free words and numerals count only where the writer listed them
        free = (norm(lem) in FREE or norm(lem) in NUMERALS) and lem not in s.get('lemmas', [])
        if not is_name and not free and lem not in out:
            out.append(lem)
    return out, words


def main(argv):
    out = 'data/sentences.json'
    check = '--check' in argv
    if check:
        argv = [a for a in argv if a != '--check']
    if '-o' in argv:
        i = argv.index('-o'); out = argv[i + 1]; del argv[i:i + 2]
    words_path, *files = argv
    words = json.load(open(words_path, encoding='utf-8'))
    idx = build_index(words)
    pos_of = {}
    for w in sorted(words, key=lambda w: w['rank']):
        pos_of.setdefault(norm(w['bg']), w.get('pos'))
    merged, seen, unknown, problems, rank_changes = [], set(), Counter(), [], []
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
            old_rank = s.get('max_rank')
            if s.get('words'):
                s['lemmas'], s['words'] = lemmas_from_map(s, idx, problems)
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
            if s.get('words'):
                rec['words'] = s['words']
                voc = vocatives(s, pos_of)   # forms of address, for the word card (D-027)
                if voc:
                    rec['vocative'] = voc
                if old_rank is not None and rec['max_rank'] != old_rank:
                    rank_changes.append((s['id'], old_rank, rec['max_rank'], s['bg']))
            for extra in ('grammar', 'note', 'rank_estimated'):   # pass-through fields
                if s.get(extra) not in (None, [], ''):
                    rec[extra] = s[extra]
            if unresolved:
                rec['unresolved'] = unresolved
            merged.append(rec)
    merged.sort(key=lambda r: (r['max_rank'] or 10**6, r['id']))
    text = json.dumps(merged, ensure_ascii=False, indent=0)
    n_unres = sum(1 for r in merged if 'unresolved' in r)
    if check:
        stale = len(files) != 1 or open(files[0], encoding='utf-8').read() != text
        bad = problems or n_unres or stale
        print(f'{len(merged)} sentences checked: {len(problems)} problems, {n_unres} with unresolved lemmas'
              + (', the file differs from what validation writes: run python3 tools/validate_sentences.py data/words.json data/sentences.json -o data/sentences.json' if stale else ''))
        if problems:
            print('\n'.join(problems[:60]))
        return 1 if bad else 0
    open(out, 'w', encoding='utf-8').write(text)
    print(f'{len(merged)} sentences written to {out}; {n_unres} with unresolved lemmas')
    bands = Counter((r['max_rank'] or 0) // 300 * 300 for r in merged)
    print('max_rank distribution (bucket start -> count):', dict(sorted(bands.items())))
    if rank_changes:
        up = sum(1 for _, a, b, _ in rank_changes if (b or 0) > (a or 0))
        print(f'\nmax_rank changed for {len(rank_changes)} sentences ({up} up, {len(rank_changes) - up} down):')
        for sid, a, b, bg in rank_changes:
            print(f'  {sid}: {a} -> {b}   {bg}')
    if problems:
        print(f'\n{len(problems)} problems:'); print('\n'.join(problems[:60]))
    if unknown:
        print(f'\n{len(unknown)} distinct unresolved lemmas (most frequent first):')
        print(', '.join(f'{k}×{v}' for k, v in unknown.most_common(80)))

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
