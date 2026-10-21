// node tools/test_core.js — unit tests for app/core.js
const C = require('../app/core.js');
const assert = require('assert');
let n = 0; const t = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name, e.message); process.exitCode = 1; } };

t('normalise strips punctuation/case/ѝ', () => {
  assert.equal(C.normalise('Името ѝ е Мария!', 'bg'), 'името и е мария');
  assert.equal(C.normalise('  Één   kopje thee, graag.', 'nl'), 'een kopje thee graag');
  assert.equal(C.normalise('Добър ден.', 'bg', { strictPunct: true }), 'добър ден.');
});
t('distance', () => { assert.equal(C.distance('кафе', 'кафе'), 0); assert.equal(C.distance('кафе', 'кофе'), 1); assert.equal(C.distance('abcd', 'abdc'), 1); assert.equal(C.distance('', 'abc'), 3); });
t('check correct / almost / wrong', () => {
  const acc = ['Ik heb brood en melk gekocht.', 'Ik kocht brood en melk.'];
  assert.equal(C.check('ik kocht brood en melk', acc, 'nl').result, 'correct');
  assert.equal(C.check('Ik heb brood en mekl gekocht', acc, 'nl').result, 'almost');   // 1 transposition, len 27 -> thresh 3
  assert.equal(C.check('Ik heb brood en melk gekocht.', acc, 'nl', { typoPct: 0 }).result, 'correct');
});
t('check thresholds', () => {
  const r = C.check('Ik heb kaas en melk gekocht', ['Ik heb brood en melk gekocht.'], 'nl');
  // 'kaas' vs 'brood': distance 5 > thresh 3 -> wrong
  assert.equal(r.result, 'wrong'); assert.equal(r.dist, 5);
  assert.equal(C.check('да', ['Не.'], 'bg').result, 'wrong');
  assert.equal(C.check('', ['Не.'], 'bg').result, 'wrong');
  assert.equal(C.check('Хляб купих и мляко', ['Купих хляб и мляко.'], 'bg').result, 'almost'); // word order
  assert.equal(C.check('Хляб купих и мляко', ['Купих хляб и мляко.'], 'bg', { bagOfWords: false }).result, 'wrong');
  assert.equal(C.check('Hläb kocht ik', ['Ik kocht brood'], 'nl').result, 'wrong'); // no bag-of-words for nl
});
t('diff', () => {
  const d = C.diff('ik kocht brod', 'ik kocht brood');
  assert.deepEqual(d, [['eq', 'ik kocht bro'], ['ins', 'o'], ['eq', 'd']]);
});
t('translit', () => {
  assert.equal(C.translit('Kupih hlyab i mlyako'), 'Купих хляб и мляко');
  assert.equal(C.translit('Shte dojda s priyatel. Zdravej!'), 'Ще дойда с приятел. Здравей!');
  assert.equal(C.translit('chasha chaj, kashkaval, yod'), 'чаша чай, кашкавал, ьод');
});
t('applyResult ladder', () => {
  const now = 1e12, r = () => 0.5;
  let p = C.applyResult(null, 'correct', now, false, r); assert.equal(p.box, 1); assert.equal(p.due, now + 10 * 60e3);
  p = C.applyResult(p, 'correct', now, false, r); assert.equal(p.box, 2); assert.equal(p.due, now + 3600e3);
  p = C.applyResult(p, 'almost', now, false, r, 'typo', { almostPolicy: 'lenient' }); assert.equal(p.box, 2);  // lenient: almost holds the box
  p = C.applyResult(p, 'wrong', now, false, r); assert.equal(p.box, 0); assert.equal(p.due, now); assert.equal(p.lapses, 1);
  p = C.applyResult({ box: 8 }, 'correct', now, false, r); assert.equal(p.box, 8);
  p = C.applyResult({ box: 5, due: now + 999 }, 'correct', now, true, r); assert.equal(p.box, 5); assert.equal(p.due, now + 999); // free mode leaves schedule
});
t('buildSession (strict order)', () => {
  const S = [{ id: 'a', max_rank: 10 }, { id: 'b', max_rank: 50 }, { id: 'c', max_rank: 500 }, { id: 'd', max_rank: null }];
  const now = 1e12, strict = { rank: 100, newPerSession: 10, directions: 'gated', newOrder: 'strict' };
  let s = C.buildSession(S, {}, strict, now, () => 0.5);
  assert.deepEqual(s.queue, ['a|bg2nl', 'b|bg2nl', 'd|bg2nl']); assert.equal(s.free, false);
  const prog = { 'a|bg2nl': { box: 1, due: now - 1 }, 'b|bg2nl': { box: 3, due: now + 1e9 } };
  s = C.buildSession(S, prog, Object.assign({}, strict, { newPerSession: 1 }), now, () => 0.5);
  assert.deepEqual(s.queue, ['a|bg2nl', 'a|nl2bg']);  // due first, then the gated reverse card unlocks (lowest rank first)
  s = C.buildSession(S, prog, Object.assign({}, strict, { directions: 'bg2nl' }), now + 2e9, () => 0.5);
  assert.deepEqual(s.queue, ['a|bg2nl', 'b|bg2nl', 'd|bg2nl']);  // both due: oldest due first, then new
  s = C.buildSession([S[0]], { 'a|bg2nl': { box: 2, due: now + 1e9 }, 'a|nl2bg': { box: 1, due: now + 1e9 } }, { rank: 100, directions: 'both' }, now, () => 0.5);
  assert.equal(s.free, true); assert.deepEqual(s.queue, ['a|nl2bg', 'a|bg2nl']);
});
t('D-003 interleave and spreadOut', () => {
  // never more than 3 new cards before a waiting due card; due order kept
  const q = C.interleave(['d1', 'd2'], ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8']);
  assert.deepEqual(q.slice(0, 5), ['d1', 'n1', 'n2', 'n3', 'd2']);
  assert.equal(q.length, 10);
  assert.deepEqual(C.interleave([], ['n1']), ['n1']); assert.deepEqual(C.interleave(['d1'], []), ['d1']);
  // consecutive cards never share a content lemma when avoidable; directions alternate
  const byId = new Map([
    ['a', { id: 'a', lemmas: ['хляб', 'купувам'] }], ['b', { id: 'b', lemmas: ['хляб', 'ям'] }],
    ['c', { id: 'c', lemmas: ['куче', 'виждам'] }], ['d', { id: 'd', lemmas: ['куче', 'и', 'на'] }],
  ]);
  const out = C.spreadOut(['a|bg2nl', 'b|bg2nl', 'c|bg2nl', 'd|nl2bg'], byId);
  for (let i = 1; i < out.length; i++) {
    const A = C.contentLemmas(byId.get(out[i - 1].split('|')[0])), B = C.contentLemmas(byId.get(out[i].split('|')[0]));
    for (const x of A) assert.ok(!B.has(x), 'shared lemma at ' + i + ': ' + out.join(','));
  }
  assert.equal(out[0], 'a|bg2nl'); assert.equal(out[1], 'd|nl2bg');  // different direction preferred over c
  // unavoidable conflict: still returns all cards
  assert.equal(C.spreadOut(['a|bg2nl', 'b|bg2nl'], byId).length, 2);
  // stop words do not count as shared content
  assert.ok(!C.contentLemmas({ lemmas: ['и', 'на', 'аз'] }).size);
});
t('D-003 mixed new-card selection', () => {
  // 60 sentences, ranks 10..600, learner at 300 with tolerance 300 -> all eligible
  const S = []; for (let i = 1; i <= 60; i++) S.push({ id: 's' + i, max_rank: i * 10, lemmas: ['w' + i] });
  let seed = 7; const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const s = C.buildSession(S, {}, { rank: 300, tolerance: 300, newPerSession: 10, directions: 'bg2nl' }, 1e12, rand);
  assert.equal(s.queue.length, 10);
  const ranks = s.queue.map(k => +k.split('|')[0].slice(1) * 10);
  assert.ok(Math.max(...ranks) - Math.min(...ranks) >= 295, 'spread covers at least half the range: ' + ranks.join(','));
  const lowHalf = ranks.filter(r => r <= 300).length;
  assert.ok(lowHalf >= 5, 'lower ranks preferred: ' + ranks.join(','));
  // strict mode: exactly the ten lowest
  const st = C.buildSession(S, {}, { rank: 300, tolerance: 300, newPerSession: 10, directions: 'bg2nl', newOrder: 'strict' }, 1e12, rand);
  assert.deepEqual(st.queue.map(k => +k.split('|')[0].slice(1) * 10).sort((a, b) => a - b), [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  // due cards are mixed in, not all first: with 6 due and 10 new, the 5th card is not due
  const prog = {}; for (let i = 50; i <= 55; i++) prog['s' + i + '|bg2nl'] = { box: 2, due: 1e12 - i };
  const m = C.buildSession(S, prog, { rank: 300, tolerance: 300, newPerSession: 10, directions: 'bg2nl', newOrder: 'strict' }, 1e12, rand);
  assert.equal(m.queue.length, 16); assert.equal(m.nDue, 6);
  const dueIdx = m.queue.map((k, i) => prog[k] ? i : -1).filter(i => i >= 0);
  assert.ok(dueIdx[dueIdx.length - 1] < 15, 'due cards are spread through the session: ' + dueIdx.join(','));
  assert.ok(dueIdx.some((v, i) => i > 0 && v - dueIdx[i - 1] > 1), 'new cards sit between due cards');
});
t('D-003 unlocked production cards come first', () => {
  const S = []; for (let i = 1; i <= 40; i++) S.push({ id: 's' + i, max_rank: i * 10, lemmas: ['w' + i] });
  let seed = 3; const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const prog = { 's30|bg2nl': { box: 1, due: 2e12 }, 's31|bg2nl': { box: 1, due: 2e12 }, 's32|bg2nl': { box: 1, due: 2e12 } };
  const s = C.buildSession(S, prog, { rank: 400, newPerSession: 6, directions: 'gated' }, 1e12, rand);
  const nl2bg = s.queue.filter(k => k.endsWith('|nl2bg'));
  assert.deepEqual(nl2bg.sort(), ['s30|nl2bg', 's31|nl2bg', 's32|nl2bg']);
  assert.equal(s.queue.length, 6);
  // at most half the slots: 5 unlocked, 4 new slots -> 2 production cards
  const prog5 = {}; for (let i = 20; i <= 24; i++) prog5['s' + i + '|bg2nl'] = { box: 1, due: 2e12 };
  const s2 = C.buildSession(S, prog5, { rank: 400, newPerSession: 4, directions: 'gated', newOrder: 'strict' }, 1e12, rand);
  assert.deepEqual(s2.queue.filter(k => k.endsWith('|nl2bg')).sort(), ['s20|nl2bg', 's21|nl2bg']);
});
t('rowToSentence + index', () => {
  const idx = C.wordIndex([{ rank: 1, bg: 'и', en: 'and', forms: '' }, { rank: 8, bg: 'аз', en: 'I', forms: 'аз (ме, мен, ми)' }, { rank: 300, bg: 'хляб', en: 'bread', forms: '' }]);
  assert.equal(idx.get('ми').rank, 8);
  const s = C.rowToSentence({ bg: 'Дай ми хляб.', nl: 'Geef me brood.', nl_alt: 'Geef mij brood. | Brood, graag.', lemmas: 'аз, хляб' }, idx);
  assert.equal(s.max_rank, 300); assert.deepEqual(s.nl_alt, ['Geef mij brood.', 'Brood, graag.']); assert.ok(s.id.startsWith('u'));
  const s2 = C.rowToSentence({ bg: 'Дай ми хляб и сол.', nl: 'x' }, idx);
  assert.equal(s2.max_rank, 300); assert.equal(s2.rank_estimated, true);
  assert.equal(C.rowToSentence({ bg: '', nl: 'x' }, idx), null);
});
t('parseDelimited', () => {
  const rows = C.parseDelimited('bg,nl,nl_alt\n"Как си?",Hoe gaat het?,"Hoe is het? | Alles goed?"\nДа.,Ja.,\n');
  assert.equal(rows.length, 2); assert.equal(rows[0].nl_alt, 'Hoe is het? | Alles goed?'); assert.equal(rows[1].bg, 'Да.');
  const tsv = C.parseDelimited('bg\tnl\nДа.\tJa.');
  assert.equal(tsv[0].nl, 'Ja.');
});

// --- D-002: almost policy ---
t('almostOutcome stages', () => {
  const S = { almostPolicy: 'staged', almostFreePasses: 2 };
  assert.deepEqual(C.almostOutcome(null, 'typo', S), { rating: 'correct', rule: 'free-pass', counter: 'almosts', used: 1, passes: 2 });
  assert.equal(C.almostOutcome({ box: 2, almosts: 2 }, 'typo', S).rule, 'hold');       // passes used up
  assert.equal(C.almostOutcome({ box: 2, almosts: 2 }, 'order', S).rule, 'free-pass'); // separate counter for word order
  assert.equal(C.almostOutcome({ box: 4 }, 'typo', S).rule, 'hold');
  assert.deepEqual(C.almostOutcome({ box: 6 }, 'typo', S), { rating: 'wrong', rule: 'lapse' });
  assert.equal(C.almostOutcome({ box: 7 }, 'typo', { almostPolicy: 'lenient' }).rating, 'almost');
  assert.equal(C.almostOutcome({ box: 0 }, 'typo', { almostPolicy: 'strict' }).rating, 'wrong');
  assert.equal(C.almostOutcome({ box: 0 }, 'typo', { almostPolicy: 'staged', almostFreePasses: 0 }).rule, 'hold');
});
t('applyResult with almost policy', () => {
  const now = 1e12, r = () => 0.5, S = { almostPolicy: 'staged', almostFreePasses: 2 };
  // new card: two typos advance it to box 2, the third holds
  let p = C.applyResult(null, 'almost', now, false, r, 'typo', S); assert.equal(p.box, 1); assert.equal(p.almosts, 1);
  p = C.applyResult(p, 'almost', now, false, r, 'typo', S); assert.equal(p.box, 2); assert.equal(p.almosts, 2);
  p = C.applyResult(p, 'almost', now, false, r, 'typo', S); assert.equal(p.box, 2); assert.equal(p.almosts, 2); assert.equal(p.lapses, 0);
  // mature card: an almost lapses it
  p = C.applyResult({ box: 7, due: now + 5e8 }, 'almost', now, false, r, 'typo', S);
  assert.equal(p.box, 5); assert.equal(p.due, now); assert.equal(p.lapses, 1);
  // free practice never consumes passes and never advances
  p = C.applyResult({ box: 1 }, 'almost', now, true, r, 'typo', S); assert.equal(p.box, 1); assert.equal(p.almosts, undefined);
  // lenient keeps the old behaviour; strict demotes
  p = C.applyResult({ box: 7, due: now + 5e8 }, 'almost', now, false, r, 'typo', { almostPolicy: 'lenient' }); assert.equal(p.box, 7); assert.equal(p.lapses, 0);
  p = C.applyResult({ box: 3 }, 'almost', now, false, r, 'typo', { almostPolicy: 'strict' }); assert.equal(p.box, 1); assert.equal(p.lapses, 1);
  // no settings at all -> staged defaults
  p = C.applyResult(null, 'almost', now, false, r, 'typo'); assert.equal(p.box, 1); assert.equal(p.almosts, 1);
});

console.log(n, 'test groups passed' + (process.exitCode ? ' (with failures)' : ''));
