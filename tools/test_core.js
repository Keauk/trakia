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
t('wordMarks (D-015)', () => {
  const marked = (typed, exp) => C.wordMarks(typed, exp).filter(x => x.miss).map(x => x.w);
  // case-sensitive, trailing punctuation ignored: an accepted lower-case answer still marks the capital
  assert.deepEqual(marked('Do you work on sunday', 'Do you work on Sunday?'), ['Sunday?']);
  assert.deepEqual(marked('Do you work on Sunday', 'Do you work on Sunday?'), []);
  // a missing word marks only that word (no cascade as with a positional comparison)
  assert.deepEqual(marked('Do you work Sunday?', 'Do you work on Sunday?'), ['on']);
  assert.deepEqual(marked('Do you really work on Sunday?', 'Do you work on Sunday?'), []);
  assert.deepEqual(marked('Where’s the station', "Where's the station?"), []);
  assert.deepEqual(marked('', 'Къде е гарата?'), ['Къде', 'е', 'гарата?']);
  assert.deepEqual(marked('Къде е гара', '„Къде е гарата?“ — пита той.'), ['гарата?“', 'пита', 'той.']);
  // the words come back unchanged, so joining them restores the sentence
  assert.equal(C.wordMarks('x', 'Ik kocht  brood.').map(x => x.w).join(' '), 'Ik kocht brood.');
});
t('wordMarks: extra typed words (D-019)', () => {
  const line = (typed, exp) => C.wordMarks(typed, exp).map(x => x.extra ? `-${x.w}-` : x.miss ? `[${x.w}]` : x.w).join(' ');
  // an extra word sits where it was typed, without its punctuation; nothing else is marked
  assert.equal(line('Do you really work on Sunday?', 'Do you work on Sunday?'), 'Do you -really- work on Sunday?');
  assert.equal(line('So, do you work on Sunday', 'do you work on Sunday?'), '-So- do you work on Sunday?');
  assert.equal(line('Do you work on Sunday? please', 'Do you work on Sunday?'), 'Do you work on Sunday? -please-');
  assert.equal(line('Аз купих хляб и и мляко', 'Аз купих хляб и мляко.'), 'Аз купих хляб и -и- мляко.');
  // a substituted word is shown by the missing word alone, also when more words were typed in its place
  assert.equal(line('Do you work at Sunday', 'Do you work on Sunday?'), 'Do you work [on] Sunday?');
  assert.equal(line('Do you work at the Sunday', 'Do you work on Sunday?'), 'Do you work [on] Sunday?');
  assert.equal(line('dit is helemaal fout', 'Ik kocht brood.'), '[Ik] [kocht] [brood.]');
  // a moved word: marked where it belongs, struck where it was typed
  assert.equal(line('хляб купих и мляко', 'Купих хляб и мляко.'), '[Купих] хляб -купих- и мляко.');
  // a punctuation-only token in the gap is not a missing word; the typed one stays an extra
  assert.equal(line('Ja echt zegt hij', 'Ja — zegt hij'), 'Ja -echt- — zegt hij');
  assert.equal(line('', 'Ja.'), '[Ja.]');
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
  // D-024: one 10-minute learning step, so a first Good graduates straight to FSRS (at least a day)
  let p = C.applyResult(null, 'correct', now, false, r, null, S);
  assert.equal(p.state, 'review', 'a first Good graduates'); assert.ok(p.due - p.last >= 86400e3, 'graduated to at least a day'); assert.equal(p.rating, 3);
  assert.equal(p.first, now, 'the first answer is remembered for the daily new-card limit');
  assert.ok(p.s > 2, 'stability: ' + p.s);
  p = C.applyResult(p, 'correct', p.due, false, r, null, S); assert.equal(p.first, now, 'later answers keep the first time');
  // a miss waits 10 minutes; the retry in the same session graduates on Good
  p = C.applyResult(null, 'wrong', now, false, r, null, S); assert.equal(p.state, 'learning'); assert.equal(p.due, now + 10 * 60e3);
  p = C.applyResult(p, 'correct', now + 60e3, false, r, null, S); assert.equal(p.state, 'review', 'a correct retry graduates');
  // records stored under the old 1 min -> 10 min -> 1 h steps graduate on their next Good
  for (const step of [1, 2]) assert.equal(C.applyResult({ s: 2.3, d: 5, state: 'learning', step, due: now, last: now - 600e3, reps: step }, 'correct', now, false, r, null, S).state, 'review', 'old step ' + step);
  // the old steps stay available through settings.fsrs
  p = C.applyResult(null, 'correct', now, false, r, null, Object.assign({ fsrs: { learningSteps: [60e3, 600e3, 3600e3] } }, S));
  assert.equal(p.state, 'learning'); assert.equal(p.step, 1); assert.equal(p.due, now + 600e3);
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
  // D-024: a's reverse card waits while a is due (one card per sentence); the one new place goes to b's unlocked reverse card
  assert.deepEqual(s.queue, ['a|bg2nl', 'b|nl2bg']);
  s = C.buildSession(S, prog, Object.assign({}, strict, { newPerSession: 10, sessionSize: 2 }), now, () => 0.5);
  assert.deepEqual(s.queue, ['a|bg2nl', 'b|nl2bg'], 'sessionSize caps the session: one due, one new');
  s = C.buildSession(S, prog, Object.assign({}, strict, { directions: 'bg2nl' }), now + 2e9, () => 0.5);
  assert.deepEqual(s.queue, ['a|bg2nl', 'b|bg2nl', 'd|bg2nl']);  // both due: oldest due first, then new
  s = C.buildSession([S[0]], { 'a|bg2nl': { box: 2, due: now + 1e9 }, 'a|nl2bg': { box: 1, due: now + 1e9 } }, { rank: 100, directions: 'both' }, now, () => 0.5);
  assert.equal(s.free, true); assert.deepEqual(s.queue, ['a|nl2bg'], 'free practice: the weakest card, one per sentence (D-024)');
});
t('D-006 explain', () => {
  const vocab = new Set(['детето', 'е', 'в', 'легло', 'леглото', 'хляб', 'хляба', 'хлябът', 'купих', 'мляко', 'ям', 'изям', 'супата', 'искам', 'да', 'и', 'новия', 'новият', 'нов', 'апартамент']);
  const aspects = C.aspectPairs([{ rank: 1, bg: 'ям', en: 'eat', pos: 'verb', forms: 'ям / изям' }, { rank: 2, bg: 'знам', en: 'know', pos: 'verb', forms: 'знам / зная' }, { rank: 3, bg: 'съм', en: 'be', pos: 'verb', forms: 'съм / бъда' }, { rank: 4, bg: 'събувам', en: 'take off', pos: 'verb', forms: 'събувам / събуя (се)' }]);
  const n = (t, a, lang) => C.explain(C.normalise(t, lang || 'bg'), C.normalise(a, lang || 'bg'), lang || 'bg', { vocab, aspects }).map(x => x.note);
  // article: missing, extra, full vs short; the bare form must be a known word
  assert.deepEqual(n('Детето е в легло.', 'Детето е в леглото.'), ['missing definite article: легло → леглото']);
  assert.deepEqual(n('Детето е в леглото.', 'Детето е в легло.'), ['no article here: леглото → легло']);
  assert.deepEqual(n('Купих хляба.', 'Купих хлябът.'), ['the full article -ът, because the noun is the subject: хляба → хлябът']);
  assert.deepEqual(n('Хлябът е в леглото.', 'Хляба е в леглото.'), ['the short article -а, because the noun is not the subject: хлябът → хляба']);
  assert.deepEqual(n('Купих новия апартамент.', 'Купих новият апартамент.'), ['the full article -ият, because the noun is the subject: новия → новият'], 'adjective article');
  // aspect, from the deck's verb pairs; spelling variants and съм are not pairs
  assert.deepEqual(n('Искам да ям супата.', 'Искам да изям супата.'), ['aspect: a single completed action takes the perfective изям, not ям']);
  assert.deepEqual(n('Искам да изям супата.', 'Искам да ям супата.'), ['aspect: an ongoing or repeated action takes the imperfective ям, not изям']);
  assert.equal(aspects.get('знам'), undefined); assert.equal(aspects.get('съм'), undefined); assert.deepEqual(aspects.get('събуя'), { other: 'събувам', perfective: true });
  // clitic order: only when the other words keep their order
  assert.deepEqual(n('Ми харесва.', 'Харесва ми.'), ['word order: short words like ми, се and ли stand right after the first stressed word']);
  assert.deepEqual(n('Мляко купих.', 'Купих мляко.'), [], 'plain word order gets no note (the verdict already says so)');
  // spelling and a missing or extra word
  assert.deepEqual(n('Купих млеко.', 'Купих мляко.'), ['spelling: млеко → мляко']);
  assert.deepEqual(n('Купих хляб мляко.', 'Купих хляб и мляко.'), ['missing word: и']);
  assert.deepEqual(n('Купих и хляб и мляко.', 'Купих хляб и мляко.'), ['extra word: и']);
  assert.deepEqual(n('Ik heb brood gekoqht.', 'Ik heb brood gekocht.', 'nl'), ['spelling: gekoqht → gekocht']);
  // silence: a correct answer, a wholly different one, an English word form (D-014 names it already), an unknown bare form
  assert.deepEqual(n('Купих мляко.', 'Купих мляко.'), []);
  assert.deepEqual(n('Котката спи.', 'Кучето лае силно днес.'), []);
  assert.deepEqual(n('Do you work on Sundays?', 'Do you work on Sunday?', 'en'), []);
  assert.deepEqual(n('Купих маса.', 'Купих масата.'), [], 'маса is not in this vocabulary, so no article note');
  // at most three notes, and the pair travels with the note
  const many = C.explain('а б в г д е ж з', 'а х в у д и ж о', 'bg', { vocab, aspects }); assert.ok(many.length <= 3); assert.deepEqual(many[0].pair, ['б', 'х']);
  // alignWords keeps wordSlips as it was
  assert.deepEqual(C.wordSlips('купих хляба', 'купих хляб', vocab, 'bg'), [['хляба', 'хляб']]);
  assert.deepEqual(C.alignWords('твоята кола', 'твоя та кола'), [['твоята', 'твоя та'], ['кола', 'кола']]);
});
t('D-021 keyboard blocks', () => {
  // twelve sentences with no shared words; L = typed in Dutch/English, C = typed in Bulgarian
  const ids = 'abcdefghijkl'.split(''), byId = new Map(ids.map((id, i) => [id, { id, lemmas: ['дума' + i] }]));
  const kb = k => k.endsWith('2bg') ? 'C' : 'L', pattern = q => q.map(kb).join('');
  const mixed = ids.map((id, i) => id + (i % 2 ? '|nl2bg' : '|bg2nl'));
  assert.equal(pattern(C.spreadOut(mixed, byId)), 'LCLCLCLCLCLC', 'run 1: alternate as before');
  assert.deepEqual(C.spreadOut(mixed, byId, 1), C.spreadOut(mixed, byId), 'run 1 is the old order');
  assert.equal(pattern(C.spreadOut(mixed, byId, 3)), 'LLLCCCLLLCCC');
  assert.equal(pattern(C.spreadOut(mixed, byId, 4)), 'LLLLCCCCLLCC');
  // one keyboard runs out: the rest stays on the other, no extra switches
  const lopsided = ids.map((id, i) => id + (i < 9 ? '|bg2nl' : '|nl2bg'));
  assert.equal(pattern(C.spreadOut(lopsided, byId, 4)), 'LLLLCCCLLLLL');
  // inside a block the previous direction is kept (Mixed: Dutch and English do not alternate)
  const langs = ['a|bg2nl', 'b|bg2en', 'c|bg2nl', 'd|bg2en', 'e|bg2nl', 'f|bg2en'];
  assert.deepEqual(C.spreadOut(langs, byId, 3).map(k => k.split('|')[1]), ['bg2nl', 'bg2nl', 'bg2nl', 'bg2en', 'bg2en', 'bg2en']);
  // inside a block the keyboard comes first, even when two cards share a word
  const shared = new Map([['a', { lemmas: ['хляб'] }], ['b', { lemmas: ['хляб'] }], ['c', { lemmas: ['куче'] }]]);
  assert.deepEqual(C.spreadOut(['a|bg2nl', 'b|bg2nl', 'c|nl2bg'], shared, 3), ['a|bg2nl', 'b|bg2nl', 'c|nl2bg']);
  // at a switch the shared-word rule comes first: the reverse of the card just answered does not follow it
  const rev = new Map([['x', { lemmas: ['хляб'] }], ['y', { lemmas: ['куче'] }], ['z', { lemmas: ['море'] }]]);
  assert.deepEqual(C.spreadOut(['y|bg2nl', 'x|bg2nl', 'x|nl2bg', 'z|bg2nl'], rev, 2), ['y|bg2nl', 'x|bg2nl', 'z|bg2nl', 'x|nl2bg']);
  // fullBlocks drops the least urgent due cards per keyboard, never a new one
  const due = ['d1|bg2nl', 'd2|bg2nl', 'd3|nl2bg', 'd4|bg2nl', 'd5|bg2nl', 'd6|bg2nl'];
  assert.deepEqual(C.fullBlocks(due, ['n1|bg2nl', 'n2|bg2nl', 'n3|bg2nl', 'n4|bg2nl', 'n5|nl2bg', 'n6|nl2bg', 'n7|nl2bg'], 4), ['d1|bg2nl', 'd2|bg2nl', 'd3|nl2bg', 'd4|bg2nl', 'd5|bg2nl'], '9 Latin → 8: the least urgent Latin review waits; 4 Cyrillic stay');
  assert.deepEqual(C.fullBlocks(due, [], 1), due, 'run 1 changes nothing');
  assert.deepEqual(C.fullBlocks(['d1|bg2nl'], ['n1|bg2nl', 'n2|bg2nl', 'n3|bg2nl', 'n4|bg2nl', 'n5|bg2nl'], 4), ['d1|bg2nl'], 'too few due cards to fill: keep them');
  assert.deepEqual(C.fullBlocks(['d1|bg2nl', 'd2|bg2nl'], ['n1|nl2bg'], 4), ['d1|bg2nl', 'd2|bg2nl'], 'less than one block: keep');
  // buildSession: due reviews of both kinds, blocks of 4, full; 19 sentences because a session holds one card per sentence (D-024)
  const S = 'abcdefghijklmnopqrs'.split('').map((id, i) => ({ id, bg: 'б' + id, nl: 'n' + id, max_rank: i + 1, lemmas: ['дума' + i] }));
  const prog = {}; S.forEach(({ id }, i) => { prog[id + '|bg2nl'] = { box: 2, due: i < 12 ? 1e12 - 1e6 * (i + 1) : 2e12 }; if (i >= 12) prog[id + '|nl2bg'] = { box: 2, due: 1e12 - 1e6 * (i + 1) }; });
  const q = C.buildSession(S, prog, { rank: 100, newPerSession: 0, directions: 'both', dirRun: 4 }, 1e12, () => 0.5).queue;
  assert.equal(q.length, 16, '12 Latin + 7 Cyrillic reviews → 12 + 4: ' + q.length);
  assert.equal(pattern(q), 'CCCCLLLLLLLLLLLL', 'the Cyrillic reviews are the most overdue, so their block leads');
  assert.equal(C.buildSession(S, prog, { rank: 100, newPerSession: 0, directions: 'both' }, 1e12, () => 0.5).queue.length, 19, 'without blocks all 19 reviews');
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
  const s = C.buildSession(S, {}, { rank: 300, tolerance: 300, sessionSize: 10, newPerSession: 10, directions: 'bg2nl' }, 1e12, rand);
  assert.equal(s.queue.length, 10);
  const ranks = s.queue.map(k => +k.split('|')[0].slice(1) * 10);
  assert.ok(Math.max(...ranks) - Math.min(...ranks) >= 295, 'spread covers at least half the range: ' + ranks.join(','));
  const lowHalf = ranks.filter(r => r <= 300).length;
  assert.ok(lowHalf >= 5, 'lower ranks preferred: ' + ranks.join(','));
  // strict mode: exactly the ten lowest
  const st = C.buildSession(S, {}, { rank: 300, tolerance: 300, sessionSize: 10, newPerSession: 10, directions: 'bg2nl', newOrder: 'strict' }, 1e12, rand);
  assert.deepEqual(st.queue.map(k => +k.split('|')[0].slice(1) * 10).sort((a, b) => a - b), [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  // due cards are mixed in, not all first: with 6 due and 10 new, the 5th card is not due
  const prog = {}; for (let i = 50; i <= 55; i++) prog['s' + i + '|bg2nl'] = { box: 2, due: 1e12 - i };
  const m = C.buildSession(S, prog, { rank: 300, tolerance: 300, sessionSize: 16, newPerSession: 10, directions: 'bg2nl', newOrder: 'strict' }, 1e12, rand);
  assert.equal(m.queue.length, 16); assert.equal(m.nDue, 6);
  const dueIdx = m.queue.map((k, i) => prog[k] ? i : -1).filter(i => i >= 0);
  assert.ok(dueIdx[dueIdx.length - 1] < 15, 'due cards are spread through the session: ' + dueIdx.join(','));
  assert.ok(dueIdx.some((v, i) => i > 0 && v - dueIdx[i - 1] > 1), 'new cards sit between due cards');
});
t('D-003 unlocked production cards come first', () => {
  const S = []; for (let i = 1; i <= 40; i++) S.push({ id: 's' + i, max_rank: i * 10, lemmas: ['w' + i] });
  let seed = 3; const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const prog = { 's30|bg2nl': { box: 1, due: 2e12 }, 's31|bg2nl': { box: 1, due: 2e12 }, 's32|bg2nl': { box: 1, due: 2e12 } };
  const s = C.buildSession(S, prog, { rank: 400, sessionSize: 6, newPerSession: 6, directions: 'gated' }, 1e12, rand);
  const nl2bg = s.queue.filter(k => k.endsWith('|nl2bg'));
  assert.deepEqual(nl2bg.sort(), ['s30|nl2bg', 's31|nl2bg', 's32|nl2bg']);
  assert.equal(s.queue.length, 6);
  // at most half the slots: 5 unlocked, 4 new slots -> 2 production cards
  const prog5 = {}; for (let i = 20; i <= 24; i++) prog5['s' + i + '|bg2nl'] = { box: 1, due: 2e12 };
  const s2 = C.buildSession(S, prog5, { rank: 400, sessionSize: 4, newPerSession: 4, directions: 'gated', newOrder: 'strict' }, 1e12, rand);
  assert.deepEqual(s2.queue.filter(k => k.endsWith('|nl2bg')).sort(), ['s20|nl2bg', 's21|nl2bg']);
});
t('D-024 short sessions of different sentences', () => {
  const S = []; for (let i = 1; i <= 40; i++) S.push({ id: 's' + i, max_rank: i, lemmas: ['w' + i] });
  const now = 1e12, H = 3600e3, D = 86400e3, ids = q => q.map(k => C.parseKey(k).id), base = { rank: 100, directions: 'gated', newOrder: 'strict' };
  // 30 sentences with both cards due: the session is capped at 20 and holds one card per sentence
  const prog = {}; for (let i = 1; i <= 30; i++) for (const d of ['bg2nl', 'nl2bg']) prog['s' + i + '|' + d] = { s: 5, d: 5, state: 'review', box: 3, due: now - D, last: now - 6 * D, reps: 4 };
  let q = C.buildSession(S, prog, base, now, () => 0.5).queue;
  assert.equal(q.length, 20, 'default session size'); assert.equal(new Set(ids(q)).size, 20, 'every card a different sentence');
  assert.equal(q.filter(k => !prog[k]).length, C.NEW_RESERVE, 'reviews first: more due than fit, so only the reserve of new cards');
  assert.equal(C.buildSession(S, prog, Object.assign({ sessionSize: 15 }, base), now, () => 0.5).queue.length, 15);
  // the due reviews all fit: new cards fill the free places, at most newPerSession
  const few = {}; for (let i = 1; i <= 5; i++) few['s' + i + '|bg2nl'] = prog['s' + i + '|bg2nl'];
  q = C.buildSession(S, few, base, now, () => 0.5).queue; assert.equal(q.length, 15, '5 reviews + 10 new'); assert.equal(q.filter(k => !few[k]).length, 10);
  assert.equal(C.buildSession(S, few, Object.assign({ newPerSession: 20 }, base), now, () => 0.5).queue.length, 20, '5 reviews + 15 new fill the session');
  // nothing due: newPerSession new cards
  q = C.buildSession(S, {}, base, now, () => 0.5).queue; assert.equal(q.length, 10); assert.ok(q.every(k => k.endsWith('|bg2nl')));
  // back to back: answer the first session, build the next 10 minutes later; no sentence comes back except a card missed twice
  const after = {}, t1 = now + 10 * 60e3;
  q.forEach((k, i) => { let p = C.applyResult(null, i ? 'correct' : 'wrong', now, false, () => 0.5, null, base); if (!i) p = C.applyResult(p, 'wrong', now + 60e3, false, () => 0.5, null, base); after[k] = p; });
  const q2 = C.buildSession(S, after, base, t1 + 60e3, () => 0.5).queue, again = new Set(ids(q2).filter(id => ids(q).includes(id)));
  assert.deepEqual([...again], [C.parseKey(q[0]).id], 'only the twice-missed sentence returns: ' + q2.join(','));
  assert.ok(!q2.some(k => k.endsWith('|nl2bg')), 'no reverse card for a sentence answered minutes ago');
  // four hours later the reverse cards unlock
  assert.ok(C.buildSession(S, after, base, now + 4 * H + 1, () => 0.5).queue.some(k => k.endsWith('|nl2bg')), 'reverse cards after the rest');
  // a due card waits while its other direction was answered in the last 4 hours; its own due time is the scheduler's business
  const sib = { 's1|bg2nl': { s: 5, d: 5, state: 'review', box: 3, due: now + D, last: now - H, reps: 3 }, 's1|nl2bg': { s: 5, d: 5, state: 'review', box: 3, due: now - 1, last: now - 6 * D, reps: 3 } };
  assert.ok(!C.buildSession(S, sib, base, now, () => 0.5).queue.includes('s1|nl2bg'), 'sibling rests');
  assert.ok(C.buildSession(S, sib, base, now + 3 * H + 1, () => 0.5).queue.includes('s1|nl2bg'), 'sibling after 4 h');
  // the Free practice button (sessionSize 0): one card per sentence, rested sentences first, freeSize cards
  const fp = C.buildSession(S, Object.assign({}, prog, { 's31|bg2nl': { s: 5, d: 5, state: 'review', box: 3, due: now + D, last: now - 60e3, reps: 3 } }), Object.assign({}, base, { sessionSize: 0, freeSize: 12 }), now, () => 0.5);
  assert.equal(fp.free, true); assert.equal(fp.queue.length, 12); assert.equal(new Set(ids(fp.queue)).size, 12); assert.ok(!fp.queue.includes('s31|bg2nl'), 'the sentence just answered comes last');
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
t('D-011 English normalisation and languages', () => {
  assert.equal(C.normalise("I'm not here, don't wait.", 'en'), 'i am not here do not wait');
  assert.equal(C.normalise('I am not here, do not wait', 'en'), 'i am not here do not wait');
  assert.equal(C.check("It's my favourite colour.", ['It is my favorite color.'], 'en').result, 'correct');
  assert.equal(C.check("I can't come", ["I cannot come."], 'en').result, 'correct');
  assert.equal(C.check('I’m fine', ["I'm fine."], 'en').result, 'correct');
  assert.equal(C.check('He is at the centre', ['He is at the center.'], 'en').result, 'correct');
  assert.equal(C.normalise("Ik ben er niet", 'nl'), 'ik ben er niet');
  assert.equal(C.langFor('A001', { lang: 'en' }), 'en'); assert.equal(C.langFor('A001', { lang: 'nl' }), 'nl'); assert.equal(C.langFor('A001', {}), 'nl');
  const ids = ['A001', 'A002', 'B017', 'C100', 'D050', 'E099', 'F010', 'G020', 'H030', 'J040'];
  const mixed = ids.map(i => C.langFor(i, { lang: 'mixed' }));
  assert.ok(mixed.includes('en') && mixed.includes('nl'), 'mixed splits: ' + mixed.join(','));
  assert.deepEqual(ids.map(i => C.langFor(i, { lang: 'mixed' })), mixed, 'stable');
  assert.deepEqual(C.parseKey('B017|en2bg'), { id: 'B017', dir: 'en2bg', lang: 'en', toBg: true, listen: false });
  assert.deepEqual(C.parseKey('B017|bg2nl'), { id: 'B017', dir: 'bg2nl', lang: 'nl', toBg: false, listen: false });
  const s = { id: 'x', bg: 'Да.', bg_alt: ['Да, да.'], nl: 'Ja.', nl_alt: ['Jawel.'], en: 'Yes.', en_alt: ['Yeah.'] };
  assert.deepEqual(C.acceptedFor(s, 'bg2en'), ['Yes.', 'Yeah.']); assert.deepEqual(C.acceptedFor(s, 'en2bg'), ['Да.', 'Да, да.']); assert.deepEqual(C.acceptedFor(s, 'bg2nl'), ['Ja.', 'Jawel.']);
  // D-018: the other "you" form only for the English prompt ("Do you have…" leaves ти/вие open, "Hebben jullie…" does not)
  const y = { id: 'y', bg: 'Имате ли момче или момиче?', bg_alt: [], bg_alt_en: ['Имаш ли момче или момиче?'], nl: 'Hebben jullie een jongen of een meisje?', nl_alt: [], en: 'Do you have a boy or a girl?', en_alt: [] };
  assert.equal(C.check('Имаш ли момче или момиче?', C.acceptedFor(y, 'en2bg'), 'bg').result, 'correct');
  assert.deepEqual(C.acceptedFor(y, 'nl2bg'), ['Имате ли момче или момиче?']);
  assert.ok(C.vocabulary([y]).bg.has('имаш'), 'English-only answers feed the word-form vocabulary');
  const S = [{ id: 'a', max_rank: 10 }, { id: 'b', max_rank: 20 }];
  assert.deepEqual(C.cardKeys(S[0], {}, { lang: 'en', directions: 'gated' }), ['a|bg2en']);
  assert.deepEqual(C.cardKeys(S[0], { 'a|bg2en': { box: 1 } }, { lang: 'en', directions: 'gated' }), ['a|bg2en', 'a|en2bg']);
  assert.deepEqual(C.cardKeys(S[0], { 'a|bg2nl': { box: 1 } }, { lang: 'en', directions: 'gated' }), ['a|bg2en'], 'Dutch progress does not unlock the English card');
  const q = C.buildSession(S, { 'b|bg2en': { box: 1, due: 2e12 } }, { lang: 'en', rank: 100, newPerSession: 2, directions: 'gated', newOrder: 'strict' }, 1e12, () => 0.5).queue;
  assert.ok(q.includes('b|en2bg') && q.includes('a|bg2en'), q.join(','));
  const idx = C.wordIndex([{ rank: 1, bg: 'да', en: 'yes', forms: '' }]);
  assert.deepEqual(C.rowToSentence({ bg: 'Да.', nl: 'Ja.', en: 'Yes.', en_alt: 'Yeah. | Yep.' }, idx).en_alt, ['Yeah.', 'Yep.']);
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
  // new card: the first two typos count as Good (free passes), the third as Hard; the card stays young
  // for its first three answers although one Good graduates it (D-024)
  let p = C.applyResult(null, 'almost', now, false, r, 'typo', S); assert.equal(p.state, 'review'); assert.equal(p.almosts, 1); assert.equal(p.rating, 3);
  assert.equal(C.maturity(p), 'young', 'one answer: still young');
  p = C.applyResult(p, 'almost', p.due, false, r, 'typo', S); assert.equal(p.almosts, 2); assert.equal(p.rating, 3);
  p = C.applyResult(p, 'almost', p.due, false, r, 'typo', S); assert.equal(p.almosts, 2); assert.equal(p.lapses, 0); assert.equal(p.rating, 2);
  // mature card (legacy box 7 -> stability 16 d): an almost lapses it
  p = C.applyResult({ box: 7, due: now + 5e8, last: now - 16 * 86400e3 }, 'almost', now, false, r, 'typo', S);
  assert.equal(p.state, 'relearning'); assert.equal(p.due, now + 10 * 60e3); assert.equal(p.lapses, 1); assert.equal(p.rating, 1);
  // free practice never consumes passes and never advances
  p = C.applyResult({ box: 1, due: now + 5e8, last: now - 1 }, 'almost', now, true, r, 'typo', S); assert.equal(p.due, now + 5e8); assert.equal(p.almosts, undefined);
  // lenient keeps the card in review as Hard; strict demotes
  p = C.applyResult({ box: 7, due: now + 5e8, last: now - 16 * 86400e3 }, 'almost', now, false, r, 'typo', { almostPolicy: 'lenient' }); assert.equal(p.state, 'review'); assert.equal(p.lapses, 0); assert.equal(p.rating, 2);
  p = C.applyResult({ box: 3, due: now, last: now - 3600e3 }, 'almost', now, false, r, 'typo', { almostPolicy: 'strict' }); assert.equal(p.lapses, 1); assert.equal(p.rating, 1);
  // no settings at all -> staged defaults
  p = C.applyResult(null, 'almost', now, false, r, 'typo'); assert.equal(p.rating, 3); assert.equal(p.almosts, 1);
});
t('D-014 loose tier', () => {
  const acc = ["My father fixed the car's trunk.", "My father repaired the car's trunk."], loose = ["My father has fixed the car's trunk.", "My father has repaired the car's trunk."];
  let r = C.check("My father fixed the car's trunk", acc, 'en', {}, loose);
  assert.equal(r.result, 'correct'); assert.ok(!r.loose);
  r = C.check("My father has repaired the car's trunk", acc, 'en', {}, loose);
  assert.equal(r.result, 'correct'); assert.equal(r.loose, true); assert.equal(r.closer, acc[1]);   // closest exact answer, not the primary
  r = C.check("My father has repaird the car's trunk", acc, 'en', {}, loose);
  assert.equal(r.result, 'almost'); assert.equal(r.loose, true);
  assert.equal(C.check("My father took the car's trunk", acc, 'en', {}, loose).result, 'wrong');
  const s = { id: 'J013', bg: 'Баща ми поправи багажника на колата.', nl: 'Mijn vader heeft de kofferbak gerepareerd.', en: acc[0], en_alt: [acc[1]], en_loose: loose, nl_alt: [], bg_alt: [] };
  assert.deepEqual(C.looseFor(s, 'bg2en'), loose); assert.deepEqual(C.looseFor(s, 'en2bg'), []); assert.deepEqual(C.looseFor(s, 'bg2nl'), []);
  const imp = C.rowToSentence({ bg: 'Чай.', nl: 'Thee.', en_loose: 'Some tea. | A tea.' }, C.wordIndex([]));
  assert.deepEqual(imp.en_loose, ['Some tea.', 'A tea.']); assert.deepEqual(imp.nl_loose, []);
});
t('D-014 wrong word form is not a typo', () => {
  const sents = [{ id: 'x', bg: 'Работиш ли в неделя? Купих книгата и книга.', nl: 'Werk je op zondag?', nl_alt: ['Werk je zondags?'], en: 'Do you work on Sunday?', en_alt: ['He works on Sundays in a shop.'], en_loose: ['A loose answer.'], bg_alt: [] }];
  const V = C.vocabulary(sents, [{ rank: 1, bg: 'работя', en: 'work', pos: 'verb', forms: 'работя (работиш, работи)' }], { bg: ['работим'] });
  assert.ok(V.en.has('sundays') && V.en.has('loose') && V.nl.has('zondags') && V.bg.has('работи') && V.bg.has('работим'));
  const en = { vocab: V.en }, acc = ['Do you work on Sunday?'];
  let r = C.check('Do you work on Sundays?', acc, 'en', en);
  assert.equal(r.result, 'wrong'); assert.equal(r.reason, 'form'); assert.deepEqual(r.slips, [['sundays', 'sunday']]);
  assert.equal(C.check('Do you work on Sundya?', acc, 'en', en).result, 'almost');            // not a real word: a typo
  assert.equal(C.check('Do you wrok on Sunday?', acc, 'en', en).result, 'almost');
  assert.equal(C.check('Doyou work on Sunday?', acc, 'en', en).result, 'almost');             // missing space
  assert.deepEqual(C.check('Do you work in Sunday?', acc, 'en', en).slips, [['in', 'on']]);  // two short words swapped
  assert.deepEqual(C.check('Do you work on a Sunday?', acc, 'en', en).slips, [['a', '']]);   // extra word, even though "asunday" is one letter off
  assert.deepEqual(C.check('Dinner is on the tables.', ['Dinner is on the table.'], 'en', en).slips, [['tables', 'table']]);   // "tables" is in no sentence: the ending decides
  assert.equal(C.check('Dinner is on the tabel.', ['Dinner is on the table.'], 'en', en).result, 'almost');
  assert.equal(C.check('I work every day.', ['I worked every day.'], 'en', en).reason, 'form');     // -ed left out
  assert.equal(C.check('I worke every day.', ['I worked every day.'], 'en', en).result, 'almost');  // one letter dropped: a typo
  assert.deepEqual(C.check('Чашата е на масата.', ['Чашата е на маса.'], 'bg', { vocab: new Set() }).slips, [['масата', 'маса']]);
  assert.equal(C.check('Do you work on Sundays?', acc, 'en', { vocab: V.en, strictForms: false }).result, 'almost');
  assert.equal(C.check('Do you work on Sundays?', acc, 'en').result, 'almost');               // no vocabulary: old behaviour
  const bg = { vocab: V.bg }, bacc = ['Работиш ли в неделя?'];
  assert.deepEqual(C.check('Работи ли в неделя', bacc, 'bg', bg).slips, [['работи', 'работиш']]);
  assert.deepEqual(C.check('Работиш ли неделя', bacc, 'bg', bg).slips, [['', 'в']]);
  assert.equal(C.check('Работиш ли в недля', bacc, 'bg', bg).result, 'almost');
  assert.equal(C.check('Купих книгат', ['Купих книгата.'], 'bg', bg).result, 'almost');
  assert.equal(C.check('В неделя ли работиш', bacc, 'bg', bg).result, 'almost');            // word order still "almost"
  // Dutch stressed / unstressed pronouns are equal, so they never count as a form slip
  assert.equal(C.normalise("Werk jij op zondag? Is dit m'n fiets of jouw fiets?", 'nl'), 'werk je op zondag is dit mijn fiets of je fiets');
  assert.equal(C.check('Werk jij op zondag?', ['Werk je op zondag?'], 'nl', { vocab: V.nl }).result, 'correct');
});
t('mergeSnapshots: newer card wins, histories are combined, the gist wins a settings tie (D-025)', () => {
  const rec = (last, reps) => ({ box: 1, due: last + 1, reps, lapses: 0, streak: 1, last, s: 1, d: 5, state: 'review' });
  const big = { app: 'trakia', version: 1, settings: { rank: 400, stage: 3, theme: 'dark', translit: true }, progress: { 'A|bg2nl': rec(100, 5), 'B|bg2nl': rec(200, 3) },
    userAlts: { 'A|bg2nl': ['x'] }, userSentences: { U1: { id: 'U1' } }, deleted: ['D1'], log: [[100, 'A|bg2nl', 2], [200, 'B|bg2nl', 1]], sessions: [90, 190], drills: { 'd1': { ok: 3, bad: 0, last: 150 } }, drillLog: [[150, 'd1', 2]] };
  const small = { app: 'trakia', version: 1, settings: { rank: 102, stage: 1, theme: 'light' }, progress: { 'A|bg2nl': rec(300, 1), 'C|nl2bg': rec(50, 1) },
    userAlts: { 'A|bg2nl': ['y', 'x'] }, deleted: ['D2'], log: [[300, 'A|bg2nl', 2], [100, 'A|bg2nl', 2]], sessions: [290], drills: { 'd1': { ok: 1, bad: 1, last: 100 } }, drillLog: [] };
  const m = C.mergeSnapshots(small, big);    // the small device connects second: the gist holds the big device's state
  assert.deepEqual(Object.keys(m.progress), ['A|bg2nl', 'B|bg2nl', 'C|nl2bg']);
  assert.equal(m.progress['A|bg2nl'].last, 300, 'the most recent answer wins');
  assert.deepEqual(m.log.map(e => e[0]), [100, 200, 300], 'logs combined without the duplicate');
  assert.deepEqual(m.sessions, [90, 190, 290]);
  assert.equal(m.drills.d1.ok, 3); assert.equal(m.drillLog.length, 1);
  assert.deepEqual(m.userAlts['A|bg2nl'], ['x', 'y']);
  assert.ok(m.userSentences.U1);
  assert.deepEqual(m.deleted, ['D1', 'D2'], 'no deletion stamps on either side: union');
  assert.deepEqual(m.settings, { rank: 400, stage: 3 }, 'tie goes to the gist; device settings are left out');
  // a later settings change on this device wins over the gist
  const m2 = C.mergeSnapshots(Object.assign({}, small, { stamps: { settings: 500 } }), big);
  assert.equal(m2.settings.rank, 102);
  // merging is idempotent and the order of the sides only matters for ties
  assert.equal(JSON.stringify(C.mergeSnapshots(m, m)), JSON.stringify(m));
  assert.equal(JSON.stringify(C.mergeSnapshots(small, m)), JSON.stringify(m), 'merging in something already contained changes nothing');
  assert.deepEqual(Object.keys(C.mergeSnapshots(big, small).progress), Object.keys(m.progress));
  // old records without FSRS fields are migrated
  const old = C.mergeSnapshots({}, { progress: { 'Z|bg2nl': { box: 3, due: 9, reps: 2, lapses: 0, streak: 2, last: 8 } } });
  assert.ok(old.progress['Z|bg2nl'].s > 0);
});
t('mergeSnapshots: resets travel with the sync (D-025)', () => {
  const rec = last => ({ box: 1, due: last + 1, reps: 1, lapses: 0, streak: 1, last, s: 1, d: 5, state: 'review' });
  const gist = { progress: { 'A|bg2nl': rec(100), 'B|bg2nl': rec(100) }, log: [[100, 'A|bg2nl', 2]], sessions: [90], userAlts: { 'A|bg2nl': ['x'] }, drills: { d: { ok: 1, bad: 0, last: 100 } } };
  const wipedHere = { progress: { 'C|bg2nl': rec(300) }, log: [[300, 'C|bg2nl', 2]], sessions: [290], userAlts: { 'C|bg2nl': ['z'] }, stamps: { wiped: 200 } };
  const m = C.mergeSnapshots(wipedHere, gist);
  assert.deepEqual(Object.keys(m.progress), ['C|bg2nl'], 'only answers after the reset survive');
  assert.deepEqual(m.log.map(e => e[0]), [300]); assert.deepEqual(m.sessions, [290]); assert.deepEqual(m.drills, {});
  assert.deepEqual(m.userAlts, { 'C|bg2nl': ['z'] }, 'accepted answers from before the reset are gone');
  assert.equal(m.stamps.wiped, 200);
  // one card reset in the Library
  const m2 = C.mergeSnapshots({ cleared: { 'A|bg2nl': 150 } }, gist);
  assert.deepEqual(Object.keys(m2.progress), ['B|bg2nl']);
  const m3 = C.mergeSnapshots(m2, { progress: { 'A|bg2nl': rec(160) } });
  assert.ok(m3.progress['A|bg2nl'], 'answering again after the reset counts');
  // restoring deleted sentences: the newer list wins
  assert.deepEqual(C.mergeSnapshots({ deleted: [], stamps: { deleted: 50 } }, { deleted: ['D1'], stamps: { deleted: 10 } }).deleted, []);
});
t('storyTokens splits words like the story validator, keeping the text (D-026, D-027)', () => {
  const toks = C.storyTokens('„Здравей, Ана!“ По-голям е.');
  assert.equal(toks.map(x => x.t).join(''), '„Здравей, Ана!“ По-голям е.');
  assert.deepEqual(toks.filter(x => x.w).map(x => x.t), ['Здравей', 'Ана', 'По', 'голям', 'е']);
  assert.equal(C.storyKey('Ѝ'), 'ѝ', 'ѝ (her) is looked up apart from и (and)'); assert.equal(C.storyKey('Детето'), 'детето');
});
t('storyEligible: level within the Anki position plus tolerance, grammar within the stage (D-026)', () => {
  const st = { level: 200, grammar: ['present'] };
  assert.equal(C.storyEligible(st, { rank: 102, stage: 1 }), false);
  assert.equal(C.storyEligible(st, { rank: 200, stage: 1 }), true);
  assert.equal(C.storyEligible(st, { rank: 150, tolerance: 50, stage: 1 }), true);
  assert.equal(C.storyEligible({ level: 100, grammar: ['aorist'] }, { rank: 500, stage: 1 }), false);
});
t('mergeSnapshots: read marks and quiz scores, newest per story (D-025, D-026)', () => {
  const m = C.mergeSnapshots({ reading: { A: { read: 100 }, B: { read: 50, quiz: { at: 300, score: 2, total: 4 } } } },
    { reading: { A: { read: 90, quiz: { at: 200, score: 3, total: 3 } }, B: { read: 50, quiz: { at: 250, score: 4, total: 4 } } } });
  assert.equal(m.reading.A.quiz.score, 3, 'the record touched last wins');
  assert.equal(m.reading.B.quiz.score, 2);
  assert.deepEqual(C.mergeSnapshots({ reading: { A: { read: 100 } }, stamps: { wiped: 150 } }, {}).reading, {}, 'a reset clears read marks');
});
t('every word of every bundled story can be looked up (D-027)', () => {
  const fs = require('fs'), path = require('path'), file = path.join(__dirname, '..', 'data', 'stories.json');
  if (!fs.existsSync(file)) return;
  const FREE = new Set(['ли', 'не', 'да', 'ще', 'съм', 'си', 'е', 'сме', 'сте', 'са', 'се', 'бях', 'беше', 'бяхме', 'бяха', 'по', 'най', 'и', 'ѝ']);
  for (const st of JSON.parse(fs.readFileSync(file, 'utf8'))) {
    const names = new Set((st.names || []).map(C.storyKey));
    for (const text of [st.title.bg, ...st.paragraphs.map(p => p.bg)]) for (const tok of C.storyTokens(text)) if (tok.w) {
      const k = C.storyKey(tok.t); assert.ok(st.words[k] || names.has(k) || FREE.has(k), `${st.id}: "${tok.t}" has no lookup`);
    }
  }
});
t('compactHistory: days before the last 30 become totals, whole and only once (D-029)', () => {
  const D = 86400e3, now = new Date(2026, 9, 26, 12).getTime(), old = now - 40 * D, older = now - 41 * D, recent = now - 2 * D;
  const st = { log: [[older, 'A|bg2nl', 2], [old, 'A|bg2nl', 0], [old + 60e3, 'B|bg2nl', 2], [old + 120e3, 'C|bg2nl', 1], [recent, 'A|bg2nl', 2]],
    drillLog: [[old, 'x', 2], [old, 'y', 0], [recent, 'x', 1]], sessions: [old, older, recent] };
  const c = C.compactHistory(st, now);
  assert.deepEqual(c.log.map(e => e[0]), [recent]); assert.deepEqual(c.drillLog.map(e => e[0]), [recent]); assert.deepEqual(c.sessions, [recent]);
  assert.deepEqual(c.days[C.dayKey(old)], { a: [1, 1, 1], d: [1, 0, 1], s: 1 });
  assert.deepEqual(c.days[C.dayKey(older)], { a: [0, 0, 1], s: 1 });
  assert.deepEqual(Object.keys(c.days), [C.dayKey(older), C.dayKey(old)], 'days sorted');
  const again = C.compactHistory(c, now);
  assert.equal(JSON.stringify(again), JSON.stringify(c), 'compacting twice changes nothing');
  // one device compacted, the other still holds the same answers in full: the day is not counted twice
  const both = C.mergeSnapshots({ log: c.log, drillLog: c.drillLog, sessions: c.sessions, days: c.days }, st);
  assert.deepEqual(C.compactHistory(both, now).days, c.days);
  // a reset drops the totals of earlier days
  const wiped = C.mergeSnapshots({ stamps: { wiped: now - 35 * D } }, { days: c.days });
  assert.deepEqual(wiped.days, {});
});
t('practice sentences mark their forms of address, and only those (D-027)', () => {
  const byId = new Map(require('../data/sentences.json').map(s => [s.id, s]));
  assert.deepEqual(byId.get('A004').vocative, ['госпожо']); assert.deepEqual(byId.get('B009').vocative, ['господине']);
  assert.equal(byId.get('A164').vocative, undefined, 'Госпожа Иванова живее … names her, does not address her');
  const all = [...byId.values()].flatMap(s => s.vocative || []);
  assert.ok(!all.some(v => /ме$/.test(v)), 'no verb forms such as имаме'); assert.ok(all.length >= 20);
});
t('every word of every practice sentence can be looked up (D-030)', () => {
  const sents = require('../data/sentences.json');
  const FREE = new Set(['ли', 'не', 'да', 'ще', 'съм', 'си', 'е', 'сме', 'сте', 'са', 'се', 'бях', 'беше', 'бяхме', 'бяха', 'по', 'най', 'и', 'ѝ']);
  let n = 0;
  for (const s of sents) {
    assert.ok(s.words, s.id + ' has a words map');
    for (const tok of C.storyTokens(s.bg)) if (tok.w) { const k = C.storyKey(tok.t); assert.ok(s.words[k] || FREE.has(k), `${s.id}: "${tok.t}" has no lookup`); n++; }
  }
  assert.ok(n > 15000);
});
t('peekItems: the next words after the position, each in a sentence, with four meanings (D-031)', () => {
  const W = require('../data/words.json'), S = require('../data/sentences.json');
  let seed = 1; const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const items = C.peekItems(W, S, { rank: 102, stage: 1 }, { 103: { at: 1, ok: true } }, 10, rand);
  assert.equal(items.length, 10);
  assert.ok(items.every(it => it.word.rank > 102 && it.word.rank <= 162), 'words just after the position');
  assert.ok(!items.some(it => it.word.rank === 103), 'a peeked word is skipped');
  for (const it of items) {
    assert.ok(it.forms.length && it.forms.every(f => it.sentence.words[f]), it.word.bg + ': marked forms come from the sentence');
    assert.equal(it.options.length, 4); assert.equal(it.options[it.answer], it.word);
    assert.equal(new Set(it.options.map(o => o.en)).size, 4, 'four different meanings');
  }
  assert.ok(items.filter(it => it.others.length === 0).length >= 7, 'mostly sentences where only the new word is unknown');
  assert.ok(items.every(it => C.grammarOk(it.sentence, { stage: 1 })), 'sentences within grammar stage 1');
  // all of the next 60 peeked: the run starts over with the next words
  const all = {}; for (let r = 103; r <= 162; r++) all[r] = { at: 1, ok: false };
  assert.equal(C.peekItems(W, S, { rank: 102, stage: 1 }, all, 3, rand)[0].word.rank, 103);
  // merged like the rest of the snapshot: the newer guess per word
  assert.equal(C.mergeSnapshots({ peeks: { 103: { at: 5, ok: true } } }, { peeks: { 103: { at: 3, ok: false } } }).peeks['103'].ok, true);
});
t('peekItems: a plural noun asks with plural meanings, a noun with the article with "the …" (D-037)', () => {
  const P = require('../data/plurals.json');
  const W = require('../data/words.json').map(/** @param {any} w */ w => P[w.rank] ? { ...w, pl: P[w.rank] } : w);
  const find = /** @param {string} bg */ bg => W.find(/** @param {any} w */ w => w.bg === bg);
  let seed = 7; const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  /** @param {string} lemma @param {string} bg @param {Record<string, string>} words */
  const ask = (lemma, bg, words) => C.peekItems(W, [{ id: 'x', bg, nl: '', en: '', nl_alt: [], bg_alt: [], en_alt: [], lemmas: Object.values(words), max_rank: find(lemma).rank,
    tags: [], source: '', words }], { rank: find(lemma).rank - 1, stage: 1 }, {}, 1, rand)[0];
  const pl = ask('чиния', 'Има чинии.', { чинии: 'чиния' });
  assert.equal(pl.shown, 'чинии'); assert.ok(pl.plural && !pl.article); assert.equal(pl.labels[pl.answer], 'plates');
  assert.ok(pl.options.every(o => o.pl) && pl.labels.every((l, j) => l === /** @type {[string, string]} */ (pl.options[j].pl)[1]), 'every option in its plural');
  const def = ask('чиния', 'Чиниите са мръсни.', { чиниите: 'чиния' });
  assert.ok(def.plural && def.article); assert.equal(def.labels[def.answer], 'the plates');
  assert.ok(def.labels.every(l => l.startsWith('the ')) && def.options.every(o => o.pos === 'noun'));
  const sg = ask('чиния', 'Чинията е мръсна.', { чинията: 'чиния' });
  assert.ok(!sg.plural && sg.article); assert.equal(sg.labels[sg.answer], 'the plate'); assert.deepEqual(sg.labels, sg.options.map(o => 'the ' + o.en));
  assert.equal(ask('чай', 'Чаят е горещ.', { чаят: 'чай' }).article, true, 'чай → чаят');
  const bare = ask('чиния', 'Една чиния.', { една: 'един', чиния: 'чиния' });
  assert.ok(!bare.plural && !bare.article); assert.deepEqual(bare.labels, bare.options.map(o => o.en));
  // after a number the short form is the counting form: два стола, two chairs, not "the chair"
  const two = ask('стол', 'Има два стола.', { има: 'имам', два: 'две', стола: 'стол' });
  assert.ok(two.plural && !two.article); assert.equal(two.labels[two.answer], 'chairs');
  assert.ok(ask('стол', 'Столът е тук.', { столът: 'стол' }).article);
});
t('D-005 dictation takes over from a mature reading card', () => {
  const s = { id: 'd', bg: 'Обичам кафе.', bg_alt: ['Аз обичам кафе.'], nl: 'Ik hou van koffie.', nl_alt: [], en: 'I like coffee.', en_alt: [], au: 'abc123def456', max_rank: 10, lemmas: [] };
  const set = { lang: 'nl', directions: 'gated' }, mature = { state: 'review', s: 30, box: 6, due: 0, lapses: 0 }, young = { state: 'review', s: 5, box: 3, due: 0 };
  assert.deepEqual(C.parseKey('d|listen'), { id: 'd', dir: 'listen', lang: 'bg', toBg: true, listen: true });
  assert.deepEqual(C.acceptedFor(s, 'listen'), ['Обичам кафе.'], 'only what was heard, not the other translations');
  assert.deepEqual(C.cardKeys(s, { 'd|bg2nl': mature }, set), ['d|bg2nl', 'd|nl2bg'], 'no dictation before the production card was right once');
  assert.deepEqual(C.cardKeys(s, { 'd|bg2nl': young, 'd|nl2bg': { box: 1 } }, set), ['d|bg2nl', 'd|nl2bg'], 'a young reading card stays');
  const ready = { 'd|bg2nl': mature, 'd|nl2bg': { box: 1 } };
  assert.deepEqual(C.cardKeys(s, ready, set), ['d|bg2nl', 'd|nl2bg', 'd|listen'], 'mature: dictation unlocks, the reading card runs on until its first answer');
  assert.deepEqual(C.cardKeys(s, Object.assign({}, ready, { 'd|listen': { lapses: 0, due: 0 } }), set), ['d|nl2bg', 'd|listen'], 'answered once: dictation takes the reading card\'s place');
  assert.deepEqual(C.cardKeys(s, ready, Object.assign({}, set, { directions: 'bg2nl' })), ['d|bg2nl'], 'out of Bulgarian only: no dictation, it is typed in Bulgarian');
  assert.deepEqual(C.cardKeys(s, ready, Object.assign({}, set, { sound: false })), ['d|bg2nl', 'd|nl2bg'], 'sound off: the reading card is back');
  assert.deepEqual(C.cardKeys(s, ready, Object.assign({}, set, { dictation: false })), ['d|bg2nl', 'd|nl2bg'], 'dictation can be switched off');
  assert.deepEqual(C.cardKeys(Object.assign({}, s, { au: undefined }), ready, set), ['d|bg2nl', 'd|nl2bg'], 'no clip, no dictation (an imported sentence)');
  const started = Object.assign({}, ready, { 'd|bg2nl': young, 'd|listen': { lapses: 1, due: 0 } });
  assert.deepEqual(C.cardKeys(s, started, set), ['d|nl2bg', 'd|listen'], 'once started, dictation stays even if the reading card was reset');
  assert.deepEqual(C.cardKeys(s, Object.assign({}, started, { 'd|listen': { lapses: 2, due: 0 } }), set), ['d|bg2nl', 'd|nl2bg', 'd|listen'], 'two lapses bring the reading card back');
  // dictation cards are typed on the Bulgarian keyboard, so they join the X -> BG blocks (D-021)
  assert.equal(C.parseKey('d|listen').toBg, true);
  const q = C.buildSession([s], { 'd|nl2bg': { box: 1, due: 0, last: 1, state: 'review', s: 3 }, 'd|bg2nl': Object.assign({}, mature, { last: 1 }), 'd|listen': { due: 0, last: 1, state: 'review', s: 3, box: 1 } }, set, 10 * 86400e3).queue;
  assert.ok(q.length === 1 && /\|(listen|nl2bg)$/.test(q[0]), 'one card for the sentence, never the retired reading card: ' + q);
});
t('D-034 sentences for hands-free listening', () => {
  const mk = (id, rank) => ({ id, bg: 'Б ' + id, nl: 'N ' + id, au: 'k' + id, max_rank: rank, lemmas: [], bg_alt: [], nl_alt: [] });
  const S = [mk('a', 5), mk('b', 6), mk('c', 7), mk('d', 8), Object.assign(mk('e', 9), { au: undefined }), mk('z', 9999)];
  const set = { rank: 100, stage: 5 }, now = 100 * 86400e3, day = 86400e3;
  const prog = { 'a|bg2nl': { state: 'review', s: 50, last: now - day, due: now + day }, 'b|bg2nl': { state: 'review', s: 2, last: now - 3 * day, due: now }, 'c|nl2bg': { state: 'learning', step: 0, due: now }, 'e|bg2nl': { state: 'review', s: 1, last: now - day } };
  assert.deepEqual(C.listenItems(S, prog, set, 'practice', now).map(s => s.id), ['c', 'b', 'a'], 'seen ones only, weakest first; a learning card counts as weakest; no clip, no item');
  assert.deepEqual(C.listenItems(S, prog, set, 'background', now, () => 0).map(s => s.id).sort(), ['a', 'b', 'c']);
  assert.deepEqual(C.listenItems(S, {}, set, 'practice', now).map(s => s.id), ['a', 'b', 'c', 'd'], 'nothing seen: the easiest eligible ones');
});
// --- deck words (D-035) ---
const WW = Array.from({ length: 40 }, (_, i) => ({ rank: i + 1, bg: 'дума' + (i + 1), en: 'word ' + (i + 1), pos: 'noun', forms: '' }));
t('word keys', () => {
  assert.deepEqual(C.parseKey('w:12|en2bg'), { id: 'w:12', dir: 'en2bg', lang: 'en', toBg: true, listen: false, word: true, rank: 12 });
  assert.equal(C.parseKey('A059|bg2nl').word, undefined);
  const ids = require('../data/sentences.json').map(s => s.id);
  assert.ok(ids.every(id => !id.includes(':')), 'no bundled sentence id has a colon');
  assert.ok(!C.rowToSentence({ id: 'w:5', bg: 'Да.', nl: 'Ja.' }, C.wordIndex(WW)).id.includes(':'), 'an imported id loses its colon');
});
t('wordRank stops at a gap', () => {
  assert.equal(C.wordRank({}), 0);
  assert.equal(C.wordRank({ 'w:1|bg2en': {}, 'w:2|en2bg': {}, 'w:4|bg2en': {}, 'A1|bg2nl': {} }), 2);
  assert.equal(C.hasWords({ 'A1|bg2nl': {} }), false);
});
t('gradeWord', () => {
  const now = new Date(2026, 9, 28, 9).getTime();
  const p = C.gradeWord(undefined, 3, now);
  assert.equal(p.first, now); assert.equal(p.reps, 1); assert.equal(p.state, 'review', 'Good on a new card graduates (one 10-minute step)');
  const again = C.gradeWord(p, 1, now + 5 * 86400e3);
  assert.equal(again.lapses, 1); assert.equal(again.state, 'relearning'); assert.equal(again.first, now);
  const fresh = C.gradeWord(undefined, 1, now); assert.equal(fresh.lapses, 0, 'Again on a new card is no lapse'); assert.equal(fresh.state, 'learning');
  const iv = C.wordIntervals(p, now + 5 * 86400e3);
  assert.ok(iv[0] < iv[1] && iv[1] < iv[2] && iv[2] < iv[3], 'Again < Hard < Good < Easy: ' + iv);
});
t('wordQueue: deck order, siblings next day, limits', () => {
  const now = new Date(2026, 9, 28, 9).getTime(), D = 86400e3, yesterday = now - D;
  let prog = {};
  let q = C.wordQueue(WW, prog, { newWords: 3 }, now);
  assert.deepEqual(q.fresh, ['w:1|bg2en', 'w:2|bg2en', 'w:3|bg2en'], 'new words in deck order, Bulgarian → English first');
  prog['w:1|bg2en'] = C.gradeWord(undefined, 3, now);
  q = C.wordQueue(WW, prog, { newWords: 3 }, now);
  assert.deepEqual(q.fresh, ['w:2|bg2en', 'w:3|bg2en'], 'a word started today counts, its sibling waits for tomorrow');
  prog = { 'w:1|bg2en': C.gradeWord(undefined, 3, yesterday) };
  q = C.wordQueue(WW, prog, { newWords: 2 }, now);
  assert.deepEqual(q.fresh, ['w:1|en2bg', 'w:2|bg2en', 'w:3|bg2en'], 'the sibling of a word started yesterday comes first');
  // reviews and learning
  prog = { 'w:5|bg2en': Object.assign(C.gradeWord(undefined, 3, now - 10 * D), { due: now - D }), 'w:6|bg2en': Object.assign(C.gradeWord(undefined, 1, now - 10 * D), { first: now - 10 * D, due: now + 5 * 60e3 }), 'w:7|bg2en': Object.assign(C.gradeWord(undefined, 3, now - 10 * D), { due: now + 40 * D }) };
  q = C.wordQueue(WW, prog, { newWords: 0 }, now);
  assert.deepEqual(q.due, ['w:5|bg2en']); assert.deepEqual(q.learning, ['w:6|bg2en']); assert.deepEqual(q.fresh, ['w:5|en2bg', 'w:6|en2bg', 'w:7|en2bg']);
  assert.deepEqual(q.counts, { fresh: 3, learning: 1, due: 1 });
  // the daily limit counts sentence reviews too
  const busy = Object.assign({}, prog); for (let i = 0; i < 5; i++) busy['S' + i + '|bg2nl'] = { box: 2, due: now - 1, reps: 3, lapses: 0, streak: 1, last: now - D, s: 3, d: 5, state: 'review' };
  q = C.wordQueue(WW, busy, { newWords: 5, dailyMax: 6 }, now);
  assert.deepEqual(q.fresh, [], 'no new cards once today\'s reviews reach the limit'); assert.equal(q.paused, 'limit'); assert.equal(q.load.reviews, 7, 'five sentences, a word review, a word in relearning');
  assert.deepEqual(q.due, ['w:5|bg2en'], 'reviews are never capped');
});
t('seedWords spreads the known words', () => {
  const now = new Date(2026, 9, 28, 9).getTime(), D = 86400e3;
  const seeded = C.seedWords(WW, 30, now);
  assert.equal(Object.keys(seeded).length, 60, 'both cards of words 1–30');
  assert.equal(C.wordRank(seeded), 30);
  const dues = Object.values(seeded).map(p => p.due);
  assert.ok(dues.every(d => d > now - D), 'nothing overdue');
  const today = Object.values(seeded).filter(p => p.due < now + D).length;
  assert.ok(today < 15, 'only a few due within a day: ' + today);
  assert.ok(Object.values(seeded).every(p => p.state === 'review' && p.first == null && p.reps === 1));
  assert.ok(seeded['w:1|bg2en'].s > seeded['w:30|bg2en'].s, 'early words are more stable');
  const q = C.wordQueue(WW, seeded, { newWords: 10 }, now);
  assert.equal(q.fresh[0], 'w:31|bg2en', 'learning continues after the known words');
});
t('wordCounts and the known-words history merge (D-036)', () => {
  const rev = days => ({ box: 2, due: 1 + days * 86400e3, reps: 2, lapses: 0, streak: 1, last: 1, s: days, d: 5, state: 'review' });
  const prog = { 'w:1|bg2en': rev(8), 'w:1|en2bg': rev(2), 'w:2|bg2en': rev(6.9), 'w:3|en2bg': rev(30), 'w:4|bg2en': Object.assign(rev(20), { state: 'relearning' }), 'A1|bg2nl': rev(50) };
  assert.deepEqual(C.wordCounts(prog), { started: 4, known: 1 }, 'only a Bulgarian → English review card with 7+ days to its next review counts');
  const a = { wordDays: { '2026-10-27': [10, 4, 100], '2026-10-28': [12, 5, 300] } }, b = { wordDays: { '2026-10-28': [12, 4, 200], '2026-10-26': [8, 3, 50] }, stamps: { wiped: 60 } };
  assert.deepEqual(C.mergeSnapshots(a, b).wordDays, { '2026-10-27': [10, 4, 100], '2026-10-28': [12, 5, 300] }, 'the newer entry per day; nothing from before a reset');
});
console.log(n, 'test groups passed' + (process.exitCode ? ' (with failures)' : ''));
