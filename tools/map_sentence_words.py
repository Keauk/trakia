#!/usr/bin/env python3
"""Propose a `words` map (word form -> dictionary form) for every practice sentence (D-030).

Usage:  python3 tools/map_sentence_words.py data/words.json data/sentences.json [-o data/sentences.json]

Keeps every entry a sentence's map already has and only fills the missing ones. The sentence's own
lemma list always comes first; the whole deck is consulted only for words the list cannot explain:
  1. the form is a dictionary form, or a form listed in words.json, of one of the sentence's lemmas
     (a part of a multiword or hyphenated lemma counts: "мляко" in "кисело мляко", "малко" in "по-малко");
  2. a short pronoun or clitic (ме -> аз, го -> той), preferring a pronoun the sentence lists;
  3. IRREGULAR: forms whose stem differs from the dictionary form (деца -> дете, сложи -> слагам);
  4. a shared stem with exactly one of the sentence's lemmas (купих -> купувам; for "връщам се"
     the stem of връщам);
  5. the form is exactly the dictionary form of a deck word (a word the lemma list forgot: английски);
  6. a capitalised word that is no deck word: a name, if it is not the first word of its sentence
     or occurs as a name elsewhere in the set (Мария at the start of a sentence);
  7. when exactly one listed lemma is still unused, every word left over is a form of it
     (очите -> око, направи -> правя, уши -> шия);
  8. the form is a listed form of a deck word.
Free function words (ли, не, да, …) are left out. Words it cannot place are printed with the
sentence id; map them by hand in data/sentences.json or extend IRREGULAR, then run it again.
Nothing is guessed from the whole deck.
"""
import json, os, re, sys, unicodedata
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from validate_sentences import norm, FREE

WORD_RE = re.compile(r'[^\W\d_]+')


def key(w):
    """map key: lower case, NFC, ѝ kept apart from и (unlike norm, which folds them for checking)"""
    return unicodedata.normalize('NFC', w).lower()


