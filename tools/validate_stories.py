#!/usr/bin/env python3
"""Validate and merge reading stories into data/stories.json (D-026, D-027, D-028).

Usage:  python3 tools/validate_stories.py data/words.json in1.json [in2.json ...] -o data/stories.json
        python3 tools/validate_stories.py data/words.json in.json            (check only, no output)

For every story it:
  * checks the fields (id, level, title, paragraphs, words, questions) and their types,
  * splits the title and every paragraph into words (letters only; a hyphen splits, so по-голям
    is по + голям) and requires each word to be a name, a free function word, or a key of `words`,
  * resolves every lemma in `words` to a deck rank, unless the lemma is a glossed word in `extra`,
  * fails an unglossed word above the story's level and a glossed share above 3 % of the words,
  * allows only stage-1 grammar (present, da-clause),
  * checks that each listed vocative (form of address: Петре, мамо) occurs and maps to its base form,
  * checks 3-5 questions with 3-4 options in Dutch and English and a valid answer,
  * writes max_rank, stage and word_count.
Exit status 1 when any story has an error.
"""
import json, os, re, sys, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from validate_sentences import build_index, resolve_lemma, FREE, norm

LEVELS = (100, 200, 300, 400, 500)
STAGE1 = {'present', 'da-clause', 'comparative', 'numeral'}
GLOSS_MAX = 0.03
WORD_RE = re.compile(r'[^\W\d_]+')   # same as /\p{L}+/u in core.js storyTokens


def key(w):
    """a word's key in `words`: lower case, NFC; ѝ (her) stays apart from и (and), unlike norm"""
    return unicodedata.normalize('NFC', w).lower()


def words_of(text):
    return [key(w) for w in WORD_RE.findall(unicodedata.normalize('NFC', text))]


def check_story(s, idx, rank_of_lemma):
    errs, sid = [], s.get('id', '?')
    for k in ('id', 'level', 'title', 'paragraphs', 'words', 'questions'):
        if k not in s:
            errs.append(f'missing field {k}')
    if errs:
        return errs, None
    if s['level'] not in LEVELS:
        errs.append(f'level {s["level"]} is not one of {LEVELS}')
    for lang in ('bg', 'nl', 'en'):
        if not str(s['title'].get(lang, '')).strip():
            errs.append(f'title.{lang} missing')
    for i, p in enumerate(s['paragraphs']):
        for lang in ('bg', 'nl', 'en'):
            if not str(p.get(lang, '')).strip():
                errs.append(f'paragraph {i + 1}: {lang} missing')
    words = {key(k): v for k, v in s['words'].items()}
    names = {key(n) for n in s.get('names', [])}
    extra = {norm(k): v for k, v in s.get('extra', {}).items()}
    for lem, gl in extra.items():
        if not (isinstance(gl, dict) and gl.get('nl') and gl.get('en')):
            errs.append(f'extra {lem}: needs nl and en meaning')
    running = []
    for text in [s['title'].get('bg', '')] + [p.get('bg', '') for p in s['paragraphs']]:
        running += words_of(text)
    max_rank, glossed, above = 0, 0, []
    for w in running:
        if w in names:
            continue
        if w not in words:
            if norm(w) in FREE:
                continue
            errs.append(f'word "{w}" is not in `words`, `names` or the free list'); continue
        lem = norm(words[w])
        if lem in extra:
            glossed += 1; continue
        r = rank_of_lemma(words[w])
        if r is None:
            if norm(lem) in FREE:
                continue
            errs.append(f'"{w}" -> lemma "{words[w]}" is not in the deck (gloss it in `extra` or rephrase)'); continue
        if r > s['level']:
            above.append(f'{w} ({words[w]} #{r})')
        max_rank = max(max_rank, r)
    if above:
        errs.append(f'above level {s["level"]} and not glossed: ' + ', '.join(sorted(set(above))))
    share = glossed / max(1, len(running))
    if share > GLOSS_MAX:
        errs.append(f'glossed words are {share:.1%} of the text (max {GLOSS_MAX:.0%})')
    for v in s.get('vocative', []):
        if key(v) not in running:
            errs.append(f'vocative "{v}" does not occur in the text')
        elif key(v) not in words:
            errs.append(f'vocative "{v}" needs its base form in `words` (петре -> Петър)')
    unused = sorted(set(words) - set(running))
    if unused:
        errs.append('`words` lists forms that are not in the text: ' + ', '.join(unused[:10]))
    bad = [g for g in s.get('grammar', []) if g not in STAGE1]
    if bad:
        errs.append(f'grammar beyond stage 1: {bad}')
    qs = s['questions']
    if not (3 <= len(qs) <= 5):
        errs.append(f'{len(qs)} questions (3-5 wanted)')
    for i, q in enumerate(qs):
        if not (q.get('q', {}).get('nl') and q.get('q', {}).get('en')):
            errs.append(f'question {i + 1}: q.nl / q.en missing')
        opts = q.get('options', [])
        if not (3 <= len(opts) <= 4) or not all(o.get('nl') and o.get('en') for o in opts):
            errs.append(f'question {i + 1}: 3-4 options with nl and en wanted')
        if not isinstance(q.get('answer'), int) or not (0 <= q['answer'] < len(opts)):
            errs.append(f'question {i + 1}: answer must index an option')
    info = {'max_rank': max_rank or None, 'stage': 1, 'word_count': len(running), 'glossed': glossed}
    return errs, info


def main(argv):
    out = None
    if '-o' in argv:
        i = argv.index('-o'); out = argv[i + 1]; del argv[i:i + 2]
    words_path, *files = argv
    idx = build_index(json.load(open(words_path, encoding='utf-8')))
    rank_of_lemma = lambda lem: resolve_lemma(lem, idx)
    stories, seen, failed = [], set(), 0
    for path in files:
        for s in json.load(open(path, encoding='utf-8')):
            sid = s.get('id', '?')
            errs, info = check_story(s, idx, rank_of_lemma)
            if sid in seen:
                errs.append('duplicate id')
            seen.add(sid)
            if info:
                print(f'{sid:6} level {s.get("level")}: {info["word_count"]} words, highest rank {info["max_rank"]}, '
                      f'glossed {info["glossed"]} ({info["glossed"] / max(1, info["word_count"]):.1%}), {len(s.get("questions", []))} questions')
            if errs:
                failed += 1
                print('  ERROR ' + '\n  ERROR '.join(errs))
                continue
            rec = {k: s[k] for k in ('id', 'level', 'title', 'paragraphs', 'words', 'questions')}
            rec['words'] = {key(k): v for k, v in s['words'].items()}
            for k in ('names', 'extra', 'grammar', 'vocative'):
                if s.get(k):
                    rec[k] = s[k]
            rec.update(max_rank=info['max_rank'], stage=info['stage'], word_count=info['word_count'])
            stories.append(rec)
    stories.sort(key=lambda r: (r['level'], r['id']))
    print(f'{len(stories)} stories valid, {failed} with errors')
    if out and not failed:
        json.dump(stories, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('written to', out)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
