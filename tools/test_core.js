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
  p = C.applyResult(p, 'almost', now, false, r); assert.equal(p.box, 2);
  p = C.applyResult(p, 'wrong', now, false, r); assert.equal(p.box, 0); assert.equal(p.due, now); assert.equal(p.lapses, 1);
  p = C.applyResult({ box: 8 }, 'correct', now, false, r); assert.equal(p.box, 8);
  p = C.applyResult({ box: 5, due: now + 999 }, 'correct', now, true, r); assert.equal(p.box, 5); assert.equal(p.due, now + 999); // free mode leaves schedule
});
t('buildSession', () => {
  const S = [{ id: 'a', max_rank: 10 }, { id: 'b', max_rank: 50 }, { id: 'c', max_rank: 500 }, { id: 'd', max_rank: null }];
  const now = 1e12;
  let s = C.buildSession(S, {}, { rank: 100, newPerSession: 10, directions: 'gated' }, now, () => 0.5);
  assert.deepEqual(s.queue, ['a|bg2nl', 'b|bg2nl', 'd|bg2nl']); assert.equal(s.free, false);
  const prog = { 'a|bg2nl': { box: 1, due: now - 1 }, 'b|bg2nl': { box: 3, due: now + 1e9 } };
  s = C.buildSession(S, prog, { rank: 100, newPerSession: 1, directions: 'gated' }, now, () => 0.5);
  assert.deepEqual(s.queue, ['a|bg2nl', 'a|nl2bg']);  // due first, then the gated reverse card unlocks (lowest rank first)
  s = C.buildSession(S, prog, { rank: 100, newPerSession: 10, directions: 'bg2nl' }, now + 2e9, () => 0.5);
  assert.deepEqual(s.queue, ['a|bg2nl', 'b|bg2nl', 'd|bg2nl']);  // both due: oldest due first, then new
  s = C.buildSession([S[0]], { 'a|bg2nl': { box: 2, due: now + 1e9 }, 'a|nl2bg': { box: 1, due: now + 1e9 } }, { rank: 100, directions: 'both' }, now, () => 0.5);
  assert.equal(s.free, true); assert.deepEqual(s.queue, ['a|nl2bg', 'a|bg2nl']);
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
console.log(n, 'test groups passed' + (process.exitCode ? ' (with failures)' : ''));
