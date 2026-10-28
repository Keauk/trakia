#!/usr/bin/env python3
"""Turn the review state of the Anki deck 'Bulgarian 2952 (mixed)' into Trakia word cards (D-035).

Usage:  python3 tools/anki_progress.py [collection.anki2 | deck.apkg] [out.json]

Defaults: the collection of Anki's first profile on macOS, and ~/Downloads/trakia-anki-progress.json.
Close Anki first, or the newest reviews may still sit in its write-ahead log (the tool copies the
-wal file along, so a running Anki is read up to its last checkpoint).

Output: a Trakia progress snapshot ({"app": "trakia", "progress": {...}}) with one record per card
that is no longer new, keyed w:<rank>|bg2en (card ord 0) and w:<rank>|en2bg (ord 1). Merge it with
Settings → Import progress; the newest review of each card wins, so importing again is safe.

The file holds a person's review history. It never goes into this repository (it is public): the
tool refuses an output path inside it.
"""
import json, os, shutil, sqlite3, subprocess, sys, tempfile, time, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_COL = os.path.expanduser('~/Library/Application Support/Anki2/User 1/collection.anki2')
DEFAULT_OUT = os.path.expanduser('~/Downloads/trakia-anki-progress.json')
DIRS = {0: 'bg2en', 1: 'en2bg'}
STATE = {1: 'learning', 2: 'review', 3: 'relearning'}
KNOWN_DAYS = 7   # as core.js KNOWN_DAYS (D-036)


def open_collection(path, tmp):
    """a sqlite connection to a private copy of the collection"""
    if path.endswith('.apkg'):
        with zipfile.ZipFile(path) as z:
            z.extractall(tmp)
        if os.path.exists(os.path.join(tmp, 'collection.anki21b')):
            db = os.path.join(tmp, 'collection.sqlite')
            subprocess.run(['zstd', '-d', '-q', os.path.join(tmp, 'collection.anki21b'), '-o', db], check=True)
        else:
            db = os.path.join(tmp, 'collection.anki21' if os.path.exists(os.path.join(tmp, 'collection.anki21')) else 'collection.anki2')
    else:
        db = os.path.join(tmp, 'collection.anki2')
        shutil.copy(path, db)
        if os.path.exists(path + '-wal'):
            shutil.copy(path + '-wal', db + '-wal')
    con = sqlite3.connect(db)
    con.create_collation('unicase', lambda a, b: (a.lower() > b.lower()) - (a.lower() < b.lower()))
    return con


def check_templates(con, mid):
    """card ord 0 must be Bulgarian → English and ord 1 English → Bulgarian; templates name their sides"""
    try:
        names = dict(con.execute('select ord, name from templates where ntid = ?', (mid,)))
    except sqlite3.OperationalError:
        return   # old collection format: no templates table
    for o, want in ((0, 'bg'), (1, 'en')):
        name = names.get(o, '').lower().replace(' ', '')
        if name and not (name.startswith(want) or name.startswith({'bg': 'bulgarian', 'en': 'english'}[want])):
            sys.exit(f'card template {o} is "{names.get(o)}"; expected it to start from {want.upper()} '
                     f'(templates: {names}). Check the mapping in DIRS before importing.')


