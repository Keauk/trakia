#!/usr/bin/env python3
"""python3 tools/test_anki_progress.py: tests for anki_progress.py on a small fake collection (D-035)"""
import json, os, sqlite3, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import anki_progress as A

CRT = 1_700_000_000
NOW = (CRT + 100 * 86400 + 12 * 3600) * 1000
day_ms = lambda n: (CRT + n * 86400 + 12 * 3600) * 1000


def fake_collection(path):
    con = sqlite3.connect(path)
    con.executescript('''
        create table col (crt integer);
        create table notes (id integer, mid integer, flds text);
        create table cards (id integer, nid integer, ord integer, type integer, queue integer, due integer,
                            ivl integer, reps integer, lapses integer, data text);
        create table templates (ntid integer, ord integer, name text);
        create table revlog (id integer, cid integer, ease integer, ivl integer);''')
    con.execute('insert into col values (?)', (CRT,))
    con.executemany('insert into templates values (?, ?, ?)', [(7, 0, 'BG -> EN'), (7, 1, 'EN -> BG')])
    fl = lambda rank, bg: '\x1f'.join([bg, 'en', 's_bg', 's_en', 'noun', 'cat', str(rank), ''])
    con.executemany('insert into notes values (?, 7, ?)', [(1, fl(1, 'и')), (2, fl(2, 'да')), (3, fl(3, 'не'))])
    lrt = CRT + 95 * 86400
    con.executemany('insert into cards values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        (10, 1, 0, 2, 2, 104, 9, 5, 1, json.dumps({'s': 12.5, 'd': 4.2, 'lrt': lrt})),   # review, due day 104
        (11, 1, 1, 3, 1, CRT + 100 * 86400 + 600, 0, 3, 2, json.dumps({'s': 1.1, 'd': 7.0, 'lrt': lrt})),   # relearning
        (20, 2, 0, 1, 1, CRT + 100 * 86400 + 60, 0, 1, 0, ''),   # learning, no FSRS state yet
        (21, 2, 1, 0, 0, 5, 0, 0, 0, ''),                        # new: skipped
        (30, 3, 0, 0, 0, 6, 0, 0, 0, ''),
        (31, 3, 1, 2, -1, 104, 3, 9, 8, json.dumps({'s': 0.5, 'd': 10.0, 'lrt': lrt})),   # suspended: skipped
        (32, 3, 0, 2, 2, 103, 8, 2, 0, json.dumps({'pos': 4, 'lrt': lrt})),   # review without FSRS state
    ])
    day = lambda n, h=12: (CRT + n * 86400 + h * 3600) * 1000
    con.executemany('insert into revlog values (?, ?, ?, ?)', [
        (day(90), 10, 3, 1), (day(90, 13), 11, 3, 1),   # word 1 started on day 90
        (day(92), 10, 3, 9),                             # its Bulgarian → English card reaches 9 days: known
        (day(93), 20, 1, -600),                          # word 2 started on day 93
        (day(95), 10, 1, 1),                             # word 1 forgotten: no longer known
    ])
    con.commit(); con.close()


def test():
    with tempfile.TemporaryDirectory() as d:
        col = os.path.join(d, 'collection.anki2')
        fake_collection(col)
        out = os.path.join(d, 'out.json')
        prog = A.main(col, out, NOW)
        assert sorted(prog) == ['w:1|bg2en', 'w:1|en2bg', 'w:2|bg2en', 'w:3|bg2en'], sorted(prog)
        r = prog['w:3|bg2en']
        assert r['state'] == 'review' and r['s'] == 8.0 and r['d'] == 5.0 and r['due'] == (CRT + 103 * 86400) * 1000, r   # lrt day 95 + 8 days
        r = prog['w:1|bg2en']
        assert (r['state'], r['s'], r['d'], r['reps'], r['lapses']) == ('review', 12.5, 4.2, 5, 1), r
        assert r['due'] == (CRT + 104 * 86400) * 1000 and r['last'] == (CRT + 95 * 86400) * 1000, r   # reviewed on day 95 with a 9-day interval
        r = prog['w:1|en2bg']
        assert r['state'] == 'relearning' and r['step'] == 0 and r['due'] == (CRT + 100 * 86400 + 600) * 1000, r
        r = prog['w:2|bg2en']
        assert r['state'] == 'learning' and r['due'] == NOW and 's' not in r, r
        j = json.load(open(out, encoding='utf-8'))
        assert j['app'] == 'trakia' and set(j) == {'app', 'version', 'progress', 'wordDays'}, j.keys()
        wd = {k: v[:2] for k, v in j['wordDays'].items()}
        dk = lambda n: A.day_key(day_ms(n))
        assert wd[dk(90)] == [1, 0] and wd[dk(91)] == [1, 0] and wd[dk(92)] == [1, 1] and wd[dk(94)] == [2, 1] and wd[dk(95)] == [2, 0], wd
        assert dk(100) in wd and len(wd) == 11, sorted(wd)
        assert all(v[2] < NOW for v in j['wordDays'].values()), 'the app writes today later, and wins'
        # never into the repository
        try:
            A.main(col, os.path.join(A.ROOT, 'data', 'x-anki-progress.json'), NOW)
            raise AssertionError('wrote inside the repository')
        except SystemExit as e:
            assert 'refusing' in str(e)
        assert not os.path.exists(os.path.join(A.ROOT, 'data', 'x-anki-progress.json'))
    print('anki_progress: ok')


if __name__ == '__main__':
    test()
