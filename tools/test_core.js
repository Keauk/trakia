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
t('FSRS reference: py-fsrs test_review_card', () => {
  // steps as in py-fsrs defaults (1 min, 10 min / 10 min), fuzz off, retention 0.9
  const o = C.fsrsOpts({ fsrs: { learningSteps: [60e3, 600e3], relearningSteps: [600e3], maxInterval: 36500, fuzz: false } });
  const G = 3, A = 1, ratings = [G, G, G, G, G, G, A, A, G, G, G, G, G];
  let card = {}, now = Date.UTC(2022, 10, 29, 12, 30), hist = [];
  for (const r of ratings) { card = C.fsrsReview(card, r, now, o); hist.push(Math.floor((card.due - card.last) / 86400e3)); now = card.due; }
  assert.deepEqual(hist, [0, 2, 11, 46, 163, 498, 0, 0, 2, 4, 7, 12, 21]);
});
t('FSRS reference: py-fsrs test_memo_state', () => {
  const o = C.fsrsOpts({ fsrs: { learningSteps: [60e3, 600e3], relearningSteps: [600e3], maxInterval: 36500, fuzz: true } });
  const ratings = [1, 3, 3, 3, 3, 3], ivls = [0, 0, 1, 3, 8, 21];
  let card = {}, now = Date.UTC(2022, 10, 29, 12, 30);
  for (let i = 0; i < ratings.length; i++) { now += ivls[i] * 86400e3; card = C.fsrsReview(card, ratings[i], now, o, () => 0.5); }
  assert.ok(Math.abs(card.s - 53.62691) < 1e-4, 'stability ' + card.s);
  assert.ok(Math.abs(card.d - 6.3574867) < 1e-4, 'difficulty ' + card.d);
});
t('FSRS retrievability and retention', () => {
  const o = C.fsrsOpts();
  assert.ok(Math.abs(C.retrievability(10, 10, o) - 0.9) < 1e-9, 'R(S,S) = 0.9');
  assert.ok(C.retrievability(10, 30, o) < C.retrievability(10, 5, o));
  const run = ret => { const oo = C.fsrsOpts({ retention: ret, fsrs: { fuzz: false } }); let c = {}, now = 1e12; for (const r of [3, 3, 3, 3]) { c = C.fsrsReview(c, r, now, oo); now = c.due; } return (c.due - c.last) / 86400e3; };
  assert.ok(run(0.8) > run(0.9) && run(0.9) > run(0.95), [run(0.8), run(0.9), run(0.95)].join(','));
  const capped = C.fsrsOpts({ maxInterval: 30, fsrs: { fuzz: false } });
  let c = { s: 500, d: 3, state: 'review', last: 1e12 - 400 * 86400e3 }; c = C.fsrsReview(c, 3, 1e12, capped);
  assert.equal((c.due - c.last) / 86400e3, 30);
});
t('applyResult with FSRS learning steps', () => {
  const now = 1e12, r = () => 0.5, S = { almostPolicy: 'staged', almostFreePasses: 2 };
  let p = C.applyResult(null, 'correct', now, false, r, null, S);
  assert.equal(p.state, 'learning'); assert.equal(p.step, 1); assert.equal(p.due, now + 10 * 60e3); assert.equal(p.box, 1); assert.equal(p.rating, 3);
  p = C.applyResult(p, 'correct', now + 10 * 60e3, false, r, null, S);
  assert.equal(p.step, 2); assert.equal(p.due, now + 10 * 60e3 + 3600e3);
  p = C.applyResult(p, 'correct', now + 70 * 60e3, false, r, null, S);
  assert.equal(p.state, 'review'); assert.ok(p.due - p.last >= 86400e3, 'graduated to at least a day');
  assert.ok(p.s > 2, 'stability grew: ' + p.s);
  let good = { s: 5, d: 5, state: 'review', last: now - 5 * 86400e3, due: now }, bad = Object.assign({}, good);
  for (let i = 0; i < 5; i++) good = C.applyResult(good, 'correct', good.due, false, r, null, S);
  bad = C.applyResult(bad, 'wrong', now, false, r, null, S); assert.equal(bad.state, 'relearning'); assert.equal(bad.lapses, 1);
  bad = C.applyResult(bad, 'wrong', bad.due, false, r, null, S); assert.equal(bad.lapses, 2);
  bad = C.applyResult(bad, 'correct', bad.due, false, r, null, S); assert.equal(bad.state, 'review');
  assert.ok(good.due - good.last > bad.due - bad.last);
  p = C.applyResult(null, 'wrong', now, false, r, null, S); assert.equal(p.state, 'learning'); assert.equal(p.step, 0); assert.equal(p.lapses, 1); assert.equal(p.box, 0);
});
t('FSRS migration of Leitner records', () => {
  const m = C.migrateRecord({ box: 7, due: 5, reps: 9, lapses: 1, streak: 3, last: 4 });
  assert.equal(m.state, 'review'); assert.equal(m.s, 16); assert.equal(m.d, 5.5); assert.equal(m.due, 5); assert.equal(m.reps, 9);
  const l = C.migrateRecord({ box: 1, due: 5, reps: 1, lapses: 0, streak: 1, last: 4 });
  assert.equal(l.state, 'learning'); assert.equal(l.step, 1);
  const z = C.migrateRecord({ box: 0, due: 5 }); assert.equal(z.step, 0); assert.ok(z.s > 0);
  assert.equal(C.migrateRecord(m), m, 'idempotent');
  assert.equal(C.maturity({ box: 7 }), 'mature'); assert.equal(C.maturity({ s: 3, state: 'review' }), 'established'); assert.equal(C.maturity({ s: 9, state: 'learning' }), 'young'); assert.equal(C.maturity({ s: 9, state: 'review' }), 'mature');
  assert.equal(C.boxFromRecord(m), 7); assert.equal(C.boxFromRecord({ s: 40, state: 'review' }), 8); assert.equal(C.boxFromRecord({ s: 0.5, state: 'review' }), 3);  // half a day >= the 6 h rung
});
t('free practice never moves a card forward', () => {
  const now = 1e12, r = () => 0.5;
  let p = C.applyResult({ s: 20, d: 5, state: 'review', due: now + 5e8, last: now - 1e8, reps: 3, lapses: 0, streak: 2 }, 'correct', now, true, r, null, {});
  assert.equal(p.due, now + 5e8); assert.equal(p.s, 20); assert.equal(p.reps, 4); assert.equal(p.streak, 3);
  p = C.applyResult(p, 'wrong', now, true, r, null, {});
  assert.equal(p.state, 'relearning'); assert.equal(p.due, now); assert.equal(p.lapses, 1); assert.ok(p.s < 20);
});
t('session: most forgotten due cards first', () => {
  const S = [{ id: 'a', max_rank: 10 }, { id: 'b', max_rank: 20 }, { id: 'c', max_rank: 30 }];
  const now = 1e12, day = 86400e3;
  const prog = { 'a|bg2nl': { s: 10, d: 5, state: 'review', due: now - day, last: now - 11 * day },
                 'b|bg2nl': { s: 2, d: 5, state: 'review', due: now - day, last: now - 20 * day },
                 'c|bg2nl': { state: 'learning', step: 1, s: 2, d: 5, due: now - 1, last: now - 3600e3 } };
  const s = C.buildSession(S, prog, { rank: 100, newPerSession: 0, directions: 'bg2nl', newOrder: 'strict' }, now, () => 0.5);
  assert.deepEqual(s.queue, ['c|bg2nl', 'b|bg2nl', 'a|bg2nl']);
  assert.ok(C.recallNow(prog['b|bg2nl'], now, {}) < C.recallNow(prog['a|bg2nl'], now, {}));
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
t('D-008 grammar stages', () => {
  const S = [{ id: 'a', max_rank: 10, grammar: ['present'] }, { id: 'b', max_rank: 10, grammar: ['aorist'] }, { id: 'c', max_rank: 10, grammar: ['present', 'future', 'numeral'] }, { id: 'd', max_rank: 10 }];
  const el = st => S.filter(s => C.eligible(s, { rank: 100, stage: st })).map(s => s.id).join('');
  assert.equal(el(1), 'ad'); assert.equal(el(2), 'acd'); assert.equal(el(3), 'abcd'); assert.equal(el(5), 'abcd');
  assert.equal(el(undefined), 'abcd', 'no stage setting = everything');
  assert.ok(C.grammarOk({ grammar: ['present', 'comparative'] }, { stage: 1 }), 'informational tags never gate');
  // due cards are served regardless of stage; new cards are gated
  const now = 1e12, prog = { 'b|bg2nl': { s: 3, d: 5, state: 'review', due: now - 1, last: now - 4 * 86400e3 } };
  const q = C.buildSession(S, prog, { rank: 100, stage: 1, newPerSession: 10, directions: 'bg2nl', newOrder: 'strict' }, now, () => 0.5).queue;
  assert.deepEqual(q, ['b|bg2nl', 'a|bg2nl', 'd|bg2nl']);
});
t('D-009 drill generator', () => {
  const G = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'data', 'grammar.json'), 'utf8'));
  const all = C.drillItems(G, 5), s1 = C.drillItems(G, 1), s2 = C.drillItems(G, 2);
  assert.ok(all.length > 400, 'items: ' + all.length);
  assert.ok(s1.every(it => it.stage === 1) && s1.length < s2.length && s2.length < all.length);
  assert.ok(s1.some(it => it.kind === 'conj') && s1.some(it => it.kind === 'poss') && s1.some(it => it.kind === 'art'));
  assert.ok(!s1.some(it => it.kind === 'fut') && s2.some(it => it.kind === 'fut') && s2.some(it => it.kind === 'imp'));
  const ids = new Set(all.map(it => it.id)); assert.equal(ids.size, all.length, 'ids unique');
  // every answer passes the checker when typed exactly; paradigms cover all six persons
  for (const it of all) { assert.ok(it.answers.length && it.answers.every(a => a && !/undefined/.test(a)), it.id); assert.equal(C.check(it.answers[0], it.answers, 'bg', { bagOfWords: false }).result, 'correct', it.id); }
  for (const v of G.paradigms.present) assert.equal(Object.keys(v.forms).length, 6, v.verb);
  // specific forms
  const by = Object.fromEntries(all.map(it => [it.id, it]));
  assert.deepEqual(by['conj:съм:ние'].answers, ['сме']); assert.deepEqual(by['poss:short:my:майка'].answers, ['майка ми']); assert.deepEqual(by['poss:long:his:къща'].answers, ['неговата къща']);
  assert.deepEqual(by['art:хляб:subj'].answers, ['хлябът']); assert.deepEqual(by['art:хляб:obj'].answers, ['хляба']); assert.deepEqual(by['fut:отида:аз'].answers, ['ще отида']);
  assert.deepEqual(by['imp:дойда:вие'].answers, ['елате']); assert.deepEqual(by['aor:купя:ние'].answers, ['купихме']);
  assert.ok(by['perf:чета:аз'].answers.includes('чел съм') && by['perf:чета:аз'].answers.includes('чела съм') && by['perf:чета:те'].answers.includes('чели са'));
  assert.ok(by['cond:искам:аз'].answers.includes('бих искала'));
  // weighting: a form answered wrong is picked far more often
  let seed = 9; const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const tally = { 'conj:съм:ние': { ok: 0, bad: 5 } };
  let hits = 0; for (let i = 0; i < 40; i++) if (C.buildDrill(G, { stage: 1 }, tally, 15, rand).some(it => it.id === 'conj:съм:ние')) hits++;
  assert.ok(hits >= 20, 'weak form picked in ' + hits + ' of 40 drills');
  const d = C.buildDrill(G, { stage: 1 }, {}, 15, rand); assert.equal(d.length, 15); assert.equal(new Set(d.map(it => it.id)).size, 15);
  assert.ok(C.buildDrill(G, { stage: 1 }, {}, 10, rand, 'sum').every(it => it.card === 'sum'));
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
t('applyResult with almost policy (FSRS)', () => {
  const now = 1e12, r = () => 0.5, S = { almostPolicy: 'staged', almostFreePasses: 2 };
  // new card: two typos advance it through the learning steps, the third holds (Hard repeats the step)
  let p = C.applyResult(null, 'almost', now, false, r, 'typo', S); assert.equal(p.step, 1); assert.equal(p.almosts, 1); assert.equal(p.rating, 3);
  p = C.applyResult(p, 'almost', p.due, false, r, 'typo', S); assert.equal(p.step, 2); assert.equal(p.almosts, 2);
  p = C.applyResult(p, 'almost', p.due, false, r, 'typo', S); assert.equal(p.step, 2); assert.equal(p.almosts, 2); assert.equal(p.lapses, 0); assert.equal(p.rating, 2);
  // mature card (legacy box 7 -> stability 16 d): an almost lapses it
  p = C.applyResult({ box: 7, due: now + 5e8, last: now - 16 * 86400e3 }, 'almost', now, false, r, 'typo', S);
  assert.equal(p.state, 'relearning'); assert.equal(p.due, now + 10 * 60e3); assert.equal(p.lapses, 1); assert.equal(p.rating, 1);
  // free practice never consumes passes and never advances
  p = C.applyResult({ box: 1, due: now + 5e8, last: now - 1 }, 'almost', now, true, r, 'typo', S); assert.equal(p.due, now + 5e8); assert.equal(p.almosts, undefined);
  // lenient keeps the card in review as Hard; strict demotes
  p = C.applyResult({ box: 7, due: now + 5e8, last: now - 16 * 86400e3 }, 'almost', now, false, r, 'typo', { almostPolicy: 'lenient' }); assert.equal(p.state, 'review'); assert.equal(p.lapses, 0); assert.equal(p.rating, 2);
  p = C.applyResult({ box: 3, due: now, last: now - 3600e3 }, 'almost', now, false, r, 'typo', { almostPolicy: 'strict' }); assert.equal(p.lapses, 1); assert.equal(p.rating, 1);
  // no settings at all -> staged defaults
  p = C.applyResult(null, 'almost', now, false, r, 'typo'); assert.equal(p.step, 1); assert.equal(p.almosts, 1);
});
console.log(n, 'test groups passed' + (process.exitCode ? ' (with failures)' : ''));
