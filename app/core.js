// @ts-check
/* Trakia core: pure functions (no DOM). Loaded by index.html and testable with node (tools/test_core.js). */
(function (global) {
  'use strict';

  // Leitner ladder: interval after a correct answer, per box (ms)
  const MIN = 60e3, H = 3600e3, D = 86400e3;
  const INTERVALS = [0, 10 * MIN, H, 6 * H, D, 3 * D, 7 * D, 16 * D, 35 * D];
  const MAX_BOX = INTERVALS.length - 1;

  const PUNCT = /[.,!?;:…«»"“”„'’‘`\-–—()\[\]\/]/g;

  // English leniency (D-011): contractions and British/American spelling pairs are treated as equal
  const EN_CONTR = { "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is', "she's": 'she is', "it's": 'it is', "that's": 'that is', "there's": 'there is', "here's": 'here is', "what's": 'what is', "where's": 'where is', "who's": 'who is', "how's": 'how is', "let's": 'let us',
    "i've": 'i have', "you've": 'you have', "we've": 'we have', "they've": 'they have', "i'll": 'i will', "you'll": 'you will', "he'll": 'he will', "she'll": 'she will', "it'll": 'it will', "we'll": 'we will', "they'll": 'they will',
    "i'd": 'i would', "you'd": 'you would', "he'd": 'he would', "she'd": 'she would', "we'd": 'we would', "they'd": 'they would',
    "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "can't": 'cannot', "can not": 'cannot', "won't": 'will not', "wouldn't": 'would not', "couldn't": 'could not', "shouldn't": 'should not', "mustn't": 'must not', "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not', "haven't": 'have not', "hasn't": 'has not', "hadn't": 'had not' };
  const EN_SPELL = { colour: 'color', colours: 'colors', favourite: 'favorite', neighbour: 'neighbor', neighbours: 'neighbors', travelling: 'traveling', travelled: 'traveled', centre: 'center', theatre: 'theater', grey: 'gray', realise: 'realize', realised: 'realized', organise: 'organize', organised: 'organized', apologise: 'apologize', programme: 'program', metre: 'meter', metres: 'meters', litre: 'liter', litres: 'liters', catalogue: 'catalog', dialogue: 'dialog', mum: 'mom', pyjamas: 'pajamas', aeroplane: 'airplane', kerb: 'curb', tyre: 'tire', tyres: 'tires', licence: 'license', practise: 'practice', defence: 'defense', jewellery: 'jewelry', cosy: 'cozy', okay: 'ok', flavour: 'flavor', honour: 'honor', humour: 'humor', labour: 'labor', behaviour: 'behavior', cancelled: 'canceled', modelling: 'modeling', whisky: 'whiskey', storey: 'story', doughnut: 'donut', cheque: 'check', towards: 'toward', afterwards: 'afterward', learnt: 'learned', dreamt: 'dreamed', spelt: 'spelled', burnt: 'burned', gotten: 'got' };
  // Dutch stressed and unstressed pronouns are the same answer (D-014: otherwise je/jij would count as a wrong word form)
  const NL_PRON = { jij: 'je', jou: 'je', jouw: 'je', mij: 'me', wij: 'we', zij: 'ze' };
  const EN_CONTR_RX = new RegExp('\\b(' + Object.keys(EN_CONTR).map(k => k.replace(/'/g, "['’]")).join('|') + ')\\b', 'g');
  function normalise(s, lang, opt) {
    opt = opt || {};
    s = (s || '').normalize('NFC').toLowerCase().trim();
    if (!opt.strictYi) s = s.replace(/ѝ/g, 'и');
    if (lang === 'nl' && opt.stripAccents !== false) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (lang === 'en') s = s.replace(EN_CONTR_RX, m => EN_CONTR[m.replace(/’/g, "'")]);
    if (lang === 'nl') s = s.replace(/\b([mz])['’]n\b/g, '$1ijn');
    if (!opt.strictPunct) s = s.replace(PUNCT, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    if (lang === 'en') s = s.split(' ').map(w => EN_SPELL[w] || w).join(' ');
    if (lang === 'nl') s = s.split(' ').map(w => NL_PRON[w] || w).join(' ');
    return s;
  }

  // optimal string alignment distance (Levenshtein + adjacent transposition)
  function distance(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    const d = [];
    for (let i = 0; i <= m; i++) { d[i] = new Array(n + 1); d[i][0] = i; }
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[m][n];
  }

  function sameBag(a, b) {
    const x = a.split(' ').sort().join(' '), y = b.split(' ').sort().join(' ');
    return x === y;
  }

  // --- word-form slips (decision D-014) -------------------------------------------------------
  // Inside the typo tolerance, a difference that swaps a real word for another form of it
  // (sunday/sundays, книга/книгата), swaps two short words (in/on, de/het) or leaves out or adds a
  // whole word is a grammar error, not a typo. "Real word" = occurs in the corpus (opt.vocab).

  // inflectional endings: adding one to the expected word (or leaving out one of two letters or more)
  // makes another form of it, even when that form never occurs in the corpus (table -> tables)
  const ENDINGS = { en: ['s', 'es', 'ed', 'd', 'ing'], nl: ['s', 'en', 'n', 'e', 't', 'te', 'de', 'ten', 'den'], bg: ['та', 'то', 'те', 'ът', 'ят', 'а', 'я', 'ите'] };
  /** is typed word tw a different form of expected word aw (rather than a typo of it)? */
  function formSlip(tw, aw, vocab, lang) {
    const end = ENDINGS[lang] || [];
    if (tw.length > aw.length && aw.length >= 3 && tw.startsWith(aw) && end.includes(tw.slice(aw.length))) return true;
    if (aw.length > tw.length + 1 && tw.length >= 3 && aw.startsWith(tw) && end.includes(aw.slice(tw.length))) return true;
    if (!vocab.has(tw)) return false;
    let p = 0; while (p < tw.length && p < aw.length && tw[p] === aw[p]) p++;
    return p >= 3 || (tw.length <= 3 && aw.length <= 3);
  }
  /**
   * Align two normalised answers word by word: every pair [typed, expected] in order, '' for a
   * missing or extra word, and a glued pair ('твоята' against 'твоя та') where a space is missing
   * or extra, which counts as a typo rather than a slip.
   * @param {string} t @param {string} a @returns {string[][]}
   */
  function alignWords(t, a) {
    const T = t.split(' '), A = a.split(' '), m = T.length, n = A.length;
    const sub = (x, y) => x === y ? 0 : distance(x, y) / Math.max(x.length, y.length);
    // x typed where y1 + y2 (or x1 + x2 where y) was expected: a missing or extra space, plus at most
    // one typo when both parts are real words of two letters or more (so a dropped "a" or "в" is a slip)
    const glued = (x, y, p1, p2) => x === y || (p1.length > 1 && p2.length > 1 && distance(x, y) <= 1) ? 0.5 : Infinity;
    /** @type {number[][]} */ const d = [];
    for (let i = 0; i <= m; i++) { d[i] = []; for (let j = 0; j <= n; j++) {
      if (!i && !j) { d[i][j] = 0; continue; }
      let v = Infinity;
      if (i && j) v = d[i - 1][j - 1] + sub(T[i - 1], A[j - 1]);
      if (i) v = Math.min(v, d[i - 1][j] + 1);
      if (j) v = Math.min(v, d[i][j - 1] + 1);
      if (i && j > 1) v = Math.min(v, d[i - 1][j - 2] + glued(T[i - 1], A[j - 2] + A[j - 1], A[j - 2], A[j - 1]));   // typed two words as one
      if (i > 1 && j) v = Math.min(v, d[i - 2][j - 1] + glued(T[i - 2] + T[i - 1], A[j - 1], T[i - 2], T[i - 1]));   // typed one word as two
      d[i][j] = v;
    } }
    const out = [];
    let i = m, j = n;
    while (i || j) {
      const v = d[i][j];
      if (i && j && v === d[i - 1][j - 1] + sub(T[i - 1], A[j - 1])) { out.push([T[i - 1], A[j - 1]]); i--; j--; }
      else if (i && j > 1 && v === d[i - 1][j - 2] + glued(T[i - 1], A[j - 2] + A[j - 1], A[j - 2], A[j - 1])) { out.push([T[i - 1], A[j - 2] + ' ' + A[j - 1]]); i--; j -= 2; }
      else if (i > 1 && j && v === d[i - 2][j - 1] + glued(T[i - 2] + T[i - 1], A[j - 1], T[i - 2], T[i - 1])) { out.push([T[i - 2] + ' ' + T[i - 1], A[j - 1]]); i -= 2; j--; }
      else if (i && v === d[i - 1][j] + 1) { out.push([T[i - 1], '']); i--; }
      else { out.push(['', A[j - 1]]); j--; }
    }
    return out.reverse();
  }
  /**
   * The word-form slips between two normalised answers as [typed, expected] pairs ('' for a missing
   * or extra word). Missing or extra spaces are typos, not slips.
   * @param {string} t @param {string} a @param {Set<string>} vocab @param {string} [lang] @returns {string[][]}
   */
  function wordSlips(t, a, vocab, lang) {
    return alignWords(t, a).filter(([x, y]) => !x || !y || (x !== y && !x.includes(' ') && !y.includes(' ') && formSlip(x, y, vocab, lang || '')));
  }

  // ---------- explanations (D-006) ----------
  const ARTICLES = ['ият', 'ия', 'ът', 'ят', 'та', 'то', 'те', 'а', 'я'];
  const CLITICS = new Set(['ме', 'те', 'го', 'я', 'ни', 'ви', 'ги', 'ми', 'ти', 'му', 'ѝ', 'и', 'им', 'се', 'си', 'съм', 'е', 'сме', 'сте', 'са', 'ще', 'не', 'ли']);
  /** the definite-article suffix of a normalised Bulgarian word, with the bare form, or null */
  function article(w) {
    for (const suf of ARTICLES) if (w.length > suf.length + 1 && w.endsWith(suf)) return { bare: w.slice(0, -suf.length), suf };
    return null;
  }
  /**
   * Verb aspect pairs from the deck's Forms column ("ям / изям"): each member maps to the other
   * and whether it is the perfective (second) one. Spelling variants ("знам / зная") are skipped.
   * @param {Word[]} words @returns {Map<string, {other: string, perfective: boolean}>}
   */
  function aspectPairs(words) {
    const M = new Map();
    for (const w of words || []) {
      if (w.pos !== 'verb' || !/\//.test(w.forms || '')) continue;
      const [a, b] = w.forms.split('/').slice(0, 2).map(x => normalise(x.replace(/\(.*?\)/g, '').replace(/(^| )се( |$)/g, ' '), 'bg'));
      if (!a || !b || a === b || a === 'съм' || (a.length === b.length && a.slice(0, -1) === b.slice(0, -1))) continue;
      if (!M.has(a)) M.set(a, { other: b, perfective: false });
      if (!M.has(b)) M.set(b, { other: a, perfective: true });
    }
    return M;
  }
  /**
   * Short notes on why a normalised answer t differs from the accepted answer a (D-006): article,
   * aspect and clitic order for Bulgarian; spelling and a missing or extra word for every language.
   * At most three, in sentence order; none for a wholly different answer. Every note carries the
   * [typed, expected] pair it explains, so the caller can drop that pair from the plain slip list.
   * @param {string} t @param {string} a @param {string} lang @param {{vocab?: Set<string>, aspects?: Map<string, {other: string, perfective: boolean}>}} ctx
   * @returns {{kind: string, note: string, pair: string[]}[]}
   */
  function explain(t, a, lang, ctx) {
    ctx = ctx || {}; const vocab = ctx.vocab || new Set(), bg = lang === 'bg';
    if (!t || t === a) return [];
    if (bg && sameBag(t, a)) {
      // only clitics out of place: the other words stand in the same order on both sides
      const rest = (/** @type {string} */ x) => x.split(' ').filter(w => !CLITICS.has(w)).join(' ');
      return rest(t) === rest(a) ? [{ kind: 'clitic', note: 'word order: short words like ми, се and ли stand right after the first stressed word', pair: [t, a] }] : [];
    }
    const pairs = alignWords(t, a).filter(([x, y]) => x !== y);
    if (pairs.length > 4 || pairs.length * 2 > a.split(' ').length) return [];
    const out = [];
    for (const [x, y] of pairs) {
      if (out.length === 3) break;
      if (!x) { out.push({ kind: 'missing', note: `missing word: ${y}`, pair: [x, y] }); continue; }
      if (!y) { out.push({ kind: 'extra', note: `extra word: ${x}`, pair: [x, y] }); continue; }
      if (x.includes(' ') || y.includes(' ')) continue;
      if (bg) {
        const ax = article(x), ay = article(y);
        if (ay && ay.bare === x && vocab.has(x)) { out.push({ kind: 'article', note: `missing definite article: ${x} → ${y}`, pair: [x, y] }); continue; }
        if (ax && ax.bare === y && vocab.has(y)) { out.push({ kind: 'article', note: `no article here: ${x} → ${y}`, pair: [x, y] }); continue; }
        if (ax && ay && ax.bare === ay.bare && ax.suf !== ay.suf && /^(ът|ят|ият|а|я|ия)$/.test(ax.suf) && /^(ът|ят|ият|а|я|ия)$/.test(ay.suf)) {
          const full = /т$/.test(ay.suf);
          out.push({ kind: 'article', note: full ? `the full article -${ay.suf}, because the noun is the subject: ${x} → ${y}` : `the short article -${ay.suf}, because the noun is not the subject: ${x} → ${y}`, pair: [x, y] }); continue;
        }
        const asp = ctx.aspects && ctx.aspects.get(x);
        if (asp && asp.other === y) { out.push({ kind: 'aspect', note: asp.perfective ? `aspect: an ongoing or repeated action takes the imperfective ${y}, not ${x}` : `aspect: a single completed action takes the perfective ${y}, not ${x}`, pair: [x, y] }); continue; }
      }
      if (distance(x, y) <= 2 && !formSlip(x, y, vocab, lang)) out.push({ kind: 'spelling', note: `spelling: ${x} → ${y}`, pair: [x, y] });
    }
    return out;
  }

  /**
   * Every normalised word form that occurs in an accepted answer, the deck (dictionary and listed
   * forms) or the extra strings per language (grammar-drill answers, the learner's own accepted
   * answers). check() uses it to tell a wrong word form from a typo.
   * @param {Sentence[]} sentences @param {Word[]} [words] @param {Record<string, string[]>} [extra]
   * @returns {Record<string, Set<string>>}
   */
  function vocabulary(sentences, words, extra) {
    const V = { bg: new Set(), nl: new Set(), en: new Set() };
    const add = (lang, s) => { for (const w of normalise(s, lang).split(' ')) if (w) V[lang].add(w); };
    for (const s of sentences) {
      for (const x of [s.bg].concat(s.bg_alt || [], s.bg_alt_en || [])) add('bg', x);
      for (const L of ['nl', 'en']) for (const x of [s[L]].concat(s[L + '_alt'] || [], s[L + '_loose'] || [])) if (x) add(L, x);
    }
    for (const w of words || []) { add('bg', w.bg); for (const part of (w.forms || '').split(/[(),\/;]/)) add('bg', part); }
    for (const L in extra || {}) if (V[L]) for (const x of (extra || {})[L]) add(L, x);
    return V;
  }

  /**
   * check(typed, accepted[], lang, opt, loose[]) -> {result: 'correct'|'almost'|'wrong', expected, dist, t, a, reason, loose, closer, slips}
   * lang: 'nl', 'en' or 'bg' (the language of the answer). opt: settings (typoPct, bagOfWords,
   * strictForms, strict*) plus vocab (Set of known word forms for lang, see vocabulary()).
   * loose: answers accepted with a "looser translation" note (D-014); closer is then the exact
   * answer nearest to what was typed.
   */
  function check(typed, accepted, lang, opt, loose) {
    opt = opt || {}; loose = loose || [];
    const t = normalise(typed, lang, opt);
    /** @typedef {{dist: number, acc: string, a: string, loose: boolean}} Cand */
    /** @type {Cand | null} */ let best = null;
    /** @type {Cand | null} */ let bestExact = null;
    for (const [list, isLoose] of /** @type {[string[], boolean][]} */ ([[accepted, false], [loose, true]])) {
      for (const acc of list) {
        const a = normalise(acc, lang, opt);
        if (!a) continue;
        const dist = t === a ? 0 : distance(t, a);
        const cand = { dist, acc, a, loose: isLoose };
        if (!isLoose && (!bestExact || dist < bestExact.dist)) bestExact = cand;
        if (dist === 0 && !isLoose) return { result: 'correct', expected: acc, dist: 0, t, a };
        if (!best || dist < best.dist) best = cand;
      }
    }
    if (!best) return { result: 'wrong', expected: '', dist: Infinity, t, a: '' };
    const out = { expected: best.acc, dist: best.dist, t, a: best.a };
    if (best.loose) Object.assign(out, { loose: true, closer: bestExact ? bestExact.acc : '' });
    if (best.dist === 0) return Object.assign(out, { result: 'correct' });
    if (!t) return Object.assign(out, { result: 'wrong', reason: 'empty' });
    const pct = opt.typoPct == null ? 10 : opt.typoPct;
    const thresh = Math.max(1, Math.round(best.a.length * pct / 100));
    let slips = [];
    if (best.dist <= thresh) {
      if (opt.vocab && opt.strictForms !== false) slips = wordSlips(t, best.a, opt.vocab, lang);
      if (!slips.length) return Object.assign(out, { result: 'almost', reason: 'typo' });
    }
    if (opt.bagOfWords !== false && lang === 'bg') {
      for (const acc of accepted) {
        const a = normalise(acc, lang, opt);
        if (a && sameBag(t, a)) return { result: 'almost', expected: acc, dist: best.dist, t, a, reason: 'order' };
      }
    }
    if (slips.length) return Object.assign(out, { result: 'wrong', reason: 'form', slips });
    return Object.assign(out, { result: 'wrong' });
  }

  // character diff (LCS) -> [[op, text]] with op 'eq' | 'del' (typed only) | 'ins' (expected only)
  function diff(typed, expected) {
    const a = Array.from(typed), b = Array.from(expected);
    const m = a.length, n = b.length;
    const L = [];
    for (let i = 0; i <= m; i++) { L[i] = new Int16Array(n + 1); }
    for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const ops = [];
    let i = 0, j = 0;
    const push = (op, ch) => { const last = ops[ops.length - 1]; if (last && last[0] === op) last[1] += ch; else ops.push([op, ch]); };
    while (i < m && j < n) {
      if (a[i] === b[j]) { push('eq', a[i]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { push('del', a[i]); i++; }
      else { push('ins', b[j]); j++; }
    }
    while (i < m) push('del', a[i++]);
    while (j < n) push('ins', b[j++]);
    return ops;
  }

  /**
   * Word highlights for the expected line of the result bar (D-015): the words of `expected`, each with
   * miss = true when a word-level LCS against `typed` leaves it unmatched. Case-sensitive (an accepted
   * "sunday" still marks "Sunday"); leading and trailing punctuation is ignored, ’ counts as '.
   * A typed word with no counterpart is inserted where it was typed, as { extra: true } (D-019), but only
   * when no expected word in that gap is missing: a substituted word is shown by the missing one alone.
   * @param {string} typed @param {string} expected @returns {{w: string, miss: boolean, extra?: boolean}[]}
   */
  function wordMarks(typed, expected) {
    const strip = w => w.replace(/^[^\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+$/gu, ''), key = w => strip(w.replace(/’/g, "'"));
    const words = (expected || '').split(/\s+/).filter(Boolean), b = words.map(key);
    const tw = (typed || '').split(/\s+/).filter(Boolean).filter(w => key(w)), a = tw.map(key);
    const m = a.length, n = b.length, L = [];
    for (let i = 0; i <= m; i++) L[i] = new Int16Array(n + 1);
    for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    /** @type {[number, number][]} matched (typed, expected) index pairs, closed by an end sentinel */
    const pairs = [];
    for (let i = 0, j = 0; i < m && j < n;) {
      if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) i++;
      else j++;
    }
    pairs.push([m, n]);
    /** @type {{w: string, miss: boolean, extra?: boolean}[]} */
    const out = [];
    let pi = 0, pj = 0;
    for (const [mi, mj] of pairs) {
      const gap = words.slice(pj, mj).map((w, k) => ({ w, miss: b[pj + k] !== '' }));
      if (!gap.some(x => x.miss)) out.push(...tw.slice(pi, mi).map(w => ({ w: strip(w), miss: false, extra: true })));
      out.push(...gap);
      if (mj < n) out.push({ w: words[mj], miss: false });
      pi = mi + 1; pj = mj + 1;
    }
    return out;
  }

  // Latin -> Cyrillic phonetic transliteration (longest match first)
  const TR_MULTI = [['sht', 'щ'], ['sh', 'ш'], ['ch', 'ч'], ['zh', 'ж'], ['yu', 'ю'], ['ya', 'я'], ['yo', 'ьо'], ['ju', 'ю'], ['ja', 'я']];
  const TR_ONE = { a: 'а', b: 'б', v: 'в', w: 'в', g: 'г', d: 'д', e: 'е', z: 'з', i: 'и', j: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', x: 'ь', c: 'ц', y: 'ъ', q: 'я' };
  function translit(s) {
    let out = '';
    for (let i = 0; i < s.length;) {
      const low = s.slice(i, i + 3).toLowerCase();
      let hit = null;
      for (const [lat, cyr] of TR_MULTI) if (low.startsWith(lat)) { hit = [lat, cyr]; break; }
      if (hit) {
        const up = s[i] === s[i].toUpperCase() && s[i] !== s[i].toLowerCase();
        out += up ? hit[1][0].toUpperCase() + hit[1].slice(1) : hit[1];
        i += hit[0].length;
      } else {
        const ch = s[i], c = TR_ONE[ch.toLowerCase()];
        if (c) out += ch === ch.toUpperCase() && ch !== ch.toLowerCase() ? c.toUpperCase() : c;
        else out += ch;
        i++;
      }
    }
    return out;
  }

  // --- scheduling ---------------------------------------------------------------------------
  function newRecord() { return { box: 0, due: 0, reps: 0, lapses: 0, streak: 0, last: 0 }; }

  // --- FSRS-6 scheduler (decision D-001) ---------------------------------------------------------
  // Port of py-fsrs 6.3.2 (open-spaced-repetition), the algorithm Anki ships. A card has stability
  // s (days until recall probability drops to 90 %), difficulty d (1..10), state 'learning' |
  // 'review' | 'relearning' and a learning step. Short learning steps keep the minute-granular
  // behaviour; FSRS schedules whole days once a card graduates.
  const FSRS_PARAMS = [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542];
  // one 10-minute step (D-024): a new card answered Good graduates at once; a miss waits 10 minutes.
  // Steps shorter than a session only ever fired in the next session, so they repeated sentences.
  const FSRS_DEFAULTS = { retention: 0.9, learningSteps: [10 * MIN], relearningSteps: [10 * MIN], maxInterval: 365, fuzz: true };
  const FUZZ_RANGES = [[2.5, 7.0, 0.15], [7.0, 20.0, 0.1], [20.0, Infinity, 0.05]];
  const AGAIN = 1, HARD = 2, GOOD = 3, EASY = 4;
  const clampD = d => Math.min(10, Math.max(1, d)), clampS = x => Math.max(0.001, x);

  function fsrsOpts(settings) {
    const o = Object.assign({}, FSRS_DEFAULTS, settings && settings.fsrs ? settings.fsrs : {});
    if (settings && settings.retention != null) o.retention = settings.retention;
    if (settings && settings.maxInterval != null) o.maxInterval = settings.maxInterval;
    o.w = o.w || FSRS_PARAMS;
    o.decay = -o.w[20];
    o.factor = Math.pow(0.9, 1 / o.decay) - 1;
    return o;
  }
  /** probability of recall after `elapsedDays` for stability s */
  function retrievability(s, elapsedDays, opts) {
    const o = opts || fsrsOpts();
    return Math.pow(1 + o.factor * Math.max(0, elapsedDays) / s, o.decay);
  }
  function initialDifficulty(w, rating, clamp) { const d = w[4] - Math.exp(w[5] * (rating - 1)) + 1; return clamp === false ? d : clampD(d); }
  function nextDifficulty(w, d, rating) {
    const delta = -(w[6] * (rating - 3));
    const damped = d + (10 - d) * delta / 9;
    return clampD(w[7] * initialDifficulty(w, EASY, false) + (1 - w[7]) * damped);
  }
  function shortTermStability(w, s, rating) {
    let inc = Math.exp(w[17] * (rating - 3 + w[18])) * Math.pow(s, -w[19]);
    if (rating >= HARD) inc = Math.max(inc, 1);
    return clampS(s * inc);
  }
  function recallStability(w, d, s, r, rating) {
    const hard = rating === HARD ? w[15] : 1, easy = rating === EASY ? w[16] : 1;
    return clampS(s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp((1 - r) * w[10]) - 1) * hard * easy));
  }
  function forgetStability(w, d, s, r) {
    const long = w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]);
    const short = s / Math.exp(w[17] * w[18]);
    return clampS(Math.min(long, short));
  }
  /** whole days until the next review for stability s at the desired retention */
  function nextIntervalDays(s, o) {
    const ivl = Math.round((s / o.factor) * (Math.pow(o.retention, 1 / o.decay) - 1));
    return Math.min(Math.max(ivl, 1), o.maxInterval);
  }
  function fuzzInterval(days, o, rand) {
    if (!o.fuzz || days < 2.5) return days;
    let delta = 1;
    for (const [start, end, f] of FUZZ_RANGES) delta += f * Math.max(Math.min(days, end) - start, 0);
    let lo = Math.max(2, Math.round(days - delta)), hi = Math.min(Math.round(days + delta), o.maxInterval);
    lo = Math.min(lo, hi);
    return Math.min(Math.round(rand() * (hi - lo + 1) + lo), o.maxInterval);
  }

  /**
   * fsrsReview(card, rating, now, opts, rand) -> new card with s, d, state, step, due, last.
   * Mirrors py-fsrs Scheduler.review_card. card may be {} for a brand-new card.
   */
  function fsrsReview(card, rating, now, opts, rand) {
    const o = opts || fsrsOpts(), w = o.w; rand = rand || Math.random;
    card = card || {};
    const c = { state: card.state || 'learning', step: card.step == null ? 0 : card.step, s: card.s == null ? null : card.s, d: card.d == null ? null : card.d, last: card.last || 0 };
    const elapsed = c.last ? (now - c.last) / D : null;     // fractional days since last review
    const sameDay = elapsed != null && elapsed < 1;
    const R = () => retrievability(c.s, elapsed, o);
    let ivl;                                               // ms
    const graduate = () => { c.state = 'review'; c.step = null; ivl = nextIntervalDays(c.s, o); };
    const stepsFor = st => st === 'learning' ? o.learningSteps : o.relearningSteps;
    if (c.state === 'learning' || c.state === 'relearning') {
      if (c.s == null || c.d == null) { c.s = clampS(w[rating - 1]); c.d = initialDifficulty(w, rating); }
      else if (sameDay) { c.s = shortTermStability(w, c.s, rating); c.d = nextDifficulty(w, c.d, rating); }
      else { c.s = rating === AGAIN ? forgetStability(w, c.d, c.s, R()) : recallStability(w, c.d, c.s, R(), rating); c.d = nextDifficulty(w, c.d, rating); }
      const steps = stepsFor(c.state);
      if (!steps.length || (c.step >= steps.length && rating >= HARD)) graduate();
      else if (rating === AGAIN) { c.step = 0; ivl = steps[0]; }
      else if (rating === HARD) ivl = c.step === 0 && steps.length === 1 ? steps[0] * 1.5 : c.step === 0 ? (steps[0] + steps[1]) / 2 : steps[c.step];
      else if (rating === GOOD) { if (c.step + 1 === steps.length) graduate(); else { c.step += 1; ivl = steps[c.step]; } }
      else graduate();
    } else {  // review
      c.s = sameDay ? shortTermStability(w, c.s, rating) : (rating === AGAIN ? forgetStability(w, c.d, c.s, R()) : recallStability(w, c.d, c.s, R(), rating));
      c.d = nextDifficulty(w, c.d, rating);
      if (rating === AGAIN) { if (!o.relearningSteps.length) ivl = nextIntervalDays(c.s, o); else { c.state = 'relearning'; c.step = 0; ivl = o.relearningSteps[0]; } }
      else ivl = nextIntervalDays(c.s, o);
    }
    if (c.state === 'review') ivl = fuzzInterval(ivl, o, rand) * D;   // days -> ms
    c.due = now + ivl; c.last = now;
    return c;
  }

  // ladder intervals in days, used to migrate old Leitner records and to derive a display box
  const BOX_DAYS = INTERVALS.map(ms => ms / D);
  /** one-time conversion of a Leitner record to FSRS fields (idempotent) */
  function migrateRecord(p) {
    if (!p || p.s != null) return p;
    const q = Object.assign({}, p);
    const box = q.box || 0;
    q.s = Math.max(BOX_DAYS[box], 10 * MIN / D);
    q.d = clampD(5 + 0.5 * (q.lapses || 0));
    q.state = box >= 4 ? 'review' : 'learning';
    q.step = box >= 4 ? null : Math.min(box, 1);
    return q;
  }
  function boxFromRecord(p) {
    if (!p) return 0;
    if (p.s == null) return p.box || 0;
    if (p.state !== 'review') return p.step || 0;
    let b = 2; for (let i = 2; i < BOX_DAYS.length; i++) if (p.s >= BOX_DAYS[i]) b = i;
    return b;
  }
  /** 'young' | 'established' | 'mature' — drives the "almost" policy */
  function maturity(p) {
    if (!p) return 'young';
    if (p.s == null) { const b = p.box || 0; return b <= 2 ? 'young' : b >= 6 ? 'mature' : 'established'; }
    if (p.state !== 'review' || p.s < 1) return 'young';
    if (p.first && p.reps < 3) return 'young';   // D-024: one Good graduates now, so the first three answers stay young
    return p.s >= 7 ? 'mature' : 'established';
  }
  /** current recall probability of a card (0 for cards in learning steps or never seen) */
  function recallNow(p, now, settings) {
    if (!p || p.s == null || p.state !== 'review' || !p.last) return 0;
    return retrievability(p.s, (now - p.last) / D, fsrsOpts(settings));
  }

  // --- "almost" policy (decision D-002) --------------------------------------------------------
  // young card (box <= youngMaxBox): a near miss counts as correct, at most `almostFreePasses` times
  // (typos and word-order misses have separate counters); established card: it holds its box;
  // mature card (box >= matureMinBox): it lapses like a wrong answer.
  const ALMOST = { youngMaxBox: 2, matureMinBox: 6 };   // legacy box thresholds; see maturity()
  function almostOutcome(p, reason, settings) {
    p = p || newRecord(); settings = settings || {};
    const policy = settings.almostPolicy || 'staged';
    const passes = settings.almostFreePasses == null ? 2 : settings.almostFreePasses;
    const counter = reason === 'order' ? 'orders' : 'almosts';
    const used = p[counter] || 0;
    if (policy === 'strict') return { rating: 'wrong', rule: 'strict' };
    if (policy === 'lenient') return { rating: 'almost', rule: 'hold' };
    const m = maturity(p);
    if (m === 'young' && used < passes) return { rating: 'correct', rule: 'free-pass', counter, used: used + 1, passes };
    if (m === 'mature') return { rating: 'wrong', rule: 'lapse' };
    return { rating: 'almost', rule: 'hold' };
  }

  /** apply an answer to a progress record; returns a new record. free = free-practice mode.
   *  reason ('typo' | 'order') and settings select the "almost" policy; see almostOutcome.
   *  Scheduling is FSRS-6 (D-001): correct -> Good, almost -> Hard (or Good / Again per policy), wrong -> Again. */
  function applyResult(p, result, now, free, rand, reason, settings) {
    p = Object.assign(newRecord(), migrateRecord(p) || {});
    rand = rand || Math.random;
    if (result === 'almost') {
      const o = almostOutcome(p, reason, settings);
      if (o.rule === 'free-pass' && o.counter && !free) p[o.counter] = o.used;
      p.lastRule = o.rule;
      result = o.rating;
    } else delete p.lastRule;
    const rating = result === 'correct' ? GOOD : result === 'almost' ? HARD : AGAIN;
    if (!p.reps && !p.first) p.first = now;                  // first answer ever: keeps the card young for three answers (D-024)
    p.reps += 1; p.last = p.last || 0;
    if (result === 'wrong') { p.lapses += 1; p.streak = 0; } else p.streak += 1;
    if (free && result !== 'wrong') { p.box = boxFromRecord(p); return p; }   // free practice never moves a card forward
    const c = fsrsReview({ s: p.s, d: p.d, state: p.state, step: p.step, last: p.last }, rating, now, fsrsOpts(settings), rand);
    p.s = c.s; p.d = c.d; p.state = c.state; p.step = c.step; p.due = c.due; p.last = now;
    if (free) p.due = now;                                   // a lapse in free practice is due right away
    p.box = boxFromRecord(p);
    p.rating = rating;
    return p;
  }

  // grammar stages (decision D-008): a sentence is eligible only if all its tagged grammar features
  // are allowed at the learner's stage. Untagged sentences pass. Informational tags never gate.
  const STAGES = {
    1: ['present', 'da-clause'],
    2: ['present', 'da-clause', 'future', 'imperative'],
    3: ['present', 'da-clause', 'future', 'imperative', 'aorist', 'perfect'],
    4: ['present', 'da-clause', 'future', 'imperative', 'aorist', 'perfect', 'imperfect', 'conditional'],
    5: null,   // everything
  };
  const INFO_TAGS = new Set(['comparative', 'numeral']);
  function grammarOk(s, settings) {
    const stage = settings && settings.stage != null ? settings.stage : 5;
    const allowed = STAGES[stage] === undefined ? null : STAGES[stage];
    if (!allowed || !s.grammar || !s.grammar.length) return true;
    for (const g of s.grammar) if (!INFO_TAGS.has(g) && !allowed.includes(g)) return false;
    return true;
  }
  function eligible(s, settings) {
    return (s.max_rank == null || s.max_rank <= settings.rank + (settings.tolerance || 0)) && grammarOk(s, settings);
  }

  function shuffle(arr, rand) { rand = rand || Math.random; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  /** the practice language ('nl' | 'en') for a sentence: the setting, or for 'mixed' a stable split by id */
  function langFor(id, settings) {
    const l = settings && settings.lang;
    if (l === 'en') return 'en';
    if (l === 'mixed') { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return (h & 1) ? 'en' : 'nl'; }
    return 'nl';
  }
  /** directions that exist for a sentence under the current settings: 'bg2<lang>' and '<lang>2bg' (gated) */
  function cardKeys(s, progress, settings) {
    const dirs = settings.directions || 'gated', ks = [], L = langFor(s.id, settings);
    const rec = s.id + '|bg2' + L, prod = s.id + '|' + L + '2bg';
    if (dirs !== 'nl2bg') ks.push(rec);
    if (dirs === 'both' || dirs === 'nl2bg') ks.push(prod);
    else if (dirs === 'gated') { const p = progress[rec]; if (p && p.box >= 1) ks.push(prod); }
    return ks;
  }
  /** split a card key into {id, dir, lang, toBg}: 'B017|nl2bg' -> {id:'B017', dir:'nl2bg', lang:'nl', toBg:true} */
  function parseKey(key) {
    const i = key.lastIndexOf('|'), id = key.slice(0, i), dir = key.slice(i + 1);
    const toBg = dir.endsWith('2bg'), lang = toBg ? dir.slice(0, -3) : dir.slice(3);
    return { id, dir, lang, toBg };
  }
  /** accepted answers for a card: the other-language sentence (+ alternatives) or the Bulgarian;
   *  an English prompt also accepts the other "you" form (ти/вие), which English leaves open (D-018) */
  function acceptedFor(s, dir) {
    const k = parseKey('x|' + dir);
    if (k.toBg) return [s.bg].concat(s.bg_alt || [], k.lang === 'en' ? s.bg_alt_en || [] : []);
    return [s[k.lang] || ''].concat(s[k.lang + '_alt'] || []).filter(Boolean);
  }
  /** answers accepted with a "looser translation" note (D-014); none for the Bulgarian directions */
  function looseFor(s, dir) {
    const k = parseKey('x|' + dir);
    return k.toBg ? [] : (s[k.lang + '_loose'] || []).filter(Boolean);
  }

  // function words ignored by the "no shared word between consecutive cards" rule (D-003)
  const STOP = new Set(['и', 'в', 'на', 'за', 'от', 'с', 'че', 'аз', 'ти', 'той', 'тя', 'то', 'ние', 'вие', 'те', 'това', 'този', 'да', 'не', 'ли', 'ще', 'се', 'си', 'съм', 'е', 'но', 'а', 'или', 'много', 'един', 'как', 'какво', 'сега', 'тук', 'там', 'може', 'трябва', 'имам', 'искам', 'мой', 'твой', 'неин', 'негов', 'наш', 'ваш', 'техен']);
  function contentLemmas(s) {
    const out = new Set();
    for (const l of (s && s.lemmas) || []) { const n = normalise(l.split('#')[0], 'bg'); if (n && !STOP.has(n)) out.add(n); }
    return out;
  }
  function sharesLemma(a, b) { for (const x of a) if (b.has(x)) return true; return false; }

  /** weighted sample without replacement; weight(item) > 0 */
  function weightedSample(items, k, weight, rand) {
    const pool = items.map(it => ({ it, w: weight(it) })), out = [];
    while (pool.length && out.length < k) {
      let total = 0; for (const p of pool) total += p.w;
      let r = rand() * total, i = 0;
      for (; i < pool.length - 1; i++) { r -= pool[i].w; if (r <= 0) break; }
      out.push(pool[i].it); pool.splice(i, 1);
    }
    return out;
  }

  /**
   * Order the cards so that consecutive cards do not share a content word and directions alternate
   * where possible. Greedy: at each position pick the earliest remaining card that fits, preferring a
   * different direction from the previous card; if nothing fits, take the earliest anyway.
   * With run > 1 (D-021) cards typed in Bulgarian and cards typed in Dutch or English come in blocks
   * of `run` instead, keeping the previous direction inside a block where possible.
   * @param {string[]} keys @param {Map<string, any>} byId @param {number} [run]
   */
  function spreadOut(keys, byId, run) {
    const rest = keys.slice(), out = [];
    let prevLem = new Set(), prevDir = '', prevKb = /** @type {boolean | null} */ (null), runLen = 0;
    while (rest.length) {
      let pick = -1, fallback = -1;
      if (!run || run <= 1) {
        for (let i = 0; i < rest.length; i++) {
          const [id, dir] = rest[i].split('|'), lem = contentLemmas(byId.get(id));
          if (sharesLemma(prevLem, lem)) continue;
          if (fallback < 0) fallback = i;
          if (dir !== prevDir) { pick = i; break; }
        }
        if (pick < 0) pick = fallback < 0 ? 0 : fallback;
      } else {
        // stay on the keyboard while the block is short, then switch. Inside a block the keyboard comes before
        // the shared-word rule; at a switch the rule comes first, so the block runs on rather than showing
        // the reverse of the card just answered. Highest score wins, the earliest card on a tie.
        const want = prevKb === null ? null : runLen < run ? prevKb : !prevKb, stay = want === prevKb;
        const top = want === null ? 1 : stay ? 4 : 3;
        let bestScore = -1;
        for (let i = 0; i < rest.length; i++) {
          const [id, dir] = rest[i].split('|'), kb = dir.endsWith('2bg'), fits = !sharesLemma(prevLem, contentLemmas(byId.get(id)));
          const score = want === null ? 1
            : stay ? (kb === want ? (fits ? (dir === prevDir ? 4 : 3) : 2) : fits ? 1 : 0)
            : (kb === want ? (fits ? 3 : 1) : fits ? 2 : 0);
          if (score > bestScore) { pick = i; bestScore = score; if (score === top) break; }
        }
      }
      const key = rest.splice(pick, 1)[0], [id, dir] = key.split('|'), kb = dir.endsWith('2bg');
      runLen = kb === prevKb ? runLen + 1 : 1;
      out.push(key); prevLem = contentLemmas(byId.get(id)); prevDir = dir; prevKb = kb;
    }
    return out;
  }

  /**
   * Full keyboard blocks (D-021): per keyboard (typed in Bulgarian or not), drop the least urgent due
   * keys so that its card count is a whole number of blocks. Only when that keyboard has more than
   * one block and enough due cards to drop; new cards are never dropped.
   * @param {string[]} dueKeys most urgent first @param {string[]} freshKeys @param {number} run @returns {string[]}
   */
  function fullBlocks(dueKeys, freshKeys, run) {
    if (!run || run <= 1) return dueKeys;
    const kb = (/** @type {string} */ k) => parseKey(k).toBg, drop = new Set();
    for (const side of [true, false]) {
      const due = dueKeys.filter(k => kb(k) === side), n = due.length + freshKeys.filter(k => kb(k) === side).length, r = n % run;
      if (n > run && r && due.length >= r) for (const k of due.slice(-r)) drop.add(k);
    }
    return dueKeys.filter(k => !drop.has(k));
  }

  /** merge due and new cards: due order preserved, new cards spread between them, never more than 3 new in a row before a waiting due card */
  function interleave(due, fresh) {
    if (!due.length) return fresh.slice();
    if (!fresh.length) return due.slice();
    const out = [], per = fresh.length / due.length;
    let credit = 0, f = 0;
    for (const d of due) {
      out.push(d); credit += per;
      let n = Math.min(3, Math.floor(credit));
      while (n-- > 0 && f < fresh.length) { out.push(fresh[f++]); credit -= 1; }
    }
    while (f < fresh.length) out.push(fresh[f++]);
    return out;
  }

  /** a sentence answered less than REST ago is left out of the next session (D-024) */
  const REST = 4 * H;
  /** new cards every session gets even while reviews wait (D-024) */
  const NEW_RESERVE = 2;
  /** keep the first card of every sentence: 'a|bg2nl', 'a|nl2bg', 'b|bg2nl' -> 'a|bg2nl', 'b|bg2nl' */
  function onePerSentence(keys) {
    const seen = new Set();
    return keys.filter(k => { const id = parseKey(k).id; if (seen.has(id)) return false; seen.add(id); return true; });
  }

  /**
   * buildSession(sentences[], progress, settings, now, rand) -> {queue: [key], free: bool, nDue, nNew}
   * A session holds settings.sessionSize cards (default 20, D-024), at most one per sentence. Reviews
   * come first (most forgotten first): while more are due than fit, a session is reviews plus
   * NEW_RESERVE new cards; once the due reviews all fit, new eligible cards fill the rest, at most
   * settings.newPerSession (default 10). So the more you practise, the more new sentences you get,
   * and new cards never outrun the reviews. Due cards top up when the new pool runs short. Unlocked NL->BG cards take
   * up to half the new slots; the rest are a weighted random pick favouring lower ranks
   * (settings.newOrder 'mixed', default) or strictly lowest-rank-first ('strict') (D-003).
   * A sentence answered in the last REST is skipped: no new card for it, and no due card in its other
   * direction; a card's own due time is left to the scheduler. Consecutive cards never share a content
   * word when avoidable, directions alternate (or come in keyboard blocks of settings.dirRun, D-021),
   * and a due card never waits behind more than three new ones.
   * If nothing is due or new: free practice over the weakest seen cards, rested sentences first.
   */
  function buildSession(sentences, progress, settings, now, rand) {
    rand = rand || Math.random;
    const byId = new Map(sentences.map(s => [s.id, s]));
    const size = settings.sessionSize == null ? 20 : settings.sessionSize;
    const cap = Math.min(size, settings.newPerSession == null ? 10 : settings.newPerSession), reserve = Math.min(cap, NEW_RESERVE, Math.floor(size / 4));   // a tiny session stays mostly reviews
    // when each sentence was last answered, per card, for the rest rule
    /** @type {Map<string, [string, number][]>} */ const answered = new Map();
    for (const k in progress) { const p = progress[k]; if (!p || !p.last) continue; const id = parseKey(k).id, list = answered.get(id); if (list) list.push([k, p.last]); else answered.set(id, [[k, p.last]]); }
    const restsBut = (/** @type {string} */ id, /** @type {string} */ key) => (answered.get(id) || []).some(([k, t]) => k !== key && now - t < REST);
    const due = [];
    const elig = sentences.filter(s => eligible(s, settings));
    for (const s of sentences) for (const k of cardKeys(s, progress, settings)) {
      const p = progress[k];
      if (p && p.due <= now && !restsBut(s.id, k)) due.push({ k, due: p.due, r: recallNow(p, now, settings) });
    }
    due.sort((x, y) => x.r - y.r || x.due - y.due);   // most forgotten first; learning-step cards (r = 0) lead
    const dueAll = onePerSentence(due.map(x => x.k)), dueIds = new Set(dueAll.map(k => parseKey(k).id));
    let dueKeys = dueAll.slice(0, size - reserve);
    const candidates = [];
    for (const s of elig) {
      if (dueIds.has(s.id) || restsBut(s.id, '')) continue;
      const k = cardKeys(s, progress, settings).find(k => !progress[k]);
      if (k) candidates.push({ k, rank: s.max_rank == null ? Infinity : s.max_rank });
    }
    // reviews first: while reviews wait beyond this session only the reserve is new; once they all fit, new cards fill the rest
    const slots = dueAll.length > dueKeys.length ? reserve : Math.min(cap, size - dueKeys.length);
    // unlocked production cards (NL->BG of a sentence already seen) come first, up to half the new slots
    const prod = shuffle(candidates.filter(c => { const k = parseKey(c.k); return k.toBg && progress[k.id + '|bg2' + k.lang]; }), rand).sort((x, y) => x.rank - y.rank).slice(0, Math.ceil(slots / 2));
    const taken = new Set(prod.map(c => c.k)), rest = candidates.filter(c => !taken.has(c.k)), left = slots - prod.length;
    let fresh;
    if (settings.newOrder === 'strict') {
      fresh = shuffle(rest, rand).sort((x, y) => x.rank - y.rank).slice(0, left);
    } else {
      const R = Math.max(50, settings.rank || 0);
      fresh = weightedSample(rest, left, c => c.rank === Infinity ? 0.1 : 1 / (1 + Math.pow(c.rank / R, 2)), rand);
    }
    fresh = prod.concat(fresh).map(c => c.k);
    if (dueKeys.length + fresh.length < size) dueKeys = dueAll.slice(0, size - fresh.length);   // too few new cards: more reviews
    const run = settings.dirRun || 1;
    dueKeys = fullBlocks(dueKeys, fresh, run);
    let queue = spreadOut(interleave(dueKeys, fresh), byId, run), free = false;
    if (!queue.length) {
      free = true;
      const seen = [];
      for (const s of elig) for (const k of cardKeys(s, progress, settings)) if (progress[k]) seen.push(k);
      const resting = (/** @type {string} */ k) => restsBut(parseKey(k).id, '') ? 1 : 0;
      shuffle(seen, rand).sort((x, y) => resting(x) - resting(y) || boxFromRecord(progress[x]) - boxFromRecord(progress[y]));
      const n = settings.freeSize || (settings.sessionSize == null ? 20 : settings.sessionSize) || 20;
      queue = spreadOut(fullBlocks(onePerSentence(seen).slice(0, n), [], run), byId, run);
    }
    return { queue, free, nDue: due.length, nNew: fresh.length };
  }

  /** next sentence that would unlock after the current rank, or null */
  function nextUnlock(sentences, settings) {
    const limit = settings.rank + (settings.tolerance || 0);
    let best = null;
    for (const s of sentences) if (s.max_rank != null && s.max_rank > limit && (!best || s.max_rank < best.max_rank)) best = s;
    return best;
  }

  function hashId(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'u' + (h >>> 0).toString(36); }

  // small CSV/TSV parser (RFC4180-ish). returns array of objects keyed by lowercase header
  function parseDelimited(text) {
    const delim = (text.split('\n')[0].match(/\t/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? '\t' : ',';
    const rows = []; let row = [], field = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const head = (rows.shift() || []).map(h => h.trim().toLowerCase());
    return rows.filter(r => r.some(x => x.trim())).map(r => { const o = {}; head.forEach((h, i) => o[h] = (r[i] || '').trim()); return o; });
  }

  /** build lookup: normalised dictionary form / listed form -> {rank, en} */
  function wordIndex(words) {
    // exact dictionary forms win over inflected forms from the Forms column; forms are the fallback
    const exact = new Map(), forms = new Map();
    for (const w of words) {
      const k = normalise(w.bg, 'bg'), rec = { rank: w.rank, en: w.en, bg: w.bg };
      if (!exact.has(k) || w.rank < exact.get(k).rank) exact.set(k, rec);
      for (const part of (w.forms || '').split(/[(),\/;]/)) { const p = normalise(part, 'bg'); if (p && (!forms.has(p) || w.rank < forms.get(p).rank)) forms.set(p, rec); }
    }
    const idx = new Map(forms); for (const [k, v] of exact) idx.set(k, v);
    return idx;
  }

  /** turn an imported row ({bg, nl, nl_alt, ...}) into a sentence record; computes max_rank */
  function rowToSentence(row, idx) {
    const split = (v, sep) => Array.isArray(v) ? v : String(v || '').split(sep).map(x => x.trim()).filter(Boolean);
    const s = {
      id: String(row.id || '').trim() || hashId(String(row.bg).trim()),
      bg: String(row.bg || '').trim(), nl: String(row.nl || '').trim(),
      nl_alt: split(row.nl_alt, '|'), bg_alt: split(row.bg_alt, '|'), en_alt: split(row.en_alt, '|'), bg_alt_en: split(row.bg_alt_en, '|'),
      nl_loose: split(row.nl_loose, '|'), en_loose: split(row.en_loose, '|'),
      en: String(row.en || '').trim(), lemmas: split(row.lemmas, ','), tags: split(row.tags, ','),
      source: row.source || 'import',
    };
    if (!s.bg || !s.nl) return null;
    let ranks = [];
    if (s.lemmas.length) {
      for (const l of s.lemmas) { const hit = idx.get(normalise(l.split('#')[0], 'bg')); if (hit) ranks.push(hit.rank); else if (/#\d+$/.test(l)) ranks.push(+l.split('#')[1]); }
    } else {
      for (const tok of normalise(s.bg, 'bg').split(' ')) { const hit = idx.get(tok); if (hit) ranks.push(hit.rank); }
      s.rank_estimated = true;
    }
    s.max_rank = ranks.length ? Math.max.apply(null, ranks) : (row.max_rank != null && row.max_rank !== '' ? +row.max_rank : null);
    return s;
  }


  // --- grammar drills (decision D-009) -----------------------------------------------------------
  // Items are generated from data/grammar.json paradigms so the reference tables and the drills
  // can never drift apart. Each item: {id, kind, stage, prompt, hint, answers[], card}.
  const PRON_LABEL = { 'аз': 'аз', 'ти': 'ти', 'той/тя/то': 'той / тя / то', 'ние': 'ние', 'вие': 'вие', 'те': 'те' };
  const PERSON_IDX = { 'аз': 0, 'ти': 1, 'той/тя/то': 2, 'ние': 3, 'вие': 4, 'те': 5 };
  function drillItems(G, stage) {
    stage = stage == null ? 5 : stage;
    const items = [], P = G.pronouns, pd = G.paradigms;
    const add = it => { if (it.stage <= stage) items.push(it); };
    for (const v of pd.present) for (const p of P) add({ id: `conj:${v.verb}:${p}`, kind: 'conj', stage: 1, card: v.verb === 'съм' ? 'sum' : (v.verb === 'имам' || v.verb === 'нямам') ? 'imam' : ['чета', 'говоря', 'гледам', 'искам', 'обичам', 'работя', 'живея', 'пия'].includes(v.verb) ? 'present' : 'irregular', prompt: `${PRON_LABEL[p]} + ${v.verb}`, hint: 'present tense', answers: [v.forms[p]] });
    for (const [owner, clit] of Object.entries(pd.possShort)) for (const n of pd.nouns) {
      const L = pd.possLong[owner];
      const longAns = [`${L[n.g][1]} ${n.bg}`]; if (n.g === 'm' && /ят$/.test(L.m[1])) longAns.push(`${L.m[1].replace(/ят$/, 'я')} ${n.bg}`);
      add({ id: `poss:long:${owner}:${n.bg}`, kind: 'poss', stage: 1, card: 'poss-long', prompt: `${owner} ${n.en}`, hint: `long form, with the article (${n.bg})`, answers: longAns });
      const shortAns = n.kin && n.g !== 'pl' ? [`${n.bg} ${clit}`] : [`${n.def} ${clit}`]; if (!n.kin && n.g === 'm' && n.obj && n.obj !== n.def) shortAns.push(`${n.obj} ${clit}`);
      add({ id: `poss:short:${owner}:${n.bg}`, kind: 'poss', stage: 1, card: 'poss-short', prompt: `${owner} ${n.en}`, hint: `short form, clitic after the noun (${n.bg})`, answers: shortAns });
    }
    for (const n of pd.articleNouns) {
      if (n.g === 'm') {
        add({ id: `art:${n.bg}:subj`, kind: 'art', stage: 1, card: 'article', prompt: `${n.bg} → the ${n.en}`, hint: 'as the subject of the sentence', answers: [n.subj] });
        add({ id: `art:${n.bg}:obj`, kind: 'art', stage: 1, card: 'article', prompt: `${n.bg} → the ${n.en}`, hint: 'as an object / after a preposition', answers: [n.obj] });
      } else add({ id: `art:${n.bg}:def`, kind: 'art', stage: 1, card: 'article', prompt: `${n.bg} → the ${n.en}`, hint: 'definite form', answers: [n.def] });
    }
    const presentOf = {}; for (const v of pd.present) presentOf[v.verb] = v.forms;
    for (const verb of pd.futureVerbs) if (presentOf[verb]) for (const p of P) add({ id: `fut:${verb}:${p}`, kind: 'fut', stage: 2, card: 'future', prompt: `${PRON_LABEL[p]} + ${verb}`, hint: 'future (ще …)', answers: [`ще ${presentOf[verb][p]}`] });
    for (const im of pd.imperatives) { add({ id: `imp:${im.verb}:ти`, kind: 'imp', stage: 2, card: 'imperative', prompt: `ти + ${im.verb}`, hint: 'imperative (command to one person)', answers: [im.ti] }); add({ id: `imp:${im.verb}:вие`, kind: 'imp', stage: 2, card: 'imperative', prompt: `вие + ${im.verb}`, hint: 'imperative (polite / plural)', answers: [im.vie] }); }
    for (const v of pd.aorist) for (const p of P) add({ id: `aor:${v.verb}:${p}`, kind: 'aor', stage: 3, card: 'aorist', prompt: `${PRON_LABEL[p]} + ${v.verb}`, hint: 'past tense (aorist)', answers: [v.forms[p]] });
    const SUM = presentOf['съм'];
    for (const verb of pd.perfectVerbs) { const pt = pd.participles[verb]; if (!pt) continue; for (const p of P) { const i = PERSON_IDX[p], aux = SUM[p]; const parts = i === 2 ? [pt[0], pt[1], pt[2]] : i < 2 ? [pt[0], pt[1]] : [pt[3]]; const answers = []; for (const x of parts) { answers.push(i === 2 ? `${x} ${aux}` : `${x} ${aux}`); answers.push(`${aux} ${x}`); } add({ id: `perf:${verb}:${p}`, kind: 'perf', stage: 3, card: 'perfect', prompt: `${PRON_LABEL[p]} + ${verb}`, hint: 'perfect (participle + съм)', answers }); } }
    for (const v of pd.imperfect) for (const p of P) add({ id: `impf:${v.verb}:${p}`, kind: 'impf', stage: 4, card: 'imperfect', prompt: `${PRON_LABEL[p]} + ${v.verb}`, hint: 'imperfect (ongoing past)', answers: [v.forms[p]] });
    for (const verb of pd.conditionalVerbs) { const pt = pd.participles[verb]; if (!pt) continue; for (const p of P) { const i = PERSON_IDX[p], aux = pd.conditional[p]; const parts = i === 2 ? [pt[0], pt[1], pt[2]] : i < 2 ? [pt[0], pt[1]] : [pt[3]]; add({ id: `cond:${verb}:${p}`, kind: 'cond', stage: 4, card: 'conditional', prompt: `${PRON_LABEL[p]} + ${verb}`, hint: 'conditional (бих …)', answers: parts.map(x => `${aux} ${x}`) }); } }
    return items;
  }
  /** pick n drill items for the learner's stage, weighted toward forms answered wrong before. tally: {id: {ok, bad}} */
  function buildDrill(G, settings, tally, n, rand, cardFilter) {
    rand = rand || Math.random; tally = tally || {};
    let pool = drillItems(G, settings && settings.stage);
    if (cardFilter) pool = pool.filter(it => it.card === cardFilter || it.kind === cardFilter);
    const weight = it => { const t = tally[it.id] || {}; return Math.max(0.15, Math.pow(1 + 5 * (t.bad || 0), 2) / (1 + (t.ok || 0))); };
    const picked = weightedSample(pool, Math.min(n || 15, pool.length), weight, rand);
    // avoid the same verb / noun twice in a row where possible
    const out = []; const rest = picked.slice();
    while (rest.length) { let i = rest.findIndex(it => !out.length || it.id.split(':')[1] !== out[out.length - 1].id.split(':')[1]); if (i < 0) i = 0; out.push(rest.splice(i, 1)[0]); }
    return out;
  }

  // ---------- sync between devices (D-025) ----------
  /** settings that belong to one device and never travel with a sync */
  const DEVICE_SETTINGS = ['theme', 'wallpaper', 'wallpaperUrl', 'wallpaperDim', 'translit', 'dirRun'];
  /** the settings that are synced, keys sorted. @type {(s: Partial<Settings>) => Partial<Settings>} */
  function sharedSettings(s) { const out = {}; for (const k of Object.keys(s || {}).sort()) if (!DEVICE_SETTINGS.includes(k)) out[k] = s[k]; return out; }
  /** copy of an object with its keys sorted, values mapped by f. @type {<T, U>(o: Record<string, T>, f: (v: T, k: string) => U | undefined) => Record<string, U>} */
  function sortedMap(o, f) { const out = /** @type {Record<string, any>} */ ({}); for (const k of Object.keys(o).sort()) { const v = f(o[k], k); if (v !== undefined) out[k] = v; } return out; }
  /** union of two event lists ([ts, key, …]) without duplicates, oldest first, events at or before `after` dropped */
  function mergeEvents(a, b, after) {
    const seen = new Map();
    for (const e of (a || []).concat(b || [])) { const ts = Array.isArray(e) ? e[0] : e; if (ts > after) { const id = Array.isArray(e) ? ts + '|' + e[1] : String(ts); if (!seen.has(id)) seen.set(id, e); } }
    return [...seen.values()].sort((x, y) => (Array.isArray(x) ? x[0] : x) - (Array.isArray(y) ? y[0] : y));
  }
  /** Merge two snapshots of the learner's state; neither side loses what the other lacks (see D-025 for the rules).
   * Ties go to `remote`. Output keys are sorted, so equal states stringify identically.
   * @param {Partial<Snapshot>} local @param {Partial<Snapshot>} remote @returns {Snapshot} */
  function mergeSnapshots(local, remote) {
    const L = local || {}, R = remote || {}, Ls = L.stamps || {}, Rs = R.stamps || {};
    const stamps = { settings: Math.max(Ls.settings || 0, Rs.settings || 0), deleted: Math.max(Ls.deleted || 0, Rs.deleted || 0), wiped: Math.max(Ls.wiped || 0, Rs.wiped || 0) };
    const wiped = stamps.wiped;
    /** @type {Record<string, number>} */ const clearedAll = Object.assign({}, L.cleared);
    const Rc = R.cleared || {}; for (const k in Rc) clearedAll[k] = Math.max(clearedAll[k] || 0, Rc[k]);
    const cleared = sortedMap(clearedAll, ts => ts > wiped ? ts : undefined);
    /** @type {Progress} */ const allCards = {};
    for (const side of [L.progress || {}, R.progress || {}]) for (const k in side) {
      const p = migrateRecord(side[k]); if (!p) continue;
      const had = allCards[k]; if (!had || (p.last || 0) >= (had.last || 0)) allCards[k] = p;
    }
    const progress = sortedMap(allCards, (p, k) => (p.last || 0) > wiped && (p.last || 0) > (cleared[k] || 0) ? p : undefined);
    /** @type {Record<string, {ok: number, bad: number, last?: number}>} */ const allDrills = {};
    for (const side of [L.drills || {}, R.drills || {}]) for (const k in side) { const t = side[k], had = allDrills[k]; if (!had || (t.last || 0) >= (had.last || 0)) allDrills[k] = t; }
    const drills = sortedMap(allDrills, t => (t.last || 0) > wiped ? t : undefined);
    // accepted answers carry no timestamps: after a reset only the side(s) that saw the newest reset count
    /** @type {Record<string, string[]>} */ const allAlts = {};
    for (const [side, w] of /** @type {[Record<string, string[]>, number][]} */ ([[L.userAlts || {}, Ls.wiped || 0], [R.userAlts || {}, Rs.wiped || 0]])) if (w === wiped) for (const k in side) allAlts[k] = [...new Set((allAlts[k] || []).concat(side[k]))];
    const userSentences = sortedMap(Object.assign({}, L.userSentences, R.userSentences), s => s);
    const dl = Ls.deleted || 0, dr = Rs.deleted || 0;
    const deleted = [...new Set(dl > dr ? L.deleted || [] : dr > dl ? R.deleted || [] : (L.deleted || []).concat(R.deleted || []))].sort();
    const hasR = !!R.settings && Object.keys(R.settings).length > 0;
    const settings = sharedSettings((Ls.settings || 0) > (Rs.settings || 0) || !hasR ? L.settings || {} : R.settings || {});
    // stories: per story the record touched last (read mark or quiz), nothing from before a reset
    /** @type {Record<string, ReadingRecord>} */ const allReading = {};
    const touched = (/** @type {ReadingRecord} */ r) => Math.max(r.read || 0, r.quiz ? r.quiz.at : 0);
    for (const side of [L.reading || {}, R.reading || {}]) for (const k in side) { const r = side[k], had = allReading[k]; if (!had || touched(r) >= touched(had)) allReading[k] = r; }
    const reading = sortedMap(allReading, r => touched(r) > wiped ? r : undefined);
    return {
      app: 'trakia', version: 2, settings, progress, userAlts: sortedMap(allAlts, a => a.slice().sort()), userSentences, deleted,
      log: mergeEvents(L.log, R.log, wiped), sessions: mergeEvents(L.sessions, R.sessions, wiped), drills, drillLog: mergeEvents(L.drillLog, R.drillLog, wiped),
      stamps, cleared, reading,
    };
  }

  // ---------- reading (D-026, D-027) ----------
  /** split a text into words and the pieces between them; a word is a run of letters, as in tools/validate_stories.py
   * @param {string} text @returns {{t: string, w: boolean}[]} */
  function storyTokens(text) {
    const out = []; let at = 0;
    for (const m of text.normalize('NFC').matchAll(/\p{L}+/gu)) {
      if (m.index > at) out.push({ t: text.slice(at, m.index), w: false });
      out.push({ t: m[0], w: true }); at = m.index + m[0].length;
    }
    if (at < text.length) out.push({ t: text.slice(at), w: false });
    return out;
  }
  /** the key a word form has in a story's `words` map (lower case, ѝ as и like the validator) */
  const storyKey = (/** @type {string} */ form) => form.normalize('NFC').toLowerCase().replace(/ѝ/g, 'и');
  /** can the learner open this story: its level within their Anki position (plus tolerance) and its grammar within their stage
   * @param {Story} story @param {Partial<Settings>} settings */
  function storyEligible(story, settings) {
    return story.level <= (settings.rank || 0) + (settings.tolerance || 0) && grammarOk(story, settings);
  }

  const api = { INTERVALS, MAX_BOX, ALMOST, STAGES, grammarOk, drillItems, buildDrill, langFor, parseKey, acceptedFor, looseFor, vocabulary, alignWords, wordSlips, aspectPairs, explain, FSRS_PARAMS, FSRS_DEFAULTS, fsrsOpts, fsrsReview, retrievability, recallNow, migrateRecord, boxFromRecord, maturity, almostOutcome, STOP, contentLemmas, spreadOut, fullBlocks, onePerSentence, REST, NEW_RESERVE, interleave, weightedSample, normalise, distance, check, diff, wordMarks, translit, applyResult, eligible, cardKeys, buildSession, nextUnlock, hashId, parseDelimited, wordIndex, rowToSentence, newRecord, sameBag, DEVICE_SETTINGS, sharedSettings, mergeSnapshots, storyTokens, storyKey, storyEligible };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else global.TrakiaCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
