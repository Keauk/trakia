/* Trakia core: pure functions (no DOM). Loaded by index.html and testable with node (tools/test_core.js). */
(function (global) {
  'use strict';

  // Leitner ladder: interval after a correct answer, per box (ms)
  const MIN = 60e3, H = 3600e3, D = 86400e3;
  const INTERVALS = [0, 10 * MIN, H, 6 * H, D, 3 * D, 7 * D, 16 * D, 35 * D];
  const MAX_BOX = INTERVALS.length - 1;

  const PUNCT = /[.,!?;:…«»"“”„'’‘`\-–—()\[\]\/]/g;

  function normalise(s, lang, opt) {
    opt = opt || {};
    s = (s || '').normalize('NFC').toLowerCase().trim();
    if (!opt.strictYi) s = s.replace(/ѝ/g, 'и');
    if (lang === 'nl' && opt.stripAccents !== false) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (!opt.strictPunct) s = s.replace(PUNCT, ' ');
    return s.replace(/\s+/g, ' ').trim();
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

  /**
   * check(typed, accepted[], lang, opt) -> {result: 'correct'|'almost'|'wrong', expected, dist, t, a, reason}
   * lang: 'nl' or 'bg' (the language of the answer). opt: settings (typoPct, bagOfWords, strict*).
   */
  function check(typed, accepted, lang, opt) {
    opt = opt || {};
    const t = normalise(typed, lang, opt);
    let best = null;
    for (const acc of accepted) {
      const a = normalise(acc, lang, opt);
      if (!a) continue;
      if (t === a) return { result: 'correct', expected: acc, dist: 0, t, a };
      const dist = distance(t, a);
      if (!best || dist < best.dist) best = { dist, acc, a };
    }
    if (!best) return { result: 'wrong', expected: '', dist: Infinity, t, a: '' };
    const out = { expected: best.acc, dist: best.dist, t, a: best.a };
    if (!t) return Object.assign(out, { result: 'wrong', reason: 'empty' });
    const pct = opt.typoPct == null ? 10 : opt.typoPct;
    const thresh = Math.max(1, Math.round(best.a.length * pct / 100));
    if (best.dist <= thresh) return Object.assign(out, { result: 'almost', reason: 'typo' });
    if (opt.bagOfWords !== false && lang === 'bg') {
      for (const acc of accepted) {
        const a = normalise(acc, lang, opt);
        if (a && sameBag(t, a)) return Object.assign(out, { result: 'almost', expected: acc, a, reason: 'order' });
      }
    }
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

  /** apply an answer to a progress record; returns a new record. free = free-practice mode */
  function applyResult(p, result, now, free, rand) {
    p = Object.assign(newRecord(), p || {});
    rand = rand || Math.random;
    p.reps += 1; p.last = now;
    if (result === 'wrong') {
      p.lapses += 1; p.streak = 0; p.box = Math.max(0, p.box - 2); p.due = now;
      return p;
    }
    p.streak += 1;
    if (free) { if (p.box === 0) { p.box = 1; p.due = now + INTERVALS[1]; } return p; }
    if (result === 'correct') p.box = Math.min(MAX_BOX, p.box + 1);
    else if (p.box === 0) p.box = 1;           // almost: stay, but leave box 0
    const iv = INTERVALS[p.box];
    p.due = now + Math.round(iv * (0.9 + rand() * 0.2));
    return p;
  }

  function eligible(s, settings) {
    return s.max_rank == null || s.max_rank <= settings.rank + (settings.tolerance || 0);
  }

  function shuffle(arr, rand) { rand = rand || Math.random; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  /** directions that exist for a sentence under the current settings */
  function cardKeys(s, progress, settings) {
    const dirs = settings.directions || 'gated', ks = [];
    if (dirs !== 'nl2bg') ks.push(s.id + '|bg2nl');
    if (dirs === 'both' || dirs === 'nl2bg') ks.push(s.id + '|nl2bg');
    else if (dirs === 'gated') { const p = progress[s.id + '|bg2nl']; if (p && p.box >= 1) ks.push(s.id + '|nl2bg'); }
    return ks;
  }

  /**
   * buildSession(sentences[], progress, settings, now, rand) -> {queue: [key], free: bool, nDue, nNew}
   * due cards first (oldest first, capped), then new eligible cards (lowest max_rank first).
   * If nothing is due or new: free practice over the weakest seen cards.
   */
  function buildSession(sentences, progress, settings, now, rand) {
    rand = rand || Math.random;
    const due = [], fresh = [];
    const elig = sentences.filter(s => eligible(s, settings));
    for (const s of sentences) for (const k of cardKeys(s, progress, settings)) {
      const p = progress[k];
      if (p && p.due <= now) due.push({ k, due: p.due });
    }
    due.sort((x, y) => x.due - y.due);
    const dueKeys = due.slice(0, settings.maxDue || 40).map(x => x.k);
    const order = shuffle(elig.slice(), rand).sort((x, y) => (x.max_rank == null ? Infinity : x.max_rank) - (y.max_rank == null ? Infinity : y.max_rank));
    for (const s of order) {
      for (const k of cardKeys(s, progress, settings)) if (!progress[k] && fresh.length < (settings.newPerSession || 10)) fresh.push(k);
      if (fresh.length >= (settings.newPerSession || 10)) break;
    }
    let queue = dueKeys.concat(fresh), free = false;
    if (!queue.length) {
      free = true;
      const seen = [];
      for (const s of elig) for (const k of cardKeys(s, progress, settings)) if (progress[k]) seen.push(k);
      shuffle(seen, rand).sort((x, y) => progress[x].box - progress[y].box);
      queue = seen.slice(0, settings.freeSize || 20);
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
    const idx = new Map();
    for (const w of words) {
      const keys = new Set([normalise(w.bg, 'bg')]);
      for (const part of (w.forms || '').split(/[(),\/;]/)) { const p = normalise(part, 'bg'); if (p) keys.add(p); }
      for (const k of keys) if (!idx.has(k) || w.rank < idx.get(k).rank) idx.set(k, { rank: w.rank, en: w.en, bg: w.bg });
    }
    return idx;
  }

  /** turn an imported row ({bg, nl, nl_alt, ...}) into a sentence record; computes max_rank */
  function rowToSentence(row, idx) {
    const split = (v, sep) => Array.isArray(v) ? v : String(v || '').split(sep).map(x => x.trim()).filter(Boolean);
    const s = {
      id: String(row.id || '').trim() || hashId(String(row.bg).trim()),
      bg: String(row.bg || '').trim(), nl: String(row.nl || '').trim(),
      nl_alt: split(row.nl_alt, '|'), bg_alt: split(row.bg_alt, '|'),
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

  const api = { INTERVALS, MAX_BOX, normalise, distance, check, diff, translit, applyResult, eligible, cardKeys, buildSession, nextUnlock, hashId, parseDelimited, wordIndex, rowToSentence, newRecord, sameBag };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else global.TrakiaCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
