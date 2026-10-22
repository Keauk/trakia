#!/usr/bin/env node
// List answers that combine two accepted answers of a sentence but are not accepted yet (D-020).
// Usage: node tools/find_combinations.js [--ids C157,U065] [--data draft.json] [-o out.json]
// For every pair of answers in one tier group that differ in two or three separate places, every
// mixture of the two is built and scored with core.js `check` (default settings). Mixtures scored
// below correct are listed for review: not every mixture is a sentence, so never add them blindly.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const C = require(path.join(ROOT, 'app/core.js'));
const dataArg = process.argv.indexOf('--data');
const S = JSON.parse(fs.readFileSync(dataArg > 0 ? process.argv[dataArg + 1] : path.join(ROOT, 'data/sentences.json'), 'utf8'));
const W = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/words.json'), 'utf8'));
// the checker settings of ui.js DEFAULTS
const SETTINGS = { tolerance: 0, typoPct: 10, bagOfWords: true, strictPunct: false, strictYi: false, stripAccents: true, strictForms: true, translit: false };
const VOCAB = C.vocabulary(S, W, {});

const TOK = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|['’]\p{L}+|\S/gu;
/** word and punctuation tokens, each with the whitespace before it and its index in the answer */
function tokenize(str) {
  const toks = []; let last = 0, m;
  TOK.lastIndex = 0;
  while ((m = TOK.exec(str))) { toks.push({ w: m[0], pre: str.slice(last, m.index), low: m[0].toLowerCase(), i: toks.length, start: startsSentence(toks, toks.length) }); last = m.index + m[0].length; }
  return toks;
}
const isWord = t => /\p{L}/u.test(t.w);
/** whether position k of toks starts a sentence: the first token, or after . ! ? …, or after a dialogue dash that opens one */
function startsSentence(toks, k) {
  if (k === 0) return true;
  const p = toks[k - 1].w;
  return /^[.!?…]$/.test(p) || /^[—–]$/.test(p) && startsSentence(toks, k - 1);
}

/** answers of a sentence per checking group: Dutch and English with their tier, Bulgarian with the English-only ones (D-018) */
function groups(s) {
  return [
    { lang: 'nl', answers: [[s.nl, 'exact'], ...(s.nl_alt || []).map(a => [a, 'exact']), ...(s.nl_loose || []).map(a => [a, 'loose'])] },
    { lang: 'en', answers: [[s.en, 'exact'], ...(s.en_alt || []).map(a => [a, 'exact']), ...(s.en_loose || []).map(a => [a, 'loose'])] },
    { lang: 'bg', answers: [[s.bg, 'exact'], ...(s.bg_alt || []).map(a => [a, 'exact']), ...(s.bg_alt_en || []).map(a => [a, 'en-only'])] },
  ];
}

// words never written in lower case (names, English days, "I") keep their capital when they move into the sentence
const PROPER = { bg: new Set(), nl: new Set(), en: new Set() }, LOWER = { bg: new Set(), nl: new Set(), en: new Set() };
for (const s of S) for (const g of groups(s)) for (const [a] of g.answers) if (a) for (const t of tokenize(a)) (/^\p{Lu}/u.test(t.w) ? PROPER : LOWER)[g.lang].add(t.low);
for (const lang of Object.keys(PROPER)) for (const w of LOWER[lang]) PROPER[lang].delete(w);

/** equal runs and differing hunks of a word-level LCS alignment: [{kind: 'eq' | 'd', x: [from, to], y: [from, to]}] */
function align(X, Y) {
  const n = X.length, m = Y.length, L = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = X[i].low === Y[j].low ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const segs = []; let i = 0, j = 0, cur = null;
  while (i < n || j < m) {
    const kind = i < n && j < m && X[i].low === Y[j].low ? 'eq' : 'd';
    if (!cur || cur.kind !== kind) { cur = { kind, x: [i, i], y: [j, j] }; segs.push(cur); }
    if (kind === 'eq') { i++; j++; } else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) j++; else i++;
    cur.x[1] = i; cur.y[1] = j;
  }
  return segs;
}

