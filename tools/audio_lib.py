"""Which audio clips the app needs, and where they live (D-005). Shared by build_audio.py and build_data.py.

A clip is one text spoken by one voice, stored as app/audio/<voice>/<key[:2]>/<key>.mp3, where key is the
first 12 hex digits of SHA-256 of the spoken text (NFC, trimmed). The same text gives the same file, so an
edited sentence needs one new clip per voice and nothing else changes.

  * every sentence (`bg`) and every deck word (`bg`): both voices;
  * every sentence's Dutch (`nl`) in Fenna's voice, the prompt of hands-free listening (D-034);
  * stories: the title and the narration in Kalina's voice, each quoted line („…“) in the voice of its
    speaker (paragraph `speakers`, gender from data/cast.json: men are Borislav).
data/audio_overrides.json gives a different spoken text for an item: "w:<rank>" for a word, "s:<id>" for a
sentence (a lone в is spoken as във).
"""
import hashlib, json, os, re, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_DIR = os.path.join(ROOT, 'app', 'audio')
MANIFEST = os.path.join(ROOT, 'data', 'audio.json')
VOICES = {'kalina': 'bg-BG-KalinaNeural', 'borislav': 'bg-BG-BorislavNeural', 'fenna': 'nl-NL-FennaNeural'}
LETTER = {'kalina': 'k', 'borislav': 'b', 'fenna': 'n'}   # the voice as data.js names it
BG_VOICES = ('kalina', 'borislav')
QUOTE_RE = re.compile(r'„[^“]*“')
SENTENCE_END_RE = re.compile(r'[.!?…]+\s+(?=[А-ЯЁA-Z])')   # a sentence ends before a capital, not at "и… ключа"


def load(name):
    return json.load(open(os.path.join(ROOT, 'data', name), encoding='utf-8'))


def clip_key(text):
    return hashlib.sha256(unicodedata.normalize('NFC', text).strip().encode('utf-8')).hexdigest()[:12]


def clip_path(voice, key):
    return os.path.join(AUDIO_DIR, voice, key[:2], key + '.mp3')


def _span(text, a, b):
    """(a, b) narrowed to the speakable part: no leading spaces, commas or dashes, no trailing spaces;
    None when it holds no letter"""
    while a < b and not text[a].isalnum():
        a += 1
    while b > a and text[b - 1].isspace():
        b -= 1
    return (a, b) if any(c.isalpha() for c in text[a:b]) else None


def segments(bg, speakers, cast):
    """a paragraph as [(from, to, voice)]: narration one sentence per segment in Kalina's voice, each quoted
    line in its speaker's voice; bg[from:to] is the text spoken (offsets are JavaScript string indices too,
    all characters being in the BMP)"""
    out, pos = [], 0

    def narration(a, b):
        cuts = [m.end() for m in SENTENCE_END_RE.finditer(bg, a, b)]
        for x, y in zip([a] + cuts, cuts + [b]):
            sp = _span(bg, x, y)
            if sp:
                out.append((sp[0], sp[1], 'kalina'))

    for i, m in enumerate(QUOTE_RE.finditer(bg)):
        narration(pos, m.start())
        sp = _span(bg, m.start() + 1, m.end() - 1)
        if sp:
            out.append((sp[0], sp[1], 'borislav' if cast.get(speakers[i]) == 'm' else 'kalina'))
        pos = m.end()
    narration(pos, len(bg))
    return out


def spoken(item_id, text, overrides):
    return overrides.get(item_id, text)


def needed(words=None, sentences=None, stories=None, cast=None, overrides=None):
    """{(voice, key): {'text', 'timings', 'what'}} for every clip the app uses"""
    words = load('words.json') if words is None else words
    sentences = load('sentences.json') if sentences is None else sentences
    stories = load('stories.json') if stories is None else stories
    cast = load('cast.json') if cast is None else cast
    overrides = load('audio_overrides.json') if overrides is None else overrides
    need = {}

    def add(voice, text, timings, what):
        k = (voice, clip_key(text))
        if k not in need:
            need[k] = {'text': text.strip(), 'timings': timings, 'what': what}
        elif timings:
            need[k]['timings'] = True

    for s in sentences:
        for v in BG_VOICES:
            add(v, spoken('s:' + s['id'], s['bg'], overrides), False, 'sentences')
        if s.get('nl'):
            add('fenna', s['nl'], False, 'prompts')
    for w in words:
        for v in BG_VOICES:
            add(v, spoken('w:%d' % w['rank'], w['bg'], overrides), False, 'words')
    for st in stories:
        add('kalina', st['title']['bg'], True, 'stories')
        for p in st['paragraphs']:
            for a, b, v in segments(p['bg'], p.get('speakers', []), cast):
                add(v, p['bg'][a:b], True, 'stories')
    return need
