#!/usr/bin/env python3
"""Check the grammar lessons in data/grammar.json (D-049): python3 tools/check_lessons.py (npm test)
Every lesson needs a known card, known labels, a short rule, a note for each language and examples that hold the target.
A lesson needs at least MIN_POOL usable sentences at REFERENCE_RANK, by the same rules as C.lessonPool: within the stage,
the target form in every accepted answer, a prompt that holds a cue word. Raise REFERENCE_RANK as the learner moves on.
"""
import json, os, re, sys, unicodedata
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load = lambda f: json.load(open(os.path.join(root, 'data', f), encoding='utf-8'))
grammar, labels, sentences, explanations = load('grammar.json'), load('grammar_labels.json'), load('sentences.json'), load('explanations.json')
REFERENCE_RANK, MIN_POOL, MAX_RULE_WORDS = 300, 12, 90
STAGES = {1: {'present', 'da-clause'}, 2: {'future', 'imperative'}, 3: {'aorist', 'perfect'}, 4: {'imperfect', 'conditional'}}
INFO = {'comparative', 'numeral'}
by_id = {s['id']: s for s in sentences}
cards = {c['id'] for c in grammar['cards']}
errors = []
words = lambda text: re.findall(r'[^\W\d_]+', unicodedata.normalize('NFC', text).lower())


def within(s, stage):
    allowed = set().union(*(STAGES[k] for k in STAGES if k <= stage)) | INFO
    return stage >= 5 or all(g in allowed for g in s.get('grammar', []))


def targets(lesson, s):
    """the target forms of a sentence, as in C.lessonTargets"""
    e = explanations.get(s['id'])
    if not e or len(words(s['bg'])) != len(e['w']):
        return []
    P, ws, out = lesson['pool'], e['w'], []
    for i, w in enumerate(ws):
        if set(w.get('l', [])) & set(P['labels']):
            out.append(i)
            for j in range(i + 1, min(i + 3, len(ws))):
                if set(ws[j].get('l', [])) & set(P.get('next', [])):
                    out.append(j)
                    break
    return [words(s['bg'])[i] for i in sorted(set(out))]


def usable(lesson, s, lang):
    P = lesson['pool']
    if s['id'] in P.get('exclude', []) or not within(s, lesson['stage']):
        return False
    forms = targets(lesson, s)
    if not forms:
        return False
    cue = P.get('cue', {}).get(lang)
    if cue and not set(cue) & set(words(s.get(lang) or '')):
        return False
    answers = [s['bg']] + s.get('bg_alt', [])   # not bg_alt_en: it only swaps ти and вие (D-018)
    return all(f in words(a) for a in answers for f in forms)


seen = set()
for les in grammar.get('lessons', []):
    lid = les.get('id', '?')
    bad = lambda msg: errors.append(f'{lid}: {msg}')
    if lid in seen:
        bad('duplicate id')
    seen.add(lid)
    for f in ('card', 'stage', 'title', 'rule', 'contrast', 'examples', 'pool'):
        if not les.get(f):
            bad(f'no {f}')
    if les.get('card') not in cards:
        bad(f'unknown card {les.get("card")}')
    rule = sum(len(p.split()) for p in les.get('rule', []))
    if rule > MAX_RULE_WORDS:
        bad(f'the rule has {rule} words, at most {MAX_RULE_WORDS}')
    for lang in ('nl', 'en'):
        if not les.get('contrast', {}).get(lang, '').strip():
            bad(f'no note for {lang} speakers')
    pool = les.get('pool', {})
    for label in pool.get('labels', []) + pool.get('next', []):
        if label not in labels:
            bad(f'unknown label {label}')
    if not pool.get('labels'):
        bad('no labels in the pool')
    for sid in pool.get('exclude', []):
        if sid not in by_id:
            bad(f'unknown sentence {sid} in exclude')
    if not 2 <= len(les.get('examples', [])) <= 3:
        bad('needs 2 or 3 examples')
    for sid in les.get('examples', []):
        if sid not in by_id:
            bad(f'unknown example {sid}')
        elif not targets(les, by_id[sid]):
            bad(f'example {sid} does not hold the target')
        elif sid in pool.get('exclude', []):
            bad(f'example {sid} is excluded from the pool')
    if pool.get('labels'):
        for lang in ('nl', 'en'):
            n = sum(1 for s in sentences if (s.get('max_rank') or 0) <= REFERENCE_RANK and usable(les, s, lang))
            if n < MIN_POOL:
                bad(f'{n} usable sentences for {lang} at rank {REFERENCE_RANK}, at least {MIN_POOL}')
for e in errors:
    print(e)
print(f'{len(seen)} lessons checked: {len(errors)} problems')
sys.exit(1 if errors else 0)