function assemble(toks, lang) {
  return toks.map((t, k) => {
    let w = t.w;
    if (startsSentence(toks, k)) w = w.charAt(0).toUpperCase() + w.slice(1);
    else if (t.start && !PROPER[lang].has(t.low)) w = w.charAt(0).toLowerCase() + w.slice(1);
    // a token keeps the space it had in its own answer, but two words always get one ("mid-July" → "of July")
    return (k === 0 ? '' : !t.pre && (t.i === 0 || isWord(t) && isWord(toks[k - 1])) ? ' ' : t.pre) + w;
  }).join('');
}

/** every mixture of two answers, or none when their differences depend on each other */
function mixtures(X, Y, lang) {
  const segs = align(X, Y), hunks = segs.filter(s => s.kind === 'd');
  if (hunks.length < 2 || hunks.length > 3) return [];
  const words = (T, r) => T.slice(...r).filter(isWord);
  const stem = t => t.low.length >= 4 ? t.low.slice(0, 4) : t.low;
  // a word moved from one hunk to another ("Харесвам косата ти" / "Косата ти ми харесва")
  for (const a of hunks) for (const b of hunks) if (a !== b) {
    const xs = new Set(words(X, a.x).map(stem));
    if (words(Y, b.y).some(t => xs.has(stem(t)))) return [];
  }
  // one hunk only inserts and another only deletes: one phrase in two places ("back then" / "At that time")
  if (hunks.some(h => !words(X, h.x).length && words(Y, h.y).length) && hunks.some(h => words(X, h.x).length && !words(Y, h.y).length)) return [];
  // large rewrites, and hunks less than two words apart ("Are you" / "Do you come")
  if (hunks.some(h => words(X, h.x).length > 4 || words(Y, h.y).length > 4)) return [];
  for (let k = 1; k < segs.length - 1; k++) if (segs[k].kind === 'eq' && words(X, segs[k].x).length < 2) return [];
  const res = [];
  for (let mask = 1; mask < (1 << hunks.length) - 1; mask++) {
    let h = 0; const toks = [];
    for (const s of segs) {
      if (s.kind === 'eq') toks.push(...X.slice(...s.x));
      else { toks.push(...(mask & (1 << h) ? Y.slice(...s.y) : X.slice(...s.x))); h++; }
    }
    if (toks.length) res.push(assemble(toks, lang));
  }
  return res;
}

/** missing mixtures of one sentence: {k, id, lang, tier, cand, from, result, reason} */
function missing(s) {
  const out = [];
  for (const g of groups(s)) {
    const ans = g.answers.filter(([a]) => a).map(([a, tier]) => ({ a, tier, toks: tokenize(a) }));
    const seen = new Set();
    for (let p = 0; p < ans.length; p++) for (let q = p + 1; q < ans.length; q++) {
      const tier = g.lang === 'bg' ? (ans[p].tier === 'en-only' || ans[q].tier === 'en-only' ? 'en-only' : 'exact') : (ans[p].tier === 'exact' && ans[q].tier === 'exact' ? 'exact' : 'loose');
      const dir = g.lang === 'bg' ? (tier === 'en-only' ? 'en2bg' : 'nl2bg') : 'bg2' + g.lang;
      for (const cand of mixtures(ans[p].toks, ans[q].toks, g.lang)) {
        const key = C.normalise(cand, g.lang, SETTINGS);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const r = C.check(cand, C.acceptedFor(s, dir), g.lang, Object.assign({}, SETTINGS, { vocab: VOCAB[g.lang] }), C.looseFor(s, dir));
        if (r.result !== 'correct') out.push({ k: `${s.id}:${g.lang}:${out.length + 1}`, id: s.id, lang: g.lang, tier, cand, from: [ans[p].a, ans[q].a], result: r.result, reason: r.reason || '' });
      }
    }
  }
  return out;
}

if (require.main === module) {
  const argv = process.argv.slice(2), opt = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
  const ids = opt('--ids') ? new Set(opt('--ids').split(',')) : null, outFile = opt('-o');
  const found = S.filter(s => !ids || ids.has(s.id)).flatMap(missing);
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(found, null, 1));
  else for (const f of found) console.log(`${f.k}\t${f.tier}\t${f.result}\t${f.cand}`);
  const by = {}; for (const f of found) by[`${f.lang} ${f.tier}`] = (by[`${f.lang} ${f.tier}`] || 0) + 1;
  console.error(`${found.length} missing mixtures in ${new Set(found.map(f => f.id)).size} sentences`, by);
}
module.exports = { tokenize, align, mixtures, missing };