def records(con, now_ms):
    """{key: ProgressRecord} for every card that is not new, and a count per state"""
    crt = con.execute('select crt from col').fetchone()[0]
    out, counts = {}, {}
    rows = con.execute('select c.ord, c.type, c.queue, c.due, c.ivl, c.reps, c.lapses, c.data, n.flds, n.mid '
                       'from cards c join notes n on n.id = c.nid where c.type != 0')
    mids = set()
    for ord_, typ, queue, due, ivl, reps, lapses, data, flds, mid in rows:
        f = flds.split('\x1f')
        if len(f) < 8 or ord_ not in DIRS:
            continue
        mids.add(mid)
        d = json.loads(data) if data else {}
        state = STATE.get(typ, 'learning')
        if queue == -1:   # suspended in Anki (a leech, or by hand): it stays out
            counts['suspended, skipped'] = counts.get('suspended, skipped', 0) + 1
            continue
        if typ == 2:
            due_ms = (crt + due * 86400) * 1000
        elif typ in (1, 3) and due > 1e9:
            due_ms = due * 1000
        else:
            due_ms = now_ms
        last = int(d['lrt']) * 1000 if d.get('lrt') else None
        if typ == 2 and last and ivl > 0:   # Anki's due is a day number; Trakia keeps the exact interval from the last review
            due_ms = last + ivl * 86400 * 1000
        elif typ == 2:
            last = int(due_ms - ivl * 86400 * 1000)
        rec = {'box': 0, 'due': int(due_ms), 'reps': reps, 'lapses': lapses, 'streak': 0, 'last': last or now_ms,
               'state': state}
        if d.get('s') is not None and d.get('d') is not None:
            rec['s'], rec['d'] = float(d['s']), float(d['d'])
        elif typ == 2:   # a review card without FSRS memory state: its interval stands in for the stability
            rec['s'], rec['d'] = float(max(ivl, 1)), min(10.0, 5.0 + 0.5 * lapses)
        else:   # a learning card without FSRS memory state: due now
            rec.update(state='learning', step=0, due=now_ms)
        if rec['state'] != 'review':
            rec['step'] = 0
        out[f'w:{int(f[6])}|{DIRS[ord_]}'] = rec
        counts[rec['state']] = counts.get(rec['state'], 0) + 1
    for mid in mids:
        check_templates(con, mid)
    return out, counts


def day_key(ms):
    return time.strftime('%Y-%m-%d', time.localtime(ms / 1000))


def word_days(con, now_ms):
    """{day: [started, known, at]} from Anki's review log (D-036): started = notes reviewed on or before the day;
    known = notes whose Bulgarian → English card's last review on or before the day set an interval of at least
    KNOWN_DAYS days (at 90 % retention Anki's interval is about the FSRS stability)"""
    rows = con.execute('select r.id, c.nid, c.ord, r.ivl from revlog r join cards c on c.id = r.cid order by r.id').fetchall()
    if not rows:
        return {}
    started, ivl, out = set(), {}, {}
    i, day = 0, day_key(rows[0][0])
    today = day_key(now_ms)
    while day <= today:
        while i < len(rows) and day_key(rows[i][0]) <= day:
            _, nid, ord_, iv = rows[i]
            started.add(nid)
            if ord_ == 0:
                ivl[nid] = iv
            i += 1
        known = sum(1 for v in ivl.values() if v >= KNOWN_DAYS)
        y, m, d = map(int, day.split('-'))
        end = int(time.mktime((y, m, d + 1, 0, 0, 0, 0, 0, -1)) * 1000) - 1
        out[day] = [len(started), known, min(end, now_ms - 1)]
        day = day_key(end + 1)
    return out


def main(src=DEFAULT_COL, out=DEFAULT_OUT, now_ms=None):
    out = os.path.abspath(os.path.expanduser(out))
    if os.path.commonpath([out, ROOT]) == ROOT:
        sys.exit(f'refusing to write {out}: it is inside the repository, which is public, and the file holds a '
                 f'review history. Write it elsewhere (default {DEFAULT_OUT}).')
    now_ms = now_ms or int(time.time() * 1000)
    tmp = tempfile.mkdtemp()
    try:
        con = open_collection(os.path.expanduser(src), tmp)
        progress, counts = records(con, now_ms)
        days = word_days(con, now_ms)
        con.close()
    finally:
        shutil.rmtree(tmp)
    end_of_day = (int(time.mktime(time.localtime(now_ms / 1000)[:3] + (0, 0, 0, 0, 0, -1))) + 86400) * 1000
    due_today = sum(1 for p in progress.values() if p['due'] < end_of_day)
    rank = 0
    while f'w:{rank + 1}|bg2en' in progress or f'w:{rank + 1}|en2bg' in progress:
        rank += 1
    with open(out, 'w', encoding='utf-8') as fh:
        json.dump({'app': 'trakia', 'version': 2, 'progress': dict(sorted(progress.items())), 'wordDays': days}, fh, ensure_ascii=False)
    print(f'{len(progress)} cards ({", ".join(f"{v} {k}" for k, v in sorted(counts.items()))}); '
          f'{due_today} due today; words started up to {rank}; {len(days)} days of history -> {out}')
    return progress


if __name__ == '__main__':
    main(*sys.argv[1:3])
