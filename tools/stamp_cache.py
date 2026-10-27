#!/usr/bin/env python3
"""Stamp the service worker's cache name with a hash of the files it caches (D-032).

Usage:  python3 tools/stamp_cache.py            # write CACHE_VERSION into app/sw.js (npm run build does this)
        python3 tools/stamp_cache.py --check    # exit 1 when app/sw.js carries a stale version (npm test)

The files are the SHELL list in app/sw.js, hashed in list order (path and contents), so any change to
index.html, ui.js, core.js, data.js, the fonts or the icons gives a new cache name, and phones pick up
the new version. sw.js itself is not hashed: a browser installs a changed sw.js anyway.
"""
import hashlib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SW = os.path.join(ROOT, 'app', 'sw.js')
VERSION_RE = re.compile(r"const CACHE_VERSION = '([^']*)';")


def shell_files(sw_text):
    block = re.search(r'const SHELL = \[(.*?)\];', sw_text, re.S).group(1)
    paths = re.findall(r"'\./([^']*)'", block)
    return [p for p in paths if p]          # './' is index.html, which is listed too


def version(sw_text):
    h = hashlib.sha256()
    for p in shell_files(sw_text):
        h.update(p.encode() + b'\0')
        with open(os.path.join(ROOT, 'app', p), 'rb') as fh:
            h.update(fh.read())
    return 'trakia-' + h.hexdigest()[:12]


def main(argv):
    text = open(SW, encoding='utf-8').read()
    want, have = version(text), VERSION_RE.search(text).group(1)
    if '--check' in argv:
        if want == have:
            print(f'app/sw.js cache version is current ({have})')
            return 0
        print(f'app/sw.js has cache version {have}, the app files give {want}: run npm run build')
        return 1
    if want != have:
        open(SW, 'w', encoding='utf-8').write(VERSION_RE.sub(f"const CACHE_VERSION = '{want}';", text))
    print(f'app/sw.js cache version {want}' + ('' if want != have else ' (unchanged)'))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