# short pronouns and clitics -> the deck's pronoun; tuples give the choices in order of preference
CLITIC = {
    'ме': ('аз',), 'мен': ('аз',), 'мене': ('аз',), 'ми': ('аз',),
    'теб': ('ти',), 'тебе': ('ти',),
    'го': ('той', 'то'), 'него': ('той', 'то'), 'му': ('той', 'то'),
    'я': ('тя',), 'нея': ('тя',), 'ѝ': ('тя',),
    'ни': ('ние',), 'нас': ('ние',), 'ви': ('вие',), 'вас': ('вие',),
    'ги': ('те',), 'тях': ('те',), 'им': ('те',),
    'мой': ('мой',), 'моя': ('мой',), 'моят': ('мой',), 'моята': ('мой',), 'моето': ('мой',), 'моите': ('мой',), 'мои': ('мой',), 'мое': ('мой',),
}
# forms whose stem differs from the dictionary form; checked by hand
IRREGULAR = {
    'деца': 'дете', 'децата': 'дете', 'хората': 'хора',
    'сложа': 'слагам', 'сложи': 'слагам', 'сложиш': 'слагам', 'сложих': 'слагам', 'сложим': 'слагам', 'сложете': 'слагам', 'сложил': 'слагам', 'сложила': 'слагам',
    'видя': 'виждам', 'видиш': 'виждам', 'види': 'виждам', 'видим': 'виждам', 'видите': 'виждам', 'видят': 'виждам', 'видях': 'виждам', 'видяхме': 'виждам', 'видяха': 'виждам', 'видя́': 'виждам', 'видял': 'виждам', 'видяла': 'виждам', 'видели': 'виждам',
    'дойда': 'идвам', 'дойдеш': 'идвам', 'дойде': 'идвам', 'дойдем': 'идвам', 'дойдете': 'идвам', 'дойдат': 'идвам', 'дойдох': 'идвам', 'дойдохме': 'идвам', 'дойдоха': 'идвам', 'дошъл': 'идвам', 'дошла': 'идвам', 'дошли': 'идвам', 'ела': 'идвам', 'елате': 'идвам',
    'кажа': 'казвам', 'кажеш': 'казвам', 'каже': 'казвам', 'кажем': 'казвам', 'кажете': 'казвам', 'кажат': 'казвам', 'кажи': 'казвам', 'казах': 'казвам', 'каза': 'казвам', 'казахме': 'казвам', 'казаха': 'казвам', 'казал': 'казвам', 'казала': 'казвам',
    'дам': 'давам', 'дадеш': 'давам', 'даде': 'давам', 'дадем': 'давам', 'дадете': 'давам', 'дадат': 'давам', 'дай': 'давам', 'дайте': 'давам', 'дадох': 'давам', 'дадохме': 'давам', 'дадоха': 'давам', 'дал': 'давам', 'дала': 'давам',
    'яде': 'ям', 'ядеш': 'ям', 'ядем': 'ям', 'ядете': 'ям', 'ядат': 'ям', 'яж': 'ям', 'яжте': 'ям', 'ядох': 'ям', 'ядохме': 'ям', 'ядоха': 'ям', 'ял': 'ям', 'яла': 'ям', 'яли': 'ям',
    'спи': 'спя', 'спиш': 'спя', 'спим': 'спя', 'спите': 'спя', 'спят': 'спя', 'спах': 'спя', 'спа': 'спя', 'спахме': 'спя',
    'пием': 'пия', 'пиеш': 'пия', 'пие': 'пия', 'пиете': 'пия', 'пият': 'пия', 'пих': 'пия', 'пи': 'пия', 'пихме': 'пия', 'пиха': 'пия', 'пийте': 'пия', 'пий': 'пия',
    'чух': 'чувам', 'чу': 'чувам', 'чухме': 'чувам', 'чуха': 'чувам', 'чуя': 'чувам', 'чуеш': 'чувам', 'чуе': 'чувам', 'чуем': 'чувам', 'чуете': 'чувам', 'чуят': 'чувам',
    'взема': 'вземам', 'вземе': 'вземам', 'вземеш': 'вземам', 'вземем': 'вземам', 'вземете': 'вземам', 'вземат': 'вземам', 'вземи': 'вземам', 'взех': 'вземам', 'взе': 'вземам', 'взехме': 'вземам', 'взеха': 'вземам',
    'отида': 'отивам', 'отидеш': 'отивам', 'отиде': 'отивам', 'отидем': 'отивам', 'отидете': 'отивам', 'отидат': 'отивам', 'отидох': 'отивам', 'отидохме': 'отивам', 'отидоха': 'отивам', 'иди': 'отивам', 'идете': 'отивам', 'отишъл': 'отивам', 'отишла': 'отивам',
    'мога': 'мога', 'можеш': 'мога', 'може': 'мога', 'можем': 'мога', 'можете': 'мога', 'могат': 'мога', 'можах': 'мога', 'можа': 'мога',
    'една': 'един', 'едно': 'един', 'едни': 'един', 'единия': 'един', 'единият': 'един',
    'два': 'две', 'двама': 'две', 'двамата': 'две', 'двете': 'две',
    'бъда': 'съм', 'бъдеш': 'съм', 'бъде': 'съм', 'бъдем': 'съм', 'бъдете': 'съм', 'бъдат': 'съм', 'бъди': 'съм', 'бъдете': 'съм',
    'бил': 'съм', 'била': 'съм', 'било': 'съм', 'били': 'съм',
}


def deck_index(words):
    """dictionary form -> set of its forms (dictionary form + Forms column), all keyed like `key`"""
    forms = {}
    for w in words:
        k = key(w['bg'])
        fs = forms.setdefault(k, set())
        fs.add(k)
        for part in re.split(r'[(),/;]', w.get('forms', '')):
            if part.strip():
                fs.add(key(part.strip()))
    return forms


def prefix(a, b):
    n = 0
    for x, y in zip(a, b):
        if x != y:
            break
        n += 1
    return n


def exact_index(words):
    """any deck form -> the dictionary form; dictionary forms win over listed forms, lower ranks win (as build_index)"""
    exact, listed = {}, {}
    for w in sorted(words, key=lambda w: w['rank']):
        exact.setdefault(key(w['bg']), w['bg'])
        for part in re.split(r'[(),/;]', w.get('forms', '')):
            if part.strip():
                listed.setdefault(key(part.strip()), w['bg'])
    listed.update(exact)
    return listed


