#!/usr/bin/env python3
"""Check that every decision record follows decisions/TEMPLATE.md and is listed in decisions/README.md.

    python3 tools/check_decisions.py        # exit 1 and print each problem if any
"""
import os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'decisions')
SECTIONS = ['Context', 'Proposal', 'Design notes', 'Acceptance criteria', 'Effort and risks', 'As built', 'Open questions']
SUBSECTIONS = ['Decisions taken', 'Measurements']
STATUS = re.compile(r'^Status: (proposed|accepted|in progress|done \(\d{4}-\d{2}-\d{2}\)|rejected \(\d{4}-\d{2}-\d{2}\)) · Created: \d{4}-\d{2}-\d{2} · Area: \S.*$')
FILENAME = re.compile(r'^D-(\d{3})-[a-z0-9]+(-[a-z0-9]+)*\.md$')
ROW = re.compile(r'^\| \[D-(\d{3})\]\(([^)]+)\) \| .+ \| .+ \| (proposed|accepted|in progress|done|rejected) \|$')

problems = []
def bad(name, msg): problems.append(f'{name}: {msg}')

readme = open(os.path.join(ROOT, 'README.md'), encoding='utf-8').read().splitlines()
rows = {}
for ln in readme:
    if ln.startswith('| [D-'):
        m = ROW.match(ln)
        if not m: bad('README.md', f'malformed table row: {ln}'); continue
        rows[m.group(2)] = m.group(3)

files = sorted(f for f in os.listdir(ROOT) if f.startswith('D-'))
for name in files:
    m = FILENAME.match(name)
    if not m: bad(name, 'file name must be D-NNN-short-slug.md (lowercase, hyphens)'); continue
    did = 'D-' + m.group(1)
    lines = open(os.path.join(ROOT, name), encoding='utf-8').read().split('\n')
    if len(lines) < 3 or not lines[0].startswith(f'# {did}: ') or len(lines[0]) <= len(did) + 4:
        bad(name, f'line 1 must be "# {did}: <title>"')
    if len(lines) < 3 or lines[1] != '' or not STATUS.match(lines[2]):
        bad(name, 'line 3 must be "Status: <status> · Created: YYYY-MM-DD · Area: <area>" (status: proposed, accepted, in progress, done (date), rejected (date))')
    heads = [ln[3:].strip() for ln in lines if ln.startswith('## ')]
    if heads != SECTIONS:
        bad(name, f'sections must be exactly {SECTIONS} in that order; found {heads}')
    subs = [ln[4:].strip() for ln in lines if ln.startswith('### ')]
    for s in subs:
        if not any(s == t or s.startswith(t + ' (') for t in SUBSECTIONS):
            bad(name, f'unexpected subsection "{s}" (allowed under As built: {SUBSECTIONS})')
    # every section has a body
    body, cur = {}, None
    for ln in lines:
        if ln.startswith('## '): cur = ln[3:].strip(); body[cur] = ''
        elif cur: body[cur] += ln.strip()
    for h in SECTIONS:
        if h in body and not body[h]: bad(name, f'section "{h}" is empty (write "None." or "Not started.")')
    status = lines[2].split('·')[0].replace('Status:', '').strip().split(' (')[0] if len(lines) >= 3 else ''
    if name not in rows: bad(name, 'missing from the table in README.md')
    elif rows[name] != status: bad(name, f'README.md table says "{rows[name]}" but the file says "{status}"')
for link in rows:
    if link not in files: bad('README.md', f'table links to a file that does not exist: {link}')

if problems:
    print('\n'.join(problems)); print(f'{len(problems)} problem(s) in {len(files)} decision file(s)'); sys.exit(1)
print(f'{len(files)} decision files OK')
