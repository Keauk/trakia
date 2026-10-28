#!/usr/bin/env python3
"""python3 tools/test_anki_progress.py: tests for anki_progress.py on a small fake collection (D-035)"""
import json, os, sqlite3, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import anki_progress as A

CRT = 1_700_000_000
NOW = (CRT + 100 * 86400) * 1000


def fake_collection(path):
    con = sqlite3.connect(path)
    con.executescript('''
        create table col (crt integer);
        create table notes (id integer, mid integer, flds text);
        create table cards (id integer, nid integer, ord integer, type integer, queue integer, due integer,
                            reps integer, lapses integer, data text);
        create table templates (ntid integer, ord integer, name text);''')
    con.execute('insert into col values (?)', (CRT,))
    con.executemany('insert into templates values (?, ?, ?)', [(7, 0, 'BG -> EN'), (7, 1, 'EN -> BG')])
    fl = lambda rank, bg: '\x1f'.join([bg, 'en', 's_bg', 's_en', 'noun', 'cat', str(rank), ''])
    con.executemany('insert into notes values (?, 7, ?)', [(1, fl(1, 'и')), (2, fl(2, 'да')), (3, fl(3, 'не'))])
    lrt = CRT + 95 * 86400
    con.executemany('insert into cards values (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        (10, 1, 0, 2, 2, 104, 5, 1, json.dumps({'s': 12.5, 'd': 4.2, 'lrt': lrt})),   # review, due day 104
        (11, 1, 1, 3, 1, CRT + 100 * 86400 + 600, 3, 2, json.dumps({'s': 1.1, 'd': 7.0, 'lrt': lrt})),   # relearning
        (20, 2, 0, 1, 1, CRT + 100 * 86400 + 60, 1, 0, ''),   # learning, no FSRS state yet
        (21, 2, 1, 0, 0, 5, 0, 0, ''),                        # new: skipped
        (30, 3, 0, 0, 0, 6, 0, 0, ''),
    ])
    con.commit(); con.close()


def test():
    with tempfile.TemporaryDirectory() as d:
        col = os.path.join(d, 'collection.anki2')
        fake_collection(col)
        out = os.path.join(d, 'out.json')
        prog = A.main(col, out, NOW)
        assert sorted(prog) == ['w:1|bg2en', 'w:1|en2bg', 'w:2|bg2en'], sorted(prog)
        r = prog['w:1|bg2en']
        assert (r['state'], r['s'], r['d'], r['reps'], r['lapses']) == ('review', 12.5, 4.2, 5, 1), r
        assert r['due'] == (CRT + 104 * 86400) * 1000 and r['last'] == (CRT + 95 * 86400) * 1000, r
        r = prog['w:1|en2bg']
        assert r['state'] == 'relearning' and r['step'] == 0 and r['due'] == (CRT + 100 * 86400 + 600) * 1000, r
        r = prog['w:2|bg2en']
        assert r['state'] == 'learning' and r['due'] == NOW and 's' not in r, r
        j = json.load(open(out, encoding='utf-8'))
        assert j['app'] == 'trakia' and set(j) == {'app', 'version', 'progress'}, j.keys()
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