def stem_of(lemma_key):
    """the part of a dictionary form a stem is compared with: the verb of "връщам се", the whole of a one-word form"""
    parts = [p for p in lemma_key.split() if p not in ('се', 'си')]
    return parts[0] if len(parts) == 1 else None


def is_initial(text, start):
    return not text[:start].strip(' „"\'–—-') or bool(re.search(r'[.!?…:–—]\s*[„"]?\s*$', text[:start]))


def collect_names(sents, deck_bg):
    """capitalised words that are no deck word and stand inside a sentence somewhere: names"""
    names = set()
    for s in sents:
        text = unicodedata.normalize('NFC', s['bg'])
        for m in WORD_RE.finditer(text):
            if m.group(0)[:1].isupper() and key(m.group(0)) not in deck_bg and not is_initial(text, m.start()):
                names.add(m.group(0))
    return names


def propose(s, forms, deck_bg, anyform, names=frozenset()):
    lemmas = [l for l in s.get('lemmas', [])]
    base = {l: key(l.split('#')[0]) for l in lemmas}
    out, missing = dict(s.get('words', {})), []
    text = unicodedata.normalize('NFC', s['bg'])
    for m in WORD_RE.finditer(text):
        tok, t = m.group(0), key(m.group(0))
        initial = is_initial(text, m.start())
        if t in out or norm(t) in FREE and t not in CLITIC:
            continue
        hit = None
        for l in lemmas:   # 1. a form of a listed lemma, or a part of a multiword lemma
            b = base[l]
            if t in forms.get(b, {b}) or t in WORD_RE.findall(b):
                hit = l; break
        if not hit and t in CLITIC:   # 2. pronouns
            choices = CLITIC[t]
            hit = next((l for l in lemmas if base[l] in choices), choices[0])
        if not hit and t in IRREGULAR:   # 3. irregular forms
            hit = next((l for l in lemmas if base[l] == IRREGULAR[t]), IRREGULAR[t])
        if not hit:   # 4. a shared stem with exactly one listed lemma
            scored = [(prefix(t, stem_of(base[l])), l) for l in lemmas if stem_of(base[l])]
            scored = [(n, l) for n, l in scored if n >= max(3, min(len(t), len(stem_of(base[l]))) - 3)]
            if scored:
                best = max(n for n, _ in scored)
                top = {base[l] for n, l in scored if n == best}
                if len(top) == 1:
                    hit = next(l for n, l in scored if n == best)
        if not hit and t in deck_bg:   # 5. a deck word the lemma list forgot
            hit = anyform[t]
        if not hit and tok[:1].isupper() and t not in deck_bg and (not initial or tok in names):   # 6. a name
            hit = tok
        if hit:
            out[t] = hit
        else:
            missing.append(t)
    if missing:   # 7. the one listed lemma nothing matched yet
        used = {key(v.split('#')[0]) for v in out.values()}
        unused = [l for l in lemmas if base[l] not in used and norm(base[l]) not in FREE]
        if len(unused) == 1:
            for t in missing:
                out[t] = unused[0]
            missing = []
    still = []
    for t in missing:   # 8. a listed form of any deck word
        if t in anyform:
            out[t] = anyform[t]
        else:
            still.append(t)
    return out, still


def main(argv):
    out_path = None
    if '-o' in argv:
        i = argv.index('-o'); out_path = argv[i + 1]; del argv[i:i + 2]
    words_path, sent_path = argv
    words = json.load(open(words_path, encoding='utf-8'))
    forms, deck_bg, anyform = deck_index(words), {key(w['bg']) for w in words}, exact_index(words)
    sents = json.load(open(sent_path, encoding='utf-8'))
    names = collect_names(sents, deck_bg)
    missing_all, n_missing = Counter(), 0
    for s in sents:
        s['words'], missing = propose(s, forms, deck_bg, anyform, names)
        if missing:
            n_missing += 1
            print(f'{s["id"]}: {", ".join(missing)}   | {s["bg"]}   | lemmas: {", ".join(s.get("lemmas", []))}')
            missing_all.update(missing)
    print(f'\n{len(sents)} sentences, {n_missing} with unmapped words ({sum(missing_all.values())} words)')
    if out_path:
        json.dump(sents, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
        print('written to', out_path)


if __name__ == '__main__':
    main(sys.argv[1:])
