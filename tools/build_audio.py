#!/usr/bin/env python3
"""Generate the spoken Bulgarian clips: every sentence and word in Kalina's and Borislav's voice, the stories
with Borislav for the men's lines (D-005). Which clips exist and where they live: tools/audio_lib.py.

Usage:  .venv/bin/python tools/build_audio.py                  # generate every missing clip (needs edge-tts)
        .venv/bin/python tools/build_audio.py --only stories --limit 40    # a part, to try things out
        python3 tools/build_audio.py --check                   # exit 1 when a clip is missing or unused (npm test)
        python3 tools/build_audio.py --prune                   # delete clips that nothing uses any more
Setup, once:  python3 -m venv .venv && .venv/bin/pip install -r tools/requirements-audio.txt

Clips come from Microsoft's neural voices through edge-tts (Edge's read-aloud service, no account): mp3,
24 kHz, 48 kbps, mono, as delivered. Story clips also record when each word starts (word boundaries), for
the read-along highlight. data/audio.json lists every clip with its length and, for story clips, the words:
[start ms, from, to] with from/to character offsets in the spoken text. Runs can be interrupted and resumed.
"""
import asyncio, json, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audio_lib as A

CONCURRENCY = 4
RETRIES = 5
TIMEOUT = 60      # seconds per clip: a connection dropped by a sleeping laptop fails and is retried instead of hanging
FORMAT = 'mp3 24 kHz 48 kbps mono'


def load_manifest():
    if os.path.exists(A.MANIFEST):
        return json.load(open(A.MANIFEST, encoding='utf-8'))
    return {'format': FORMAT, 'voices': A.VOICES, 'clips': {}}


def save_manifest(m):
    """one clip per line, sorted, so a regenerated clip is a one-line diff"""
    clips = m['clips']
    lines = [f' {json.dumps(k)}: {json.dumps(clips[k], ensure_ascii=False, separators=(",", ":"))}' for k in sorted(clips)]
    head = json.dumps({'format': m['format'], 'voices': m['voices']}, ensure_ascii=False)[:-1]
    tmp = A.MANIFEST + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as fh:
        fh.write(head + ', "clips": {\n' + ',\n'.join(lines) + '\n}}\n')
    os.replace(tmp, A.MANIFEST)


def files_on_disk():
    out = set()
    for voice in os.listdir(A.AUDIO_DIR) if os.path.isdir(A.AUDIO_DIR) else []:
        for root, _, names in os.walk(os.path.join(A.AUDIO_DIR, voice)):
            out |= {(voice, n[:-4]) for n in names if n.endswith('.mp3')}
    return out


def check(need, manifest):
    have, listed = files_on_disk(), {tuple(k.split('/')) for k in manifest['clips']}
    missing = sorted(k for k in need if k not in have or k not in listed)
    unused = sorted((have | listed) - set(need))
    untimed = sorted(k for k, v in need.items() if v['timings'] and k in listed and 'w' not in manifest['clips']['/'.join(k)])
    ok = True
    if missing:
        ok = False
        print(f'{len(missing)} audio clips missing (e.g. {missing[0][0]}: "{need[missing[0]]["text"][:40]}"): '
              'run .venv/bin/python tools/build_audio.py')
    if unused:
        ok = False
        print(f'{len(unused)} audio clips unused: run python3 tools/build_audio.py --prune')
    if untimed:
        print(f'note: {len(untimed)} story clips have no word timings; the story highlights them as a whole')
    if ok:
        print(f'audio complete: {len(need)} clips')
    return ok


def prune(need, manifest):
    gone = 0
    for voice, key in files_on_disk() - set(need):
        os.remove(A.clip_path(voice, key)); gone += 1
    for k in [k for k in manifest['clips'] if tuple(k.split('/')) not in need]:
        del manifest['clips'][k]; gone += 1
    save_manifest(manifest)
    print(f'pruned {gone} files and manifest entries')


def word_spans(text, marks):
    """[start ms, from, to] per spoken word, found left to right in text (the service drops punctuation)"""
    out, pos, low = [], 0, text.lower()
    for ms, word in marks:
        i = low.find(word.lower(), pos)
        if i < 0:
            continue
        out.append([ms, i, i + len(word)]); pos = i + len(word)
    return out


async def synth(voice, text, timings):
    import edge_tts
    com = edge_tts.Communicate(text, A.VOICES[voice], boundary='WordBoundary' if timings else 'SentenceBoundary')
    audio, marks = bytearray(), []
    async for ch in com.stream():
        if ch['type'] == 'audio':
            audio += ch['data']
        elif ch['type'] == 'WordBoundary':
            marks.append((ch['offset'] // 10000, ch['text']))
    if not audio:
        raise RuntimeError('no audio returned')
    return bytes(audio), marks


async def generate(todo, need, manifest):
    import edge_tts
    src = 'edge-tts ' + edge_tts.__version__
    sem, done, failed = asyncio.Semaphore(CONCURRENCY), [0], []

    async def one(k):
        voice, key = k
        text, timings = need[k]['text'], need[k]['timings']
        async with sem:
            for attempt in range(RETRIES):
                try:
                    audio, marks = await asyncio.wait_for(synth(voice, text, timings), TIMEOUT)
                    break
                except Exception as e:                       # throttled, dropped connection, empty reply
                    if attempt == RETRIES - 1:
                        failed.append((k, repr(e))); return
                    await asyncio.sleep(2 ** attempt + random.random())
        path = A.clip_path(voice, key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path + '.tmp', 'wb') as fh:
            fh.write(audio)
        os.replace(path + '.tmp', path)
        rec = {'ms': len(audio) * 8 // 48, 'src': src}        # 48 kbps constant bit rate
        if timings:
            rec['w'] = word_spans(text, marks)
        manifest['clips'][f'{voice}/{key}'] = rec
        done[0] += 1
        if done[0] % 100 == 0:
            save_manifest(manifest)
            print(f'{done[0]}/{len(todo)} clips', flush=True)

    try:
        await asyncio.gather(*(one(k) for k in todo))
    finally:
        save_manifest(manifest)
    print(f'generated {done[0]} clips, {len(failed)} failed')
    for k, e in failed[:10]:
        print('  failed', '/'.join(k), need[k]['text'][:50], e)
    return not failed


def main(argv):
    need, manifest = A.needed(), load_manifest()
    if '--check' in argv:
        return 0 if check(need, manifest) else 1
    if '--prune' in argv:
        prune(need, manifest); return 0
    have = files_on_disk()
    todo = [k for k in sorted(need) if k not in have or '/'.join(k) not in manifest['clips']]
    if '--only' in argv:
        what = argv[argv.index('--only') + 1]
        todo = [k for k in todo if need[k]['what'] == what]
    if '--limit' in argv:
        todo = todo[:int(argv[argv.index('--limit') + 1])]
    print(f'{len(need)} clips needed, {len(todo)} to generate', flush=True)
    return 0 if asyncio.run(generate(todo, need, manifest)) else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
