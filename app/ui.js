// @ts-check
(function () {
'use strict';
const C = window.TrakiaCore, DATA = window.TRAKIA_DATA;
/** Element by id (every id used here exists in index.html). See AppElement in types.d.ts.
 * @type {(id: string) => AppElement} */
const $ = id => /** @type {any} */ (document.getElementById(id));
/** First element under `root` matching `sel` (must exist). @type {(root: ParentNode, sel: string) => AppElement} */
const q = (root, sel) => /** @type {any} */ (root.querySelector(sel));
/** Closest ancestor of an event's target matching `sel`, or null. @type {(e: Event, sel: string) => AppElement | null} */
const closest = (e, sel) => /** @type {any} */ (e.target instanceof Element ? e.target.closest(sel) : null);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- storage ----------
const LS = {
  get(k, d) { try { const v = localStorage.getItem('trakia.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('trakia.' + k, JSON.stringify(v)); } catch (e) { toast('Could not save (storage full or blocked)'); } },
};
const DEFAULTS = { rank: DATA.learnedRank || 0, tolerance: 0, sessionSize: 20, newPerSession: 10, directions: 'gated', newOrder: 'mixed', lang: 'nl', typoPct: 10, bagOfWords: true, almostPolicy: 'staged', almostFreePasses: 2, retention: 0.9, maxInterval: 365, stage: 1, strictPunct: false, strictYi: false, stripAccents: true, strictForms: true, translit: false, theme: 'auto', dirRun: 1, wallpaper: 'none', wallpaperUrl: '', wallpaperDim: 55 };
let settings = Object.assign({}, DEFAULTS, LS.get('settings', {}));
let progress = LS.get('progress', {});
(function migrate() { let n = 0; for (const k in progress) if (progress[k] && progress[k].s == null) { progress[k] = C.migrateRecord(progress[k]); n++; } if (n) { try { localStorage.setItem('trakia.progress', JSON.stringify(progress)); } catch (e) {} } })();
let userAlts = LS.get('userAlts', {});
let userSentences = LS.get('userSentences', {});
let deleted = LS.get('deleted', []);
let log = LS.get('log', []);            // [ts, key, score 2|1|0, free 0|1, effective score, rating]
let sessions = LS.get('sessions', []);  // [startTs]
let drills = LS.get('drills', {});       // {itemId: {ok, bad, last}}
let drillLog = LS.get('drillLog', []);   // [ts, itemId, score 2|1|0]
/** @type {Snapshot['stamps']} */ let stamps = LS.get('stamps', {});   // when shared settings / the deleted list last changed, last full reset (D-025)
/** @type {Record<string, number>} */ let cleared = LS.get('cleared', {});   // per-card resets, so a sync does not bring them back
/** @type {Record<string, ReadingRecord>} */ let reading = LS.get('reading', {});   // stories read, quiz scores (D-026, D-028)
/** @type {Record<string, DaySummary>} */ let dayTotals = LS.get('days', {});   // totals of the days older than the last 30 (D-029)
/** @type {Record<string, {at: number, ok: boolean}>} */ let peeks = LS.get('peeks', {});   // words guessed in a sneak peek, by rank (D-031)
let sharedNow = JSON.stringify(C.sharedSettings(settings)), deletedNow = JSON.stringify(deleted);
const save = {
  settings: () => { const sh = JSON.stringify(C.sharedSettings(settings)); if (sh !== sharedNow) { sharedNow = sh; stamps.settings = Date.now(); LS.set('stamps', stamps); } LS.set('settings', settings); },
  progress: () => LS.set('progress', progress), userAlts: () => LS.set('userAlts', userAlts),
  userSentences: () => LS.set('userSentences', userSentences), deleted: () => { const dn = JSON.stringify(deleted); if (dn !== deletedNow) { deletedNow = dn; stamps.deleted = Date.now(); LS.set('stamps', stamps); } LS.set('deleted', deleted); }, log: () => LS.set('log', log), sessions: () => LS.set('sessions', sessions), drills: () => LS.set('drills', drills), drillLog: () => LS.set('drillLog', drillLog), reading: () => LS.set('reading', reading), days: () => LS.set('days', dayTotals), peeks: () => LS.set('peeks', peeks),
};
// fold answers older than 30 days into day totals (D-029)
(function compactAtLoad() {
  const c = C.compactHistory({ log, drillLog, sessions, days: dayTotals }, Date.now());
  if (c.log.length === log.length && c.drillLog.length === drillLog.length && c.sessions.length === sessions.length) return;
  log = c.log; drillLog = c.drillLog; sessions = c.sessions; dayTotals = c.days;
  save.log(); save.drillLog(); save.sessions(); save.days();
})();
const WORDS = DATA.words, WIDX = C.wordIndex(WORDS), GRAMMAR = DATA.grammar, ASPECTS = C.aspectPairs(WORDS);
const WORD_BY_RANK = new Map(WORDS.map(w => [w.rank, w]));

function allSentences() {
  const del = new Set(deleted), out = [];
  for (const s of DATA.sentences) if (!del.has(s.id) && !userSentences[s.id]) out.push(s);
  for (const id in userSentences) if (!del.has(id)) out.push(userSentences[id]);
  return out;
}
let SENT = allSentences(), SENT_BY_ID = new Map(SENT.map(s => [s.id, s])), LEMMA_COUNT = countLemmas(SENT);
function refreshSentences() { SENT = allSentences(); SENT_BY_ID = new Map(SENT.map(s => [s.id, s])); LEMMA_COUNT = countLemmas(SENT); VOCAB = buildVocab(); }
// known word forms per language, so the checker can tell a wrong word form from a typo (D-014)
function buildVocab() {
  /** @type {Record<string, string[]>} */ const extra = { bg: C.drillItems(GRAMMAR).flatMap(it => it.answers), nl: [], en: [] };
  for (const k in userAlts) { const K = C.parseKey(k); (extra[K.toBg ? 'bg' : K.lang] || []).push(...userAlts[k]); }
  return C.vocabulary(SENT, WORDS, extra);
}
let VOCAB = buildVocab();
function countLemmas(list) { const m = new Map(); for (const s of list) for (const l of new Set((s.lemmas || []).map(x => C.normalise(x.split('#')[0], 'bg')))) m.set(l, (m.get(l) || 0) + 1); return m; }
function onlyHere(s) { return (s.lemmas || []).map(x => C.normalise(x.split('#')[0], 'bg')).filter(l => !C.STOP.has(l) && LEMMA_COUNT.get(l) === 1); }

function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200); }
const darkQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
/** is the dark palette showing (forced, or System on a dark device)? */
const isDark = () => settings.theme === 'dark' || (settings.theme !== 'light' && !!darkQuery && darkQuery.matches);
function applyTheme() {
  const t = settings.theme === 'auto' ? '' : settings.theme;
  document.documentElement.dataset.theme = t;
  // the browser bar takes the header colour: per scheme when the theme is System, the forced one otherwise
  document.querySelectorAll('meta[name=theme-color]').forEach(m => m.setAttribute('content', (t || m.getAttribute('data-scheme')) === 'dark' ? '#16171a' : '#ffffff'));
  const label = isDark() ? 'Switch to light mode' : 'Switch to dark mode';   // the icon itself is chosen by CSS
  for (const id of ['btn-theme', 'btn-theme-m']) { const b = $(id); b.setAttribute('aria-label', label); b.title = label; }
}
// light/dark switch in the top bar (D-016): stores the opposite of what is showing; Settings → Theme can go back to System
function toggleTheme() { settings.theme = isDark() ? 'light' : 'dark'; save.settings(); applyTheme(); $('set-theme').value = settings.theme; }
for (const id of ['btn-theme', 'btn-theme-m']) {
  $(id).addEventListener('click', toggleTheme);
  $(id).addEventListener('mousedown', e => e.preventDefault());   // keep the focus (and the phone keyboard) in the answer field
}
if (darkQuery) darkQuery.addEventListener('change', applyTheme);
const LANG_NAME = { nl: 'Dutch', en: 'English' }, LANG_CODE = { nl: 'NL', en: 'EN' };
function dirLabel(dir) { const k = C.parseKey('x|' + dir); return k.toBg ? `${LANG_CODE[k.lang] || k.lang.toUpperCase()} → BG` : `BG → ${LANG_CODE[k.lang] || k.lang.toUpperCase()}`; }
function otherText(s) { const L = C.langFor(s.id, settings); return { lang: L, text: s[L] || s.nl, alts: s[L + '_alt'] || [] }; }
/** the collapsible "other accepted answers" list; looser translations (D-014) last, marked ≈ */
function renderAlts(list, loose) {
  const el = $('alts'), n = list.length + (loose || []).length;
  if (!n) { el.hidden = true; el.open = false; q(el, 'ul').innerHTML = ''; return; }
  el.hidden = false;
  q(el, 'summary').textContent = n === 1 ? '1 other accepted answer' : `${n} other accepted answers`;
  q(el, 'ul').innerHTML = list.map(a => `<li>${esc(a)}</li>`).join('') + (loose || []).map(a => `<li class="loose" title="accepted, but looser than the Bulgarian">≈ ${esc(a)}</li>`).join('');
  el.open = false;   // every card starts collapsed (D-021)
}
function fitAnswer() { const a = $('answer'); a.style.height = 'auto'; a.style.height = (a.scrollHeight + a.offsetHeight - a.clientHeight) + 'px'; }
const dayKey = C.dayKey;
function fmtDays(d) { if (d == null) return '–'; if (d < 1) return Math.round(d * 24) + ' h'; return (d < 10 ? d.toFixed(1) : Math.round(d)) + ' d'; }
function fmtAgo(ms) { if (ms < 60e3) return 'now'; if (ms < 3600e3) return Math.round(ms / 60e3) + ' min'; if (ms < 86400e3) return Math.round(ms / 3600e3) + ' h'; return Math.round(ms / 86400e3) + ' d'; }

// ---------- tabs ----------
/** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('nav button')).forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
function showTab(name) {
  /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('nav button')).forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
  if (name === 'practise') renderHome(); if (name === 'reading') { closeStory(); renderReading(); } if (name === 'grammar') renderGrammar(); if (name === 'stats') renderStats(); if (name === 'library') renderLibrary(true); if (name === 'settings') renderSettings();
  syncRunning(); window.scrollTo(0, 0);
}
// phones: while a text field has focus the on-screen keyboard is up, so the tab bar steps aside (CSS, D-015)
const isTypingField = el => el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && /^(text|search|number|password)$/.test(el.type));
document.addEventListener('focusin', e => document.body.classList.toggle('typing', isTypingField(e.target)));
document.addEventListener('focusout', () => setTimeout(() => document.body.classList.toggle('typing', isTypingField(document.activeElement)), 0));

// ---------- practise ----------
let session = null;   // {queue:[{key, retry}], i, free, counts:{correct,almost,wrong}, pending}
function renderHome() {
  const now = Date.now();
  const elig = SENT.filter(s => C.eligible(s, settings));
  let due = 0, seen = 0;
  for (const s of SENT) for (const k of C.cardKeys(s, progress, settings)) { const p = progress[k]; if (p) { seen++; if (p.due <= now) due++; } }
  const today = dayKey(now), todayLog = log.filter(l => dayKey(l[0]) === today), todaySessions = sessions.filter(t => dayKey(t) === today).length;
  const unseenElig = elig.reduce((n, s) => n + C.cardKeys(s, progress, settings).filter(k => !progress[k]).length, 0);
  $('home-stats').innerHTML = stat(due, 'due now') + stat(unseenElig, 'new available') + stat(todayLog.length, 'answers today') + stat(todaySessions, 'sessions today');
  const next = C.nextUnlock(SENT, settings);
  $('home-summary').innerHTML = `${elig.length} of ${SENT.length} sentences fit your Anki position (word ${settings.rank}${settings.tolerance ? ' + ' + settings.tolerance : ''}) and grammar stage ${settings.stage || 5}; practising in ${settings.lang === 'mixed' ? 'Dutch and English (mixed)' : LANG_NAME[settings.lang] || 'Dutch'}; ${seen} cards seen.` + (next ? ` Next unlock at word ${next.max_rank}: <b>${esc(WORD_BY_RANK.get(next.max_rank)?.bg || '')}</b>.` : '');
  $('hdr-rank').textContent = 'word ' + settings.rank + ' · stage ' + (settings.stage || 5);
  $('btn-start').textContent = due || unseenElig ? 'Practise' : 'Free practice';
}
const stat = (v, label) => `<div class="stat"><b>${v}</b><span>${label}</span></div>`;

function startSession(opts) {
  opts = opts || {};
  let queue, free;
  if (opts.keys) { queue = opts.keys; free = true; }
  else if (opts.free) { const b = C.buildSession(SENT, progress, Object.assign({}, settings, { sessionSize: 0, freeSize: settings.sessionSize }), Date.now()); queue = b.queue; free = true; if (!queue.length) { toast('Nothing to practise yet — start a normal session first'); return; } }
  else { const b = C.buildSession(SENT, progress, settings, Date.now()); queue = b.queue; free = b.free; }
  if (!queue.length) { toast('No sentences available — raise your Anki position in Settings'); return; }
  session = { queue: queue.map(k => ({ key: k })), i: 0, free, counts: { correct: 0, almost: 0, wrong: 0 }, pending: null, started: Date.now() };
  sessions.push(session.started); save.sessions();
  $('session-home').hidden = true; $('session-done').hidden = true; $('session-run').hidden = false;
  renderCard();
}
function cardOf(item) { const [id, dir] = item.key.split('|'); return { id, dir, s: SENT_BY_ID.get(id) }; }

// ---------- practise card chrome (D-015) ----------
const VERDICT = { correct: '✓ Correct', almost: '≈ Almost', wrong: '✕ Not quite', revealed: '→ Answer' };
/** colour state of the card, answer border and result bar: idle, correct, almost, wrong or revealed */
function setState(st) { $('run-card').dataset.state = st; }
/** body.running while a session is on screen: phones then swap the top bar for the session row */
function syncRunning() { document.body.classList.toggle('running', !!session && !$('session-run').hidden && $('tab-practise').classList.contains('active')); }
const narrow = () => typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches;
/** one segment per queued card (done / current / to do); a long queue becomes one continuous bar */
function renderProgress() {
  const n = session.queue.length, i = session.i;
  const html = n <= 30 ? session.queue.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'cur' : ''}"></i>`).join('')
    : /** @type {[string, number][]} */ ([['done', i], ['cur', 1], ['', n - i - 1]]).filter(x => x[1] > 0).map(([c, f]) => `<i class="${c}" style="flex:${f}"></i>`).join('');
  for (const id of ['segs', 'segs-m']) { const el = $(id); el.innerHTML = html; el.setAttribute('aria-valuemin', '0'); el.setAttribute('aria-valuemax', String(n)); el.setAttribute('aria-valuenow', String(i)); }
  $('counter').textContent = `${i + 1} of ${n}`; $('counter-m').textContent = `${i + 1}/${n}`;
}
/** direction / free practice / retry chips: above the card on wide screens, inside it on phones */
function renderChips(label, free, retry) {
  $('dir-badge').textContent = label; $('free-badge').hidden = !free; $('retry-badge').hidden = !retry;
  $('chips-m').innerHTML = $('chips-d').innerHTML.replace(/ id="[^"]*"/g, '');
}
/** the expected sentence, with the words that differ from what was typed highlighted and extra typed words struck through */
function renderExpected(text, typed, highlight) {
  $('expected').innerHTML = highlight ? C.wordMarks(typed, text).map(x => x.extra ? `<del title="extra word">${esc(x.w)}</del>` : x.miss ? `<mark>${esc(x.w)}</mark>` : esc(x.w)).join(' ') : esc(text);
}
/** highlighted words: missing from the typed answer, or typed in excess (D-019) */
const markCount = (typed, text) => C.wordMarks(typed, text).filter(x => x.miss || x.extra).length;

// ---------- grammar drills (D-009) ----------
function startDrill(cardFilter) {
  const items = C.buildDrill(GRAMMAR, settings, drills, 15, Math.random, cardFilter);
  if (!items.length) { toast('No drill items for this stage'); return; }
  session = { drill: true, queue: items.map(it => ({ key: 'drill|' + it.id, item: it })), i: 0, free: false, counts: { correct: 0, almost: 0, wrong: 0 }, pending: null, started: Date.now(), label: cardFilter ? (GRAMMAR.cards.find(c => c.id === cardFilter) || {}).title : null };
  $('session-home').hidden = true; $('session-done').hidden = true; $('session-run').hidden = false;
  renderCard();
}
function renderDrillCard() {
  const item = session.queue[session.i].item;
  session.pending = null;
  renderProgress(); renderChips('Grammar drill', false, false); setState('idle'); syncRunning();
  $('prompt').textContent = item.prompt; $('prompt').lang = 'bg';
  $('newwords').innerHTML = `<span class="hint">${esc(item.hint)}</span>`;
  const inp = $('answer'); inp.value = ''; inp.style.height = ''; inp.lang = 'bg'; inp.placeholder = 'Въведи формата';
  $('translit-preview').hidden = !settings.translit; $('translit-preview').textContent = '';
  $('feedback').hidden = true; $('answer-actions').hidden = false; inp.disabled = false;
  setTimeout(() => inp.focus(), 50);
}
function checkDrill(giveUp) {
  const item = session.queue[session.i].item;
  const typed = giveUp ? '' : (settings.translit ? C.translit($('answer').value) : $('answer').value);
  const r = giveUp ? { result: 'wrong', expected: item.answers[0], t: '', a: C.normalise(item.answers[0], 'bg', settings), reason: 'skip' } : C.check(typed, item.answers, 'bg', Object.assign({}, settings, { bagOfWords: false, vocab: VOCAB.bg }));
  session.pending = { result: r.result, typed, key: item.id };
  const state = giveUp ? 'revealed' : r.result, shown = r.expected || item.answers[0], highlight = !giveUp && markCount(typed, shown) > 0;
  $('answer').disabled = true; setState(state);
  $('answer-actions').hidden = true; $('feedback').hidden = false;
  const v = $('verdict'); v.className = 'verdict ' + r.result; v.textContent = VERDICT[state];
  $('verdict-note').innerHTML = r.reason === 'typo' ? `${r.dist} character${r.dist > 1 ? 's' : ''} off` : r.reason === 'form' ? slipText(r.slips) : giveUp ? '' : r.result === 'wrong' ? 'Differences highlighted' : highlight ? 'Accepted — small differences highlighted' : '';
  $('expected-label').hidden = true;
  renderExpected(shown, typed, highlight);
  const others = item.answers.filter(a => a !== shown);
  renderAlts(others);
  const card = GRAMMAR.cards.find(c => c.id === item.card);
  $('gloss').innerHTML = card ? `See: <a href="#" data-gcard="${esc(card.id)}">${esc(card.title)}</a>` : '';
  $('btn-accept').hidden = true;
  setTimeout(() => $('btn-next').focus(), 30);
}
function nextDrill() {
  const p = session.pending; if (!p) return;
  const t = drills[p.key] || { ok: 0, bad: 0 };
  if (p.result === 'wrong') t.bad += 1; else t.ok += 1;
  t.last = Date.now(); drills[p.key] = t;
  drillLog.push([Date.now(), p.key, p.result === 'correct' ? 2 : p.result === 'almost' ? 1 : 0]);
  save.drills(); save.drillLog();
  session.counts[p.result]++;
  session.i++; renderCard();
}
$('answer').addEventListener('input', e => {
  const a = $('answer');
  if (/[\r\n]/.test(a.value)) {
    const it = /** @type {InputEvent} */ (e).inputType; const typedEnter = it === 'insertLineBreak' || it === 'insertParagraph' || (!it && /[\r\n]$/.test(a.value));
    const pos = a.selectionStart ?? a.value.length; a.value = a.value.replace(/[\r\n]+/g, typedEnter ? '' : ' ').trimEnd(); a.selectionStart = a.selectionEnd = Math.min(pos, a.value.length);
    if (typedEnter && session) { if (session.pending) next(); else checkAnswer(false); return; }   // keyboards that insert a line break instead of sending Enter
  }
  fitAnswer();
});
$('gloss').addEventListener('click', e => { const a = closest(e, '[data-gcard]'); if (!a) return; e.preventDefault(); showTab('grammar'); const el = $('gcard-' + a.dataset.gcard); if (el) { el.open = true; el.scrollIntoView({ block: 'start' }); } });
function allAccepted(s, dir, key) { return C.acceptedFor(s, dir).concat(userAlts[key] || []); }

function renderCard() {
  if (!session || session.i >= session.queue.length) return endSession();
  if (session.drill) return renderDrillCard();
  const item = session.queue[session.i], { dir, s } = cardOf(item), K = C.parseKey(item.key);
  if (!s) { session.i++; return renderCard(); }
  session.pending = null;
  renderProgress(); renderChips(dirLabel(dir), session.free, !!item.retry); setState('idle'); syncRunning();
  $('prompt').textContent = K.toBg ? (s[K.lang] || s.nl) : s.bg; promptSource = null; if (popFor) hideWordPop();
  $('prompt').lang = K.toBg ? K.lang : 'bg';
  const chips = (s.lemmas || []).map(l => { const hit = WIDX.get(C.normalise(l.split('#')[0], 'bg')); return hit && hit.rank > settings.rank ? `<span class="chip" title="rank ${hit.rank}">${esc(hit.bg)} – ${esc(hit.en)}</span>` : ''; }).join('');
  $('newwords').innerHTML = chips ? '<span class="tiny">new:</span>' + chips : '';
  const inp = $('answer'); inp.value = ''; inp.style.height = ''; inp.lang = K.toBg ? 'bg' : K.lang;
  const L = LANG_NAME[K.lang] || 'Dutch';
  inp.placeholder = K.toBg ? 'Въведи превод' : narrow() ? `Type in ${L}` : `Type the ${L} translation`;
  $('translit-preview').hidden = !(settings.translit && K.toBg); $('translit-preview').textContent = '';
  $('feedback').hidden = true; $('answer-actions').hidden = false; inp.disabled = false;
  setTimeout(() => inp.focus(), 50);
}
function toBgCard() { const it = session && session.queue[session.i]; return !!(it && !session.drill && C.parseKey(it.key).toBg); }
function typedValue() { const v = $('answer').value; return settings.translit && toBgCard() ? C.translit(v) : v; }
$('answer').addEventListener('input', () => { if (!session || session.drill) return; if (settings.translit && toBgCard()) $('translit-preview').textContent = C.translit($('answer').value); });
// Enter checks, and continues once the result shows. The field's own handler stops the event, so the
// document handler below cannot see the same keypress again after checking disables the field; a held key does not repeat.
$('answer').addEventListener('keydown', e => { if (e.key !== 'Enter') return; e.preventDefault(); e.stopPropagation(); if (e.repeat || !session) return; if (session.pending) next(); else checkAnswer(false); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !session || !session.pending || e.repeat) return;
  const a = document.activeElement;   // other buttons, the alternatives toggle and links keep their own Enter;
  // a tapped prompt word (D-030) does not, so Enter still moves on after a lookup
  if (a && a !== $('btn-next') && a !== $('answer') && !a.matches('button.w') && a.matches('button, summary, a, input, select, textarea')) return;
  e.preventDefault(); next();
});
// Check and Don't know do not take the focus from the answer field: on a phone that would close the keyboard,
// bring the tab bar back and move the button away under the finger before the tap lands
$('answer-actions').addEventListener('mousedown', e => e.preventDefault());
$('btn-check').addEventListener('click', () => checkAnswer(false));
$('btn-dontknow').addEventListener('click', () => checkAnswer(true));
$('btn-next').addEventListener('click', next);
$('btn-accept').addEventListener('click', acceptMine);
$('btn-quit').addEventListener('click', endSession);
$('btn-quit-m').addEventListener('click', endSession);
$('btn-start').addEventListener('click', () => startSession());
$('btn-free').addEventListener('click', () => startSession({ free: true }));
$('btn-gdrill').addEventListener('click', () => startDrill());
$('btn-gdrill-all').addEventListener('click', () => { showTab('practise'); startDrill(); });
$('btn-again').addEventListener('click', () => { if (lastWasDrill) startDrill(); else startSession(); });
$('btn-home').addEventListener('click', () => { $('session-done').hidden = true; $('session-home').hidden = false; renderHome(); });

function checkAnswer(giveUp) {
  if (session.drill) return checkDrill(giveUp);
  const item = session.queue[session.i], { dir, s } = cardOf(item), key = item.key, K = C.parseKey(key);
  const lang = K.toBg ? 'bg' : K.lang;
  const typed = giveUp ? '' : typedValue();
  const accepted = allAccepted(s, dir, key), loose = C.looseFor(s, dir);
  const r = giveUp ? { result: 'wrong', expected: accepted[0], t: '', a: C.normalise(accepted[0], lang, settings), reason: 'skip' } : C.check(typed, accepted, lang, Object.assign({}, settings, { vocab: VOCAB[lang] }), loose);
  const outcome = r.result === 'almost' ? C.almostOutcome(progress[key], r.reason, settings) : null;
  session.pending = { result: r.result, typed, key, reason: r.reason, outcome };
  showFeedback(r, s, dir, accepted, giveUp, outcome, loose);
}
/** "different word form: sundays → sunday · missing: the" for the form slips of a D-014 check */
function slipText(slips) {
  return 'different word form: ' + (slips || []).map(([t, a]) => !t ? `missing “${esc(a)}”` : !a ? `extra “${esc(t)}”` : `${esc(t)} → ${esc(a)}`).join(' · ');
}
function showFeedback(r, s, dir, accepted, giveUp, outcome, loose) {
  const K = C.parseKey(session.queue[session.i].key), lang = K.toBg ? 'bg' : K.lang, typed = session.pending ? session.pending.typed : '';
  const state = giveUp ? 'revealed' : r.result;
  $('answer').disabled = true; setState(state);
  $('answer-actions').hidden = true; $('feedback').hidden = false;
  // now the Bulgarian prompt may be looked up word by word, never before the answer (D-030)
  if (!K.toBg && s.words) { promptSource = { words: s.words, vocative: s.vocative }; $('prompt').innerHTML = storyHtml(s.bg, promptSource); }
  // a looser translation (D-014) is accepted, but the expected line shows the closest exact one, highlighted against what was typed
  const closer = r.loose && r.closer && r.result !== 'wrong' ? r.closer : '';
  let shown = closer || r.expected || accepted[0];
  // several accepted answers can normalise alike (contractions, case): show the one closest to the typed words
  if (r.result === 'correct' && !closer) { const same = accepted.filter(a => C.normalise(a, lang, settings) === r.a); if (same.length > 1) shown = same.reduce((b, a) => markCount(typed, a) < markCount(typed, b) ? a : b); }
  const highlight = !giveUp && markCount(typed, shown) > 0;
  const v = $('verdict'); v.className = 'verdict ' + r.result;
  v.innerHTML = VERDICT[state] + (r.loose && r.result !== 'wrong' ? ' <span class="loose-tag" title="Accepted, but this translation is looser than the Bulgarian. The line below is the exact translation.">≈ looser</span>' : '');
  const how = r.reason === 'typo' ? `${r.dist} character${r.dist > 1 ? 's' : ''} off` : r.reason === 'order' ? 'same words, different order' : '';
  const rule = !outcome ? '' : outcome.rule === 'free-pass' ? ` · counted as correct (free pass ${outcome.used} of ${outcome.passes} on a young card)` : outcome.rule === 'lapse' ? ' · this card is mature, so it goes back for review' : outcome.rule === 'strict' ? ' · strict mode: scheduled as wrong' : ' · counted as Hard';
  // D-006: short explanations; a slip that a note explains leaves the plain "different word form" line
  const notes = r.result === 'correct' || giveUp ? [] : C.explain(r.t, r.a, lang, { vocab: VOCAB[lang], aspects: ASPECTS });
  const covered = new Set(notes.map(n => n.pair.join('\u0000'))), slips = (r.slips || []).filter(p => !covered.has(p.join('\u0000')));
  $('notes').innerHTML = notes.map(n => `<li class="n-${n.kind}">${esc(n.note)}</li>`).join(''); $('notes').hidden = !notes.length;
  $('verdict-note').innerHTML = r.result === 'almost' ? how + (session.free ? '' : rule) : r.reason === 'form' ? (slips.length ? slipText(slips) : '') : giveUp || closer ? '' : r.result === 'wrong' ? 'Differences highlighted' : highlight ? 'Accepted — small differences highlighted' : '';
  $('expected-label').hidden = !closer;
  renderExpected(shown, typed, highlight);
  renderAlts(accepted.filter(a => a !== shown), (loose || []).filter(a => a !== shown && a !== r.expected));
  $('gloss').textContent = s.max_rank ? 'rank ' + s.max_rank + (s.rank_estimated ? ' ≈' : '') : '';
  $('btn-accept').hidden = r.result === 'correct' || giveUp;
  setTimeout(() => $('btn-next').focus(), 30);
}
function acceptMine() {
  const p = session.pending; if (!p || !p.typed.trim()) return;
  (userAlts[p.key] = userAlts[p.key] || []).push(p.typed.trim()); save.userAlts(); VOCAB = buildVocab();
  p.result = 'correct'; setState('correct'); $('verdict').className = 'verdict correct'; $('verdict').textContent = '✓ Accepted as correct'; $('verdict-note').textContent = 'added to your accepted answers';
  $('btn-accept').hidden = true; toast('Saved as an accepted answer');
}
function next() {
  const p = session.pending; if (!p) return;
  if (session.drill) return nextDrill();
  const item = session.queue[session.i];
  const effective = p.result === 'almost' && p.outcome ? p.outcome.rating : p.result;
  progress[p.key] = C.applyResult(progress[p.key], p.result, Date.now(), session.free, undefined, p.reason, settings);
  log.push([Date.now(), p.key, p.result === 'correct' ? 2 : p.result === 'almost' ? 1 : 0, session.free ? 1 : 0, effective === 'correct' ? 2 : effective === 'almost' ? 1 : 0, progress[p.key].rating || 0]);
  save.progress(); save.log();
  session.counts[p.result]++;
  if (effective === 'wrong' && !item.retry) {
    // with keyboard blocks (D-021) a retry joins the retries typed on the same keyboard
    let at = session.queue.length;
    if ((settings.dirRun || 1) > 1) { const kb = C.parseKey(p.key).toBg; for (let j = session.queue.length - 1; j > session.i; j--) { const q = session.queue[j]; if (q.retry && C.parseKey(q.key).toBg === kb) { at = j + 1; break; } } }
    session.queue.splice(at, 0, { key: p.key, retry: true });
  }
  session.i++; renderCard();
}
let lastWasDrill = false;
function endSession() {
  if (!session) return;
  lastWasDrill = !!session.drill;
  const c = session.counts, total = c.correct + c.almost + c.wrong;
  $('session-run').hidden = true; $('session-done').hidden = false;
  $('done-stats').innerHTML = stat(c.correct, '✓ correct') + stat(c.almost, '≈ almost') + stat(c.wrong, '✗ wrong') + stat(total ? Math.round(100 * (c.correct + c.almost) / total) + '%' : '–', 'accuracy');
  $('done-summary').textContent = total ? `${total} answers in ${Math.max(1, Math.round((Date.now() - session.started) / 60e3))} min.` + (session.drill ? ' Grammar drill: counted on the Stats tab, no review cards created.' : session.free ? ' Free practice never moves cards forward; a wrong answer still sends a card back.' : '') : 'No answers recorded.';
  $('btn-again').textContent = session.drill ? 'Drill again' : 'Practise again';
  session = null; syncRunning(); sync();
}

// ---------- grammar tab ----------
function renderGrammar() {
  const stage = settings.stage || 5, names = { 1: 'Stage 1 — present tense', 2: 'Stage 2 — future and imperatives', 3: 'Stage 3 — past tense and perfect', 4: 'Stage 4 — imperfect and conditional' };
  let html = '';
  for (const st of [1, 2, 3, 4]) {
    const cards = GRAMMAR.cards.filter(c => c.stage === st); if (!cards.length) continue;
    html += `<div class="stage-h">${names[st]}${st > stage ? ' · beyond your stage' : ''}</div>`;
    for (const c of cards) {
      const ex = (c.examples || []).map(id => SENT_BY_ID.get(id)).filter(Boolean);
      html += `<details class="card gcard" id="gcard-${esc(c.id)}"${st <= stage ? ' open' : ''}><summary>${esc(c.title)}${st > stage ? ' <span class="badge">stage ' + st + '</span>' : ''}</summary>
        <p class="muted">${esc(c.intro)}</p>
        <table class="fixed"><tr>${c.table.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${c.table.rows.map(r => `<tr>${r.map(x => `<td lang="bg">${esc(x)}</td>`).join('')}</tr>`).join('')}</table>
        ${c.notes && c.notes.length ? `<ul class="muted" style="padding-left:18px;margin:6px 0">${c.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
        ${ex.length ? `<p class="label">From the sentences</p><ul class="ex">${ex.map(s => `<li><span lang="bg">${esc(s.bg)}</span><span class="sub tiny" lang="nl">${esc(s.nl)}</span></li>`).join('')}</ul>` : ''}
        <div class="row"><button class="btn small" data-drill="${esc(c.id)}">Drill this table</button></div>
      </details>`;
    }
  }
  $('grammar-cards').innerHTML = html;
}
$('grammar-cards').addEventListener('click', e => { const b = closest(e, '[data-drill]'); if (!b) return; const id = b.dataset.drill; showTab('practise'); startDrill(id); });

// ---------- stats ----------
function renderStats() {
  const now = Date.now(), today = dayKey(now);
  const byDay = {};
  for (const l of log) { const k = dayKey(l[0]); (byDay[k] = byDay[k] || [0, 0, 0])[l[2]]++; }
  for (const k in dayTotals) { const a = dayTotals[k].a; if (a) byDay[k] = [0, 1, 2].map(i => Math.max((byDay[k] || [0, 0, 0])[i], a[i])); }   // older days as totals (D-029)
  const t = byDay[today] || [0, 0, 0], tot = t[0] + t[1] + t[2];
  let streak = 0; for (let d = 0; ; d++) { const k = dayKey(now - d * 86400e3); if (byDay[k]) streak++; else if (d === 0) continue; else break; if (d > 3650) break; }
  const ms = log.filter(l => dayKey(l[0]) === today).map(l => l[0]);
  let minutes = 0; for (let i = 1; i < ms.length; i++) { const gap = ms[i] - ms[i - 1]; if (gap < 5 * 60e3) minutes += gap; }
  $('stats-today').innerHTML = stat(tot, 'answers') + stat(tot ? Math.round(100 * (t[2] + t[1]) / tot) + '%' : '–', 'accuracy') + stat(sessions.filter(s => dayKey(s) === today).length, 'sessions') + stat(Math.round(minutes / 60e3), 'minutes') + stat(streak, 'day streak');
  // chart data
  const days = []; for (let d = 13; d >= 0; d--) { const k = dayKey(now - d * 86400e3); days.push({ k, label: k.slice(5), v: byDay[k] || [0, 0, 0] }); }
  drawChart(days);
  renderReadingStats();
  $('chart-table').innerHTML = '<tr><th>day</th><th>✓</th><th>≈</th><th>✗</th></tr>' + days.map(d => `<tr><td>${d.k}</td><td>${d.v[2]}</td><td>${d.v[1]}</td><td>${d.v[0]}</td></tr>`).join('');
  // grammar drills
  const dToday = drillLog.filter(l => dayKey(l[0]) === today), dTot = dToday.length, dOk = dToday.filter(l => l[2] > 0).length;
  const dOld = Object.values(dayTotals).map(d => d.d || [0, 0, 0]);
  const dAll = drillLog.length + dOld.reduce((n, d) => n + d[0] + d[1] + d[2], 0), dAllOk = drillLog.filter(l => l[2] > 0).length + dOld.reduce((n, d) => n + d[1] + d[2], 0);
  $('stats-drills').innerHTML = stat(dTot, 'drill answers today') + stat(dTot ? Math.round(100 * dOk / dTot) + '%' : '–', 'accuracy today') + stat(dAll, 'all time') + stat(dAll ? Math.round(100 * dAllOk / dAll) + '%' : '–', 'accuracy all time');
  const items = Object.fromEntries(C.drillItems(GRAMMAR, 5).map(it => [it.id, it]));
  const weak = Object.entries(drills).filter(([k, t]) => t.bad > 0 && items[k]).sort((a, b) => (b[1].bad - b[1].ok) - (a[1].bad - a[1].ok) || b[1].bad - a[1].bad).slice(0, 10);
  $('weak-forms').innerHTML = weak.length ? '<colgroup><col><col style="width:40%"><col style="width:60px"><col style="width:60px"></colgroup><tr><th>form</th><th>answer</th><th>wrong</th><th>right</th></tr>' + weak.map(([k, t]) => `<tr><td>${esc(items[k].prompt)} <span class="tiny">${esc(items[k].hint)}</span></td><td lang="bg">${esc(items[k].answers[0])}</td><td>${t.bad}</td><td>${t.ok}</td></tr>`).join('') : '<tr><td class="tiny">No drill mistakes yet.</td></tr>';
  // progress per direction: stability bands
  let html = '';
  const elig = SENT.filter(s => C.eligible(s, settings)).length;
  const curLangs = settings.lang === 'mixed' ? ['nl', 'en'] : [settings.lang || 'nl'];
  const dirsShown = ['bg2nl', 'nl2bg', 'bg2en', 'en2bg'].filter(d => curLangs.includes(C.parseKey('x|' + d).lang) || Object.keys(progress).some(k => k.endsWith('|' + d)));
  for (const dir of dirsShown) {
    const bands = [0, 0, 0, 0]; let seen = 0, dueN = 0, recallSum = 0, recallN = 0;
    for (const k in progress) if (k.endsWith('|' + dir) && SENT_BY_ID.has(k.split('|')[0])) {
      const p = progress[k]; seen++;
      if (p.state !== 'review') bands[0]++; else if (p.s < 7) bands[1]++; else if (p.s < 30) bands[2]++; else bands[3]++;
      if (p.due <= now) { dueN++; if (p.state === 'review') { recallSum += C.recallNow(p, now, settings); recallN++; } }
    }
    const avg = recallN ? Math.round(100 * recallSum / recallN) + ' %' : '–';
    html += `<p style="margin:6px 0 2px"><b>${dirLabel(dir).replace('BG', 'Bulgarian').replace('NL', 'Dutch').replace('EN', 'English')}</b> <span class="tiny">${seen} seen of ${elig} eligible · ${dueN} due now · predicted recall of due cards ${avg}</span></p>`;
    html += `<div class="bar">${['var(--almost)', 'var(--correct)', 'var(--correct)', 'var(--primary)'].map((c, i) => `<i style="width:${elig ? 100 * bands[i] / elig : 0}%;background:${c};opacity:${i === 1 ? .6 : 1}"></i>`).join('')}</div>`;
    html += `<div class="boxes" style="grid-template-columns:repeat(4,1fr)">${['learning', '< 7 d', '7–30 d', '≥ 30 d'].map((l, i) => `<div><b>${bands[i]}</b>${l}</div>`).join('')}</div>`;
  }
  html += '<p class="tiny">Stability = days until the predicted chance of recalling the sentence drops to 90 %. "Learning" cards are in their short first steps (10 min, 1 h). Scheduling is FSRS-6 with your desired retention (Settings).</p>';
  $('stats-progress').innerHTML = html;
  // hardest
  const hard = Object.entries(progress).filter(([k, p]) => p.lapses > 0 && SENT_BY_ID.has(k.split('|')[0])).sort((a, b) => b[1].lapses - a[1].lapses || (a[1].s || 0) - (b[1].s || 0)).slice(0, 20);
  $('hardest').className = 'fixed'; $('hardest').innerHTML = hard.length ? '<colgroup><col><col style="width:62px"><col style="width:56px"><col style="width:60px"></colgroup><tr><th>sentence</th><th>dir</th><th>lapses</th><th>stab.</th></tr>' + hard.map(([k, p]) => { const [id, dir] = k.split('|'); const s = SENT_BY_ID.get(id); const Kh = C.parseKey(k); return `<tr><td>${esc(Kh.toBg ? (s[Kh.lang] || s.nl) : s.bg)}</td><td>${dirLabel(dir)}</td><td>${p.lapses}</td><td>${p.state === 'review' ? fmtDays(p.s) : 'learn'}</td></tr>`; }).join('') : '<tr><td class="tiny">No lapses yet.</td></tr>';
  $('btn-drill').disabled = !hard.length; $('btn-drill').onclick = () => { showTab('practise'); startSession({ keys: hard.map(h => h[0]) }); };
}
function drawChart(days) {
  const cv = $('chart'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 600, H = 180;
  cv.width = W * dpr; cv.height = H * dpr; const ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return; ctx.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement), col = n => css.getPropertyValue(n).trim();
  const padL = 28, padB = 22, padT = 8, iw = W - padL - 6, ih = H - padB - padT;
  const max = Math.max(5, ...days.map(d => d.v[0] + d.v[1] + d.v[2]));
  ctx.clearRect(0, 0, W, H); ctx.font = '11px ' + col('--sans'); ctx.fillStyle = col('--faint'); ctx.strokeStyle = col('--line'); ctx.lineWidth = 1;
  const steps = max <= 10 ? 5 : 4;
  for (let i = 0; i <= steps; i++) { const y = padT + ih - ih * i / steps, val = Math.round(max * i / steps); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - 6, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(String(val), padL - 6, y + 4); }
  const bw = iw / days.length, gap = Math.min(8, bw * .3), colors = [col('--wrong'), col('--almost'), col('--correct')];
  /** @type {NonNullable<AppElement['_bars']>} */ const bars = []; cv._bars = bars;
  days.forEach((d, i) => {
    const x = padL + i * bw + gap / 2, w = bw - gap; let y = padT + ih; const tot = d.v[0] + d.v[1] + d.v[2];
    [2, 1, 0].forEach(sc => { const h = ih * d.v[sc] / max; if (h > 0) { ctx.fillStyle = colors[sc]; ctx.fillRect(x, y - h, w, Math.max(0, h - 2)); y -= h; } });
    if (i % 2 === 1 || days.length < 8) { ctx.fillStyle = col('--faint'); ctx.textAlign = 'center'; ctx.fillText(d.label, x + w / 2, H - 6); }
    bars.push({ x, w, d, tot });
  });
  /** @param {MouseEvent | TouchEvent} e */
  const hover = e => { const r = cv.getBoundingClientRect(), px = ('touches' in e ? e.touches[0].clientX : e.clientX) - r.left; const b = (cv._bars || []).find(b => px >= b.x - 2 && px <= b.x + b.w + 2); const tip = $('chart-tip'); if (!b) { tip.style.display = 'none'; return; } tip.style.display = 'block'; tip.style.left = (b.x + b.w / 2) + 'px'; tip.style.top = '30px'; tip.textContent = `${b.d.k}: ✓ ${b.d.v[2]}  ≈ ${b.d.v[1]}  ✗ ${b.d.v[0]}`; };
  cv.onmousemove = hover; cv.ontouchstart = hover;
  cv.onmouseleave = () => $('chart-tip').style.display = 'none';
}

// ---------- library ----------
let libShown = 60;
$('lib-filter').addEventListener('change', () => renderLibrary(true)); $('lib-search').addEventListener('input', () => renderLibrary(true));
$('lib-more').addEventListener('click', () => { libShown += 100; renderLibrary(false); });
function renderLibrary(reset) {
  if (reset) libShown = 60;
  const f = $('lib-filter').value, q = C.normalise($('lib-search').value, 'nl');
  const now = Date.now();
  let rows = SENT.filter(s => {
    const keys = ['bg2nl', 'nl2bg', 'bg2en', 'en2bg'].map(d => s.id + '|' + d), seen = keys.some(k => progress[k]);
    if (f === 'eligible' && !C.eligible(s, settings)) return false;
    if (f === 'locked' && (s.max_rank == null || s.max_rank <= settings.rank + (settings.tolerance || 0))) return false;
    if (f === 'stage' && C.grammarOk(s, settings)) return false;
    if (f === 'seen' && !seen) return false;
    if (f === 'unseen' && (seen || !C.eligible(s, settings))) return false;
    if (f === 'imported' && !userSentences[s.id]) return false;
    if (f === 'thin' && !onlyHere(s).length) return false;
    if (q && !(C.normalise(s.bg, 'nl').includes(q) || C.normalise(s.nl, 'nl').includes(q) || C.normalise(s.en || '', 'nl').includes(q) || s.id.toLowerCase().includes(q))) return false;
    return true;
  });
  rows.sort((a, b) => (a.max_rank == null ? 1e9 : a.max_rank) - (b.max_rank == null ? 1e9 : b.max_rank) || a.id.localeCompare(b.id));
  $('lib-count').textContent = rows.length + ' sentences';
  const status = (s, dir) => { const p = progress[s.id + '|' + dir]; if (!p) return '<span class="tiny">–</span>'; const due = p.due <= now ? 'due' : fmtAgo(p.due - now); const m = C.maturity(p); const learning = p.state !== 'review'; const cls = learning && (p.step || 0) === 0 ? 'b0' : m === 'young' ? 'b1' : m === 'established' ? 'b5' : 'b8'; const label = learning ? (p.state === 'relearning' ? 'relearn' : 'learning') : fmtDays(p.s); return `<span class="badge ${cls}" title="${learning ? p.state + ' step ' + (p.step || 0) : 'stability ' + fmtDays(p.s) + ', difficulty ' + (p.d || 0).toFixed(1)}; ${p.due <= now ? 'due now' : 'due in ' + due}">${label}<small> · ${due}</small></span>`; };
  const head = `<tr><th>rank</th><th>sentence</th><th>BG→${settings.lang === 'mixed' ? 'X' : LANG_CODE[settings.lang] || 'NL'}</th><th>${settings.lang === 'mixed' ? 'X' : LANG_CODE[settings.lang] || 'NL'}→BG</th></tr>`;
  $('lib-table').innerHTML = '<colgroup><col style="width:56px"><col><col style="width:70px"><col style="width:70px"></colgroup>' + head + rows.slice(0, libShown).map(s => (() => { const o = otherText(s); return `<tr class="clickable" data-id="${esc(s.id)}"><td>${s.max_rank == null ? '?' : s.max_rank}${s.rank_estimated ? '≈' : ''}</td><td><span lang="bg">${esc(s.bg)}</span><span class="sub" lang="${o.lang}">${esc(o.text)}</span></td><td>${status(s, 'bg2' + o.lang)}</td><td>${status(s, o.lang + '2bg')}</td></tr>`; })()).join('');
  $('lib-more').hidden = rows.length <= libShown;
}
$('lib-table').addEventListener('click', e => {
  const tr = closest(e, 'tr.clickable'); if (!tr) return;
  const open = tr.nextElementSibling && tr.nextElementSibling.classList.contains('lib-row-detail');
  document.querySelectorAll('.lib-row-detail').forEach(x => x.remove());
  if (open) return;
  const s = SENT_BY_ID.get(tr.dataset.id); if (!s) return;
  const ua = ['bg2nl', 'nl2bg', 'bg2en', 'en2bg'].map(d => (userAlts[s.id + '|' + d] || []).map(a => `${d.endsWith('2bg') ? 'BG' : LANG_CODE[d.slice(3)]}: ${esc(a)}`)).flat();
  const det = document.createElement('tr'); det.className = 'lib-row-detail';
  const pr = ['bg2nl', 'nl2bg', 'bg2en', 'en2bg'].map(d => { const p = progress[s.id + '|' + d]; return p ? `${dirLabel(d)}: ${p.state === 'review' ? 'stability ' + fmtDays(p.s) + ', difficulty ' + (p.d || 0).toFixed(1) + ', recall now ' + Math.round(100 * C.recallNow(p, Date.now(), settings)) + ' %' : p.state + ' (step ' + (p.step || 0) + ')'}, ${p.reps} answers, ${p.lapses} lapses${(p.almosts || p.orders) ? `, ${(p.almosts || 0) + (p.orders || 0)} free passes used` : ''}` : null; }).filter(Boolean);
  det.innerHTML = `<td colspan="4">${pr.length ? `<div><b>Progress</b> ${pr.join(' · ')}</div>` : ''}${s.en ? `<div><b>EN</b> ${esc(s.en)}</div>` : ''}${s.nl ? `<div><b>NL</b> ${esc(s.nl)}</div>` : ''}${s.nl_alt.length ? `<div><b>NL also</b> ${s.nl_alt.map(esc).join(' · ')}</div>` : ''}${(s.en_alt || []).length ? `<div><b>EN also</b> ${s.en_alt.map(esc).join(' · ')}</div>` : ''}${(s.nl_loose || []).length ? `<div><b>NL looser</b> ${(s.nl_loose || []).map(esc).join(' · ')}</div>` : ''}${(s.en_loose || []).length ? `<div><b>EN looser</b> ${(s.en_loose || []).map(esc).join(' · ')}</div>` : ''}${s.bg_alt.length ? `<div><b>BG also</b> ${s.bg_alt.map(esc).join(' · ')}</div>` : ''}${(s.bg_alt_en || []).length ? `<div><b>BG also (EN prompt)</b> ${(s.bg_alt_en || []).map(esc).join(' · ')}</div>` : ''}${ua.length ? `<div><b>Yours</b> ${ua.join(' · ')}</div>` : ''}${onlyHere(s).length ? `<div><b>Only here</b> ${onlyHere(s).map(esc).join(', ')} <span class="tiny">(no other sentence uses this word)</span></div>` : ''}${s.grammar && s.grammar.length ? `<div><b>grammar</b> ${s.grammar.map(esc).join(', ')}${C.grammarOk(s, settings) ? '' : ' <span class="tiny">(beyond your stage)</span>'}</div>` : ''}<div><b>lemmas</b> ${(s.lemmas || []).map(esc).join(', ') || '–'} <span class="tiny">· id ${esc(s.id)} · ${esc(s.source || '')}</span></div><div class="row"><button class="btn small" data-act="reset">Reset progress</button><button class="btn small" data-act="delete">Delete sentence</button></div></td>`;
  tr.after(det);
  q(det, '[data-act=reset]').onclick = () => { for (const d of ['bg2nl', 'nl2bg', 'bg2en', 'en2bg']) { const k = s.id + '|' + d; if (progress[k]) cleared[k] = Date.now(); delete progress[k]; } LS.set('cleared', cleared); save.progress(); renderLibrary(false); toast('Progress reset'); };
  q(det, '[data-act=delete]').onclick = () => { deleted.push(s.id); save.deleted(); refreshSentences(); renderLibrary(false); toast('Deleted (restore in Settings)'); };
});

// ---------- import / export ----------
$('import-file').addEventListener('change', async e => {
  const input = /** @type {HTMLInputElement} */ (e.target); const file = input.files && input.files[0]; if (!file) return; input.value = '';
  try {
    let rows;
    if (/\.xlsx?$/i.test(file.name)) {
      if (!window.XLSX) { toast('Loading Excel reader…'); await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = res; s.onerror = () => rej(new Error('Could not load the Excel reader (offline?). Save as CSV instead.')); document.head.appendChild(s); }); }
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }).map(r => { const o = {}; for (const k in r) o[k.trim().toLowerCase()] = r[k]; return o; });
    } else if (/\.json$/i.test(file.name)) {
      const j = JSON.parse(await file.text()); rows = Array.isArray(j) ? j : (j.sentences || []);
    } else rows = C.parseDelimited(await file.text());
    let added = 0, updated = 0, skipped = 0;
    for (const r of rows) { const s = C.rowToSentence(r, WIDX); if (!s) { skipped++; continue; } if (userSentences[s.id] || DATA.sentences.some(x => x.id === s.id)) updated++; else added++; userSentences[s.id] = s; deleted = deleted.filter(d => d !== s.id); }
    save.userSentences(); save.deleted(); refreshSentences(); renderLibrary(true);
    $('import-result').textContent = `${added} added, ${updated} updated, ${skipped} skipped (missing bg or nl).`;
    toast(`Imported ${added + updated} sentences`);
  } catch (err) { $('import-result').textContent = 'Import failed: ' + (err instanceof Error ? err.message : String(err)); }
});
function download(name, obj) { const blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
/** everything that travels between devices (D-025); the sync token is not part of it @returns {Snapshot} */
function snapshot() { return { app: 'trakia', version: 2, settings: C.sharedSettings(settings), progress, userAlts, userSentences, deleted, log, sessions, drills, drillLog, stamps, cleared, reading, days: dayTotals, peeks }; }
/** take over a merged snapshot: this device keeps its own device settings, and no stamp is bumped @param {Snapshot} m */
function applySnapshot(m) {
  m = Object.assign({}, m, C.compactHistory(m, Date.now()));
  settings = Object.assign({}, DEFAULTS, m.settings, Object.fromEntries(C.DEVICE_SETTINGS.filter(k => k in settings).map(k => [k, settings[k]])));
  progress = m.progress; userAlts = m.userAlts; userSentences = m.userSentences; deleted = m.deleted; log = m.log; sessions = m.sessions; drills = m.drills; drillLog = m.drillLog; stamps = m.stamps; cleared = m.cleared; reading = m.reading; dayTotals = m.days; peeks = m.peeks || {};
  sharedNow = JSON.stringify(C.sharedSettings(settings)); deletedNow = JSON.stringify(deleted);
  for (const [k, v] of Object.entries({ settings, progress, userAlts, userSentences, deleted, log, sessions, drills, drillLog, stamps, cleared, reading, days: dayTotals, peeks })) LS.set(k, v);
  refreshSentences();
  // redraw what is on screen, without leaving the tab or the session summary
  const tab = document.querySelector('.tab.active');
  if (tab && tab.id === 'tab-practise') renderHome(); else if (tab && tab.id === 'tab-stats') renderStats(); else if (tab && tab.id === 'tab-library') renderLibrary(false); else if (tab && tab.id === 'tab-settings') renderSettings(); else if (tab && tab.id === 'tab-reading' && $('reading-story').hidden) renderReading();
  $('hdr-rank').textContent = 'word ' + settings.rank + ' · stage ' + (settings.stage || 5);
}
$('btn-export-progress').addEventListener('click', () => download('trakia-progress-' + dayKey(Date.now()) + '.json', Object.assign(snapshot(), { exported: new Date().toISOString() })));
$('import-progress').addEventListener('change', async e => {
  const input = /** @type {HTMLInputElement} */ (e.target); const file = input.files && input.files[0]; if (!file) return; input.value = '';
  try { const j = JSON.parse(await file.text()); if (j.app !== 'trakia') throw new Error('not a Trakia progress file');
    if (!confirm('Merge the progress in this file into this device? Nothing on this device is lost; for a sentence practised in both, the most recent answer counts.')) return;
    applySnapshot(C.mergeSnapshots(snapshot(), j)); toast('Progress merged'); sync();
  } catch (err) { toast('Import failed: ' + (err instanceof Error ? err.message : String(err))); }
});
$('btn-export-sentences').addEventListener('click', () => download('trakia-sentences.json', SENT.map(s => Object.assign({}, s, { nl_alt: s.nl_alt.concat(userAlts[s.id + '|bg2nl'] || []), en_alt: (s.en_alt || []).concat(userAlts[s.id + '|bg2en'] || []), bg_alt: s.bg_alt.concat(userAlts[s.id + '|nl2bg'] || []), bg_alt_en: (s.bg_alt_en || []).concat(userAlts[s.id + '|en2bg'] || []) }))));

// ---------- settings ----------
const bind = (id, key, type) => {
  const el = $(id);
  const read = () => type === 'bool' ? el.checked : type === 'num' ? +el.value : el.value;
  const write = () => { if (type === 'bool') el.checked = !!settings[key]; else el.value = settings[key]; };
  el.addEventListener(type === 'bool' ? 'change' : 'input', () => { settings[key] = read(); save.settings(); afterSettingChange(key); });
  return write;
};
const writers = [bind('set-rank', 'rank', 'num'), bind('set-rank-range', 'rank', 'num'), bind('set-stage', 'stage', 'num'), bind('set-tol', 'tolerance', 'num'), bind('set-lang', 'lang'), bind('set-dirs', 'directions'), bind('set-run', 'dirRun', 'num'), bind('set-order', 'newOrder'), bind('set-size', 'sessionSize', 'num'), bind('set-new', 'newPerSession', 'num'), bind('set-typo', 'typoPct', 'num'), bind('set-retention', 'retention', 'num'), bind('set-maxivl', 'maxInterval', 'num'), bind('set-almost', 'almostPolicy'), bind('set-passes', 'almostFreePasses', 'num'), bind('set-bag', 'bagOfWords', 'bool'), bind('set-punct', 'strictPunct', 'bool'), bind('set-yi', 'strictYi', 'bool'), bind('set-accents', 'stripAccents', 'bool'), bind('set-forms', 'strictForms', 'bool'), bind('set-translit', 'translit', 'bool'), bind('set-theme', 'theme'), bind('set-wallpaper', 'wallpaper'), bind('set-wallpaper-url', 'wallpaperUrl'), bind('set-wallpaper-dim', 'wallpaperDim', 'num')];
function afterSettingChange(key) { if (key === 'lang') { renderHome(); } if (key === 'stage') { renderRankHelp(); renderStageHelp(); } if (key === 'retention') { settings.retention = Math.min(0.95, Math.max(0.8, settings.retention || 0.9)); renderRetentionHelp(); } if (key === 'rank' || key === 'tolerance') { $('set-rank').value = settings.rank; $('set-rank-range').value = settings.rank; renderRankHelp(); } if (key === 'theme') applyTheme(); if (key.startsWith('wallpaper')) applyWallpaper(); $('hdr-rank').textContent = 'word ' + settings.rank + ' · stage ' + (settings.stage || 5); }
function renderRankHelp() {
  const w = WORD_BY_RANK.get(settings.rank); $('rank-word').textContent = w ? `${w.bg} – ${w.en}` : '';
  const elig = SENT.filter(s => C.eligible(s, settings)).length, next = C.nextUnlock(SENT, settings);
  $('rank-help').textContent = `${elig} of ${SENT.length} sentences eligible.` + (next ? ` Next unlock at word ${next.max_rank} (${WORD_BY_RANK.get(next.max_rank)?.bg || ''}).` : '');
}
function renderRetentionHelp() { const o = C.fsrsOpts(settings); const ivl = s => Math.max(1, Math.round(s / o.factor * (Math.pow(o.retention, 1 / o.decay) - 1))); $('retention-help').textContent = `a card with 10 days of stability comes back after ${ivl(10)} d, with 60 days after ${ivl(60)} d`; }
function renderStageHelp() { const total = SENT.filter(s => s.max_rank == null || s.max_rank <= settings.rank + (settings.tolerance || 0)).length, ok = SENT.filter(s => C.eligible(s, settings)).length; $('stage-help').textContent = `${ok} of the ${total} sentences within your Anki position fit this stage.`; }
function renderSettings() { writers.forEach(w => w()); renderWallpaperFields(); renderSyncStatus(); renderRankHelp(); renderRetentionHelp(); renderStageHelp(); $('about').textContent = `Тракия · ${DATA.sentences.length} bundled sentences · ${WORDS.length} words · deck position at export: ${DATA.learnedRank}`; }
$('load-words').addEventListener('change', async e => {
  const input = /** @type {HTMLInputElement} */ (e.target); const file = input.files && input.files[0]; if (!file) return; input.value = '';
  try { const j = JSON.parse(await file.text()); const r = Math.max(0, ...j.filter(w => w.learned).map(w => +w.rank)); settings.rank = r; save.settings(); renderSettings(); afterSettingChange('rank'); toast('Anki position set to ' + r); } catch (err) { toast('Could not read words.json'); }
});
$('btn-reset').addEventListener('click', () => { if (!confirm(syncState.token ? 'Delete all progress, accepted answers and statistics on this device and, at their next sync, on your other devices?' : 'Delete all progress, accepted answers and statistics on this device?')) return; stamps.wiped = Date.now(); LS.set('stamps', stamps); progress = {}; userAlts = {}; log = []; sessions = []; drills = {}; drillLog = []; reading = {}; dayTotals = {}; peeks = {}; save.peeks(); save.reading(); save.days(); save.progress(); save.userAlts(); save.log(); save.sessions(); save.drills(); save.drillLog(); toast('Progress reset'); renderHome(); });
$('btn-undelete').addEventListener('click', () => { deleted = []; save.deleted(); refreshSentences(); toast('All sentences restored'); });

// ---------- sneak peek: guess the next Anki words from a sentence (D-031) ----------
/** @type {{items: ReturnType<typeof C.peekItems>, i: number, picked: number | null, right: number} | null} */ let peek = null;
const PEEK_SIZE = 10;
function startPeek() {
  const items = C.peekItems(WORDS, SENT, settings, peeks, PEEK_SIZE);
  if (!items.length) { toast('No words ahead of your Anki position to peek at'); return; }
  peek = { items, i: 0, picked: null, right: 0 };
  $('session-home').hidden = true; $('session-done').hidden = true; $('peek-done').hidden = true; $('peek-run').hidden = false;
  renderPeek(); window.scrollTo(0, 0);
}
function renderPeek() {
  if (!peek) return;
  const it = peek.items[peek.i], w = it.word, forms = new Set(it.forms), answered = peek.picked != null;
  $('peek-count').textContent = `Sneak peek · ${peek.i + 1} of ${peek.items.length} · word ${w.rank}`;
  $('peek-sentence').innerHTML = C.storyTokens(it.sentence.bg).map(t => t.w && forms.has(C.storyKey(t.t)) ? `<mark>${esc(t.t)}</mark>` : esc(t.t)).join('');
  $('peek-others').innerHTML = it.others.length ? 'Also new: ' + it.others.map(o => `<b lang="bg">${esc(o.bg)}</b> – ${esc(o.en)}`).join(', ') : '';
  const shown = it.forms.find(f => it.sentence.bg.toLowerCase().includes(f)) || w.bg;
  $('peek-question').innerHTML = `What does <b lang="bg">${esc(shown)}</b> mean here?`;
  $('peek-opts').innerHTML = it.options.map((o, j) => {
    const cls = !answered ? '' : j === it.answer ? ' right' : j === peek?.picked ? ' wrong' : '';
    return `<button class="opt${cls}" data-o="${j}"${answered ? ' disabled' : ''}>${j + 1}. ${esc(o.en)}</button>`;
  }).join('');
  $('peek-reveal').hidden = !answered; $('btn-peek-next').hidden = !answered;
  if (answered) {
    const lang = C.langFor(it.sentence.id, settings) === 'en' ? 'en' : 'nl';
    $('peek-meaning').innerHTML = `<b lang="bg">${esc(w.bg)}</b> – ${esc(w.en)} <span class="tiny">· word ${w.rank}${w.forms ? ' · ' + esc(w.forms) : ''}</span>`;
    $('peek-translation').textContent = it.sentence[lang] || it.sentence.nl;
    $('btn-peek-next').textContent = peek.i + 1 < peek.items.length ? 'Next' : 'Finish';
  }
}
function pickPeek(/** @type {number} */ j) {
  if (!peek || peek.picked != null) return;
  const it = peek.items[peek.i], ok = j === it.answer;
  peek.picked = j; if (ok) peek.right++;
  peeks[it.word.rank] = { at: Date.now(), ok }; save.peeks();
  renderPeek(); $('btn-peek-next').focus();
}
function nextPeek() {
  if (!peek || peek.picked == null) return;
  if (peek.i + 1 < peek.items.length) { peek.i++; peek.picked = null; renderPeek(); return; }
  const n = peek.items.length, first = peek.items[0].word.rank, last = peek.items[n - 1].word.rank;
  $('peek-summary').textContent = `You guessed ${peek.right} of ${n} right. Anki teaches these words next (word ${first}–${last}); when you meet them there, you have already thought about them once.`;
  stopPeek(); $('session-home').hidden = true; $('peek-done').hidden = false; sync();
}
function stopPeek() { peek = null; $('peek-run').hidden = true; $('session-home').hidden = false; renderHome(); }
$('btn-peek').addEventListener('click', startPeek);
$('peek-opts').addEventListener('click', e => { const b = closest(e, '.opt'); if (b) pickPeek(+(b.dataset.o || 0)); });
$('btn-peek-next').addEventListener('click', nextPeek);
$('btn-peek-stop').addEventListener('click', () => { stopPeek(); sync(); });
$('btn-peek-home').addEventListener('click', () => { $('peek-done').hidden = true; $('session-home').hidden = false; renderHome(); });
// keys: 1–4 choose, Enter goes on
document.addEventListener('keydown', e => {
  if (!peek || $('peek-run').hidden) return;
  if (peek.picked == null && /^[1-4]$/.test(e.key) && +e.key <= peek.items[peek.i].options.length) { e.preventDefault(); pickPeek(+e.key - 1); }
  else if (peek.picked != null && e.key === 'Enter' && !e.repeat) { e.preventDefault(); nextPeek(); }
});

// ---------- reading (D-026 stories, D-027 tap a word, D-028 questions) ----------
const STORIES = DATA.stories || [], LEVELS = [...new Set(STORIES.map(s => s.level))].sort((a, b) => a - b);
/** deck words by dictionary form (lowest rank wins, as in the validator) */
const WORD_BY_BG = new Map(); for (const w of WORDS) { const k = C.storyKey(w.bg); if (!WORD_BY_BG.has(k)) WORD_BY_BG.set(k, w); }
/** meanings of the function words a story may use without a deck entry */
const FREE_MEANING = { 'ли': 'question particle', 'не': 'not', 'да': 'to, that (before a verb)', 'ще': 'will (future)', 'се': 'oneself (reflexive)', 'си': 'oneself; one\'s own; you are', 'по': 'more (по-), along', 'най': 'most (най-)', 'е': 'is (съм)', 'са': 'are (съм)', 'сме': 'we are (съм)', 'сте': 'you are (съм)', 'съм': 'I am (съм)', 'бях': 'I was (съм)', 'беше': 'was (съм)', 'бяхме': 'we were (съм)', 'бяха': 'they were (съм)', 'и': 'and; also', 'ѝ': 'her, to her (тя)' };
/** @type {Story | null} */ let story = null;
/** @type {{orders: number[][], picks: (number | null)[]} | null} */ let quiz = null;
const storyLang = (/** @type {Story} */ st) => C.langFor(st.id, settings) === 'en' ? 'en' : 'nl';
function renderReading() {
  const open = STORIES.filter(st => C.storyEligible(st, settings)), reach = settings.rank + (settings.tolerance || 0);
  const level = (/** @type {number} */ L, /** @type {boolean} */ isOpen) => {
    const rows = STORIES.filter(st => st.level === L).map(st => {
      const r = reading[st.id] || {}, lang = storyLang(st), meta = [st.word_count + ' words'];
      if (r.read) meta.push('<span class="done">read ✓</span>'); if (r.quiz) meta.push(`questions ${r.quiz.score}/${r.quiz.total}`);
      return `<button class="story-row" data-story="${esc(st.id)}"${isOpen ? '' : ' disabled'}><b lang="bg">${esc(st.title.bg)}</b><span>${esc(st.title[lang])} · ${meta.join(' · ')}</span></button>`;
    }).join('');
    const why = isOpen ? '' : L > reach ? ` · unlocks at word ${L} (you are at word ${settings.rank})` : ' · needs a higher grammar stage';
    return `<div class="card${isOpen ? '' : ' locked'}"><h2>Level ${L}</h2><p class="tiny">Words 1–${L}${why}</p><div class="story-list">${rows}</div></div>`;
  };
  const openLevels = LEVELS.filter(L => STORIES.some(st => st.level === L && open.includes(st))).reverse();
  const locked = LEVELS.filter(L => !openLevels.includes(L));
  $('reading-list').innerHTML = `<div class="card"><h2>Reading</h2><p class="muted">Short stories about the Petrov family, written with the words you know from Anki. ${open.length ? `${open.length} of ${STORIES.length} stories are open at word ${settings.rank}.` : `The first stories open at word ${LEVELS[0] || 100}.`} Each ends with a few questions.</p></div>`
    + openLevels.map(L => level(L, true)).join('') + locked.map(L => level(L, false)).join('');
}
$('reading-list').addEventListener('click', e => { const b = closest(e, '[data-story]'); if (b && !b.disabled) openStory(b.dataset.story || ''); });
/** a text as tappable words: each word a button carrying its lookup key. A button may break a line on
 * either side, so each word is kept in a nowrap span with the punctuation that touches it („Бабо, по-голям). */
function storyHtml(/** @type {string} */ text, /** @type {WordSource} */ st) {
  const extra = new Set(Object.keys(st.extra || {}).map(C.storyKey));
  let out = '', cur = '';
  const flush = () => { if (cur) out += `<span class="nw">${cur}</span>`; cur = ''; };
  for (const tok of C.storyTokens(text)) {
    if (tok.w) { const k = C.storyKey(tok.t), lem = st.words[k]; cur += `<button type="button" class="w${lem && extra.has(C.storyKey(lem)) ? ' gl' : ''}" data-k="${esc(k)}">${esc(tok.t)}</button>`; continue; }
    for (const part of tok.t.split(/(\s+)/)) if (/^\s+$/.test(part)) { flush(); out += part; } else cur += esc(part);
  }
  flush();
  return out;
}
function openStory(/** @type {string} */ id) {
  const st = STORIES.find(x => x.id === id); if (!st) return;
  story = st; const lang = storyLang(st), extra = st.extra || {};
  $('reading-list').hidden = true; $('reading-story').hidden = false; hideWordPop();
  $('story-meta').textContent = `Level ${st.level} · ${st.word_count} words`;
  $('story-title').innerHTML = storyHtml(st.title.bg, storySource(st));
  $('story-text').innerHTML = st.paragraphs.map((p, i) => {
    // glossed words that occur in this paragraph, listed under it
    const here = [...new Set(C.storyTokens(p.bg).filter(t => t.w).map(t => st.words[C.storyKey(t.t)]).filter(l => l && Object.keys(extra).some(x => C.storyKey(x) === C.storyKey(l))))];
    const gl = here.map(l => { const g = extra[Object.keys(extra).find(x => C.storyKey(x) === C.storyKey(l)) || '']; return `<b lang="bg">${esc(l)}</b> – ${esc(g[lang])}`; }).join(', ');
    return `<div class="para"><p class="bg" lang="bg">${storyHtml(p.bg, storySource(st))}</p>${gl ? `<p class="tiny new-words">New: ${gl}</p>` : ''}<button class="link-btn" data-tr="${i}">Show translation</button><p class="tr" id="tr-${i}" hidden>${esc(p[lang])}</p></div>`;
  }).join('');
  startQuiz(0); renderReadMark(); window.scrollTo(0, 0);
}
function closeStory() { story = null; quiz = null; hideWordPop(); $('reading-story').hidden = true; $('reading-list').hidden = false; }
$('btn-story-back').addEventListener('click', () => { closeStory(); renderReading(); window.scrollTo(0, 0); });
$('story-text').addEventListener('click', e => {
  const t = closest(e, '[data-tr]'); if (t) { const p = $('tr-' + t.dataset.tr); p.hidden = !p.hidden; t.textContent = p.hidden ? 'Show translation' : 'Hide translation'; }
});
// tap a word (D-027 stories, D-030 practice sentences)
const storySource = (/** @type {Story} */ st) => /** @type {WordSource} */ ({ words: st.words, names: st.names, extra: st.extra, vocative: st.vocative, lang: storyLang(st) });
/** dictionary form and meaning of a word form @param {string} k @param {WordSource} src @returns {string} */
function wordInfo(k, src) {
  const lang = src.lang || 'nl', names = new Set((src.names || []).map(C.storyKey));
  // a form of address (Петре, мамо) gets a line saying so, under the base form
  const voc = (src.vocative || []).map(C.storyKey).includes(k) ? `<span class="tiny">${esc(k)}: the form for addressing someone (vocative)</span>` : '';
  const name = (/** @type {string} */ n) => `<b lang="bg">${esc(n)}</b><span class="tiny">name</span>${voc}`;
  if (names.has(k)) return name(src.words[k] || k);
  const lem = src.words[k];
  if (!lem) return FREE_MEANING[k] ? `<b lang="bg">${esc(k)}</b> – ${esc(FREE_MEANING[k])}` : `<b lang="bg">${esc(k)}</b>`;
  const extra = src.extra || {}, ex = Object.keys(extra).find(x => C.storyKey(x) === C.storyKey(lem));
  if (ex) return `<b lang="bg">${esc(lem)}</b> – ${esc(extra[ex][lang])}<span class="tiny">not yet in your deck</span>`;
  const [form, forced] = lem.split('#'), w = forced ? WORD_BY_RANK.get(+forced) : WORD_BY_BG.get(C.storyKey(form));
  if (!w && FREE_MEANING[C.storyKey(form)]) return `<b lang="bg">${esc(form)}</b> – ${esc(FREE_MEANING[C.storyKey(form)])}`;
  if (!w) return /^\p{Lu}/u.test(form) ? name(form) : `<b lang="bg">${esc(form)}</b>`;   // a sentence's names are the capitalised non-deck words
  return `<b lang="bg">${esc(w.bg)}</b> – ${esc(w.en)}<span class="tiny">word ${w.rank}${w.rank > settings.rank ? ' · not yet reached in Anki' : ''}</span>${voc}`;
}
/** @type {HTMLElement | null} */ let popFor = null;
function hideWordPop() { $('word-pop').hidden = true; if (popFor) popFor.classList.remove('on'); popFor = null; }
function showWordPop(/** @type {HTMLElement} */ b, /** @type {WordSource} */ src) {
  if (popFor === b) { hideWordPop(); return; }
  hideWordPop();
  const pop = $('word-pop'); pop.innerHTML = wordInfo(b.dataset.k || '', src); pop.hidden = false;
  const r = b.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
  const below = r.bottom + 6 + h < window.innerHeight;
  pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + window.scrollX + 'px';
  pop.style.top = (below ? r.bottom + 6 : r.top - h - 6) + window.scrollY + 'px';
  b.classList.add('on'); popFor = b;
}
$('reading-story').addEventListener('click', e => { const b = closest(e, 'button.w'); if (b && story) { e.stopPropagation(); showWordPop(b, storySource(story)); } });
// a practice sentence's prompt, once the card is answered (D-030)
/** @type {WordSource | null} */ let promptSource = null;
$('prompt').addEventListener('click', e => { const b = closest(e, 'button.w'); if (b && promptSource) { e.stopPropagation(); showWordPop(b, promptSource); } });
document.addEventListener('click', e => { if (popFor && !(e.target instanceof Node && $('word-pop').contains(e.target))) hideWordPop(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && popFor) hideWordPop(); });
window.addEventListener('resize', () => hideWordPop());
// questions (D-028)
/** a shuffled order of n options, the same for a story and attempt @param {number} n @param {string} seed */
function optionOrder(n, seed) {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const rand = () => { h = (h * 1103515245 + 12345) | 0; return ((h >>> 16) & 0x7fff) / 0x8000; };
  const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a;
}
let attempt = 0;
function startQuiz(/** @type {number} */ n) {
  if (!story) return; const st = story; attempt = n;
  quiz = { orders: st.questions.map((q, i) => optionOrder(q.options.length, `${st.id}:${i}:${n}`)), picks: st.questions.map(() => null) };
  renderQuiz();
}
function renderQuiz() {
  if (!story || !quiz) return; const st = story, qz = quiz, lang = storyLang(st);
  $('story-quiz').innerHTML = st.questions.map((q, i) => `<div class="q"><p>${i + 1}. ${esc(q.q[lang])}</p><div class="opts">${qz.orders[i].map(o => {
    const picked = qz.picks[i], cls = picked == null ? '' : o === q.answer ? ' right' : o === picked ? ' wrong' : '';
    return `<button class="opt${cls}" data-q="${i}" data-o="${o}"${picked == null ? '' : ' disabled'}>${esc(q.options[o][lang])}</button>`;
  }).join('')}</div></div>`).join('');
  const done = qz.picks.every(p => p != null), score = st.questions.filter((q, i) => qz.picks[i] === q.answer).length;
  $('quiz-result').hidden = !done; $('quiz-result').textContent = done ? `${score} of ${st.questions.length} right.` : '';
  $('btn-quiz-again').hidden = !done;
}
$('story-quiz').addEventListener('click', e => {
  const b = closest(e, '.opt'); if (!b || !story || !quiz) return;
  const i = +(b.dataset.q || 0); if (quiz.picks[i] != null) return;
  quiz.picks[i] = +(b.dataset.o || 0);
  if (quiz.picks.every(p => p != null)) {
    const st = story, now = Date.now(), score = st.questions.filter((q, j) => quiz && quiz.picks[j] === q.answer).length;
    reading[st.id] = { read: (reading[st.id] || {}).read || now, quiz: { at: now, score, total: st.questions.length } }; save.reading(); renderReadMark();
  }
  renderQuiz();
});
$('btn-quiz-again').addEventListener('click', () => startQuiz(attempt + 1));
function renderReadMark() { const r = story && reading[story.id]; $('btn-story-read').textContent = r && r.read ? 'Read ✓' : 'Mark as read'; $('btn-story-read').disabled = !!(r && r.read); }
$('btn-story-read').addEventListener('click', () => { if (!story) return; reading[story.id] = Object.assign({}, reading[story.id], { read: Date.now() }); save.reading(); renderReadMark(); toast('Marked as read'); });
function renderReadingStats() {
  const open = STORIES.filter(st => C.storyEligible(st, settings)), read = open.filter(st => reading[st.id] && reading[st.id].read).length;
  const scored = Object.values(reading).map(r => r.quiz).filter(q => q && q.total), pct = scored.length ? Math.round(100 * scored.reduce((a, q) => a + (q ? q.score / q.total : 0), 0) / scored.length) + '%' : '–';
  $('stats-reading').innerHTML = stat(`${read}/${open.length}`, 'stories read') + stat(pct, 'questions right (latest tries)');
}

// ---------- sync between devices through a secret gist (D-025) ----------
const GIST_FILE = 'trakia-progress.json';
/** @type {SyncState} */ let syncState = LS.get('sync', {});
let syncBusy = false, syncAgain = false;
const saveSync = () => LS.set('sync', syncState);
/** call the GitHub REST API with the stored token (only CORS-safe headers, never cached) */
async function gh(path, method, body) {
  const res = await fetch('https://api.github.com' + path, { method: method || 'GET', cache: 'no-store', body: body ? JSON.stringify(body) : undefined,
    headers: body ? { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + syncState.token, 'Content-Type': 'application/json' } : { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + syncState.token } });
  if (!res.ok) throw Object.assign(new Error(res.status === 401 ? 'GitHub refused the token (expired or revoked?)' : res.status === 403 ? 'the token may not use gists (it needs Gists: read and write)' : 'GitHub answered ' + res.status), { status: res.status });
  return res.json();
}
/** the id of this account's Trakia gist, or null */
async function findGist() {
  for (let page = 1; page <= 10; page++) {
    const list = await gh('/gists?per_page=100&page=' + page), hit = list.find(g => g.files && g.files[GIST_FILE]);
    if (hit) return hit.id;
    if (list.length < 100) break;
  }
  return null;
}
/** the snapshot stored in a gist; the API cuts files over 1 MB short, those are fetched in full from raw_url */
async function readGist(id) {
  const g = await gh('/gists/' + id), f = g.files && g.files[GIST_FILE];
  syncState.url = g.html_url;
  if (!f) return null;
  let text = f.content;
  if (f.truncated) { const r = await fetch(f.raw_url, { cache: 'no-store' }); if (!r.ok) throw new Error('could not read the full gist (' + r.status + ')'); text = await r.text(); }
  const j = JSON.parse(text); if (j.app !== 'trakia') throw new Error('the gist does not hold Trakia progress');
  return j;
}
/** merge this device with the gist, take over what is new and upload what the gist lacks. Never during a session. */
async function sync(loud) {
  if (!syncState.token || session) return;
  if (syncBusy) { syncAgain = true; return; }
  if (navigator.onLine === false) { if (loud) toast('Offline: syncs when you are back online'); return; }
  syncBusy = true; renderSyncStatus('Syncing…');
  try {
    let id = syncState.gist, remote = null;
    if (id) try { remote = await readGist(id); } catch (e) { if (!(e instanceof Error && 'status' in e && e.status === 404)) throw e; id = undefined; }
    if (!id) { id = await findGist(); if (id) remote = await readGist(id); }
    const m0 = C.mergeSnapshots(snapshot(), remote || {}), merged = Object.assign(m0, C.compactHistory(m0, Date.now())), text = JSON.stringify(merged);
    if (!id) { const g = await gh('/gists', 'POST', { description: 'Trakia progress (kept in sync by the app)', public: false, files: { [GIST_FILE]: { content: text } } }); id = g.id; syncState.url = g.html_url; }
    else if (!remote || text !== JSON.stringify(C.mergeSnapshots(remote, remote))) await gh('/gists/' + id, 'PATCH', { files: { [GIST_FILE]: { content: text } } });
    // merge once more with the current state: answers given while the requests ran are kept
    const now = snapshot(), next = C.mergeSnapshots(now, merged);
    if (!session && JSON.stringify(next) !== JSON.stringify(C.mergeSnapshots(now, now))) applySnapshot(next);
    syncState.gist = id; syncState.at = Date.now(); delete syncState.error; saveSync();
    if (loud) toast('Synced');
  } catch (e) {
    syncState.error = e instanceof Error ? e.message : String(e); saveSync();
    if (loud) toast('Sync failed: ' + syncState.error);
  } finally {
    syncBusy = false; renderSyncStatus();
    if (syncAgain) { syncAgain = false; sync(); }
  }
}
function renderSyncStatus(msg) {
  const on = !!syncState.token, st = $('sync-status');
  $('sync-off').hidden = on; $('sync-on').hidden = !on;
  if (msg) { st.textContent = msg; return; }
  if (!on) { st.textContent = 'Not connected: progress stays on this device.'; return; }
  const ago = syncState.at ? Date.now() - syncState.at : 0;
  st.innerHTML = (syncState.error ? 'Last sync failed: ' + esc(syncState.error) : syncState.at ? 'Synced ' + (ago < 60e3 ? 'just now' : fmtAgo(ago) + ' ago') : 'Not synced yet')
    + (syncState.url ? ` · <a href="${esc(syncState.url)}" target="_blank" rel="noopener">open the gist</a>` : '');
}
$('btn-sync-connect').addEventListener('click', async () => {
  const token = $('sync-token').value.trim(); if (!token) { toast('Paste a GitHub token first'); return; }
  syncState = { token }; saveSync(); $('sync-token').value = '';
  await sync(true);
  if (syncState.error && !syncState.gist) { const err = syncState.error; syncState = {}; saveSync(); renderSyncStatus('Could not connect: ' + err); }
});
$('btn-sync-now').addEventListener('click', () => sync(true));
$('btn-sync-off').addEventListener('click', () => { if (!confirm('Forget the token on this device? Your progress stays here and in the gist.')) return; syncState = {}; saveSync(); renderSyncStatus(); });
// coming back to the app pulls what another device did; leaving it pushes what this one did
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' || Date.now() - (syncState.at || 0) > 60e3) sync(); });
window.addEventListener('online', () => sync());

// ---------- init ----------
applyTheme(); renderHome(); sync();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => reg.update().catch(() => {})).catch(() => {});
  // a new version has taken over: offer a reload (never forced, so a running session is not interrupted)
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) $('update-bar').hidden = false; hadController = true; });
}
$('btn-update').addEventListener('click', () => location.reload());
window.addEventListener('resize', () => { if ($('tab-stats').classList.contains('active')) renderStats(); });

// ---------- wallpaper (D-023) ----------
/** IndexedDB for files that are too big for localStorage: database trakia, store media */
function mediaDb() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('no IndexedDB'));
    const r = indexedDB.open('trakia', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('media');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
/** @param {string} key @param {Blob | null} blob */
async function mediaPut(key, blob) { const db = await mediaDb(); return new Promise((res, rej) => { const tx = db.transaction('media', 'readwrite'); if (blob) tx.objectStore('media').put(blob, key); else tx.objectStore('media').delete(key); tx.oncomplete = () => res(undefined); tx.onerror = () => rej(tx.error); }); }
/** @param {string} key @returns {Promise<Blob | null>} */
async function mediaGet(key) { try { const db = await mediaDb(); return await new Promise((res, rej) => { const r = db.transaction('media').objectStore('media').get(key); r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error); }); } catch (e) { return null; } }

// a Doom-style fire: heat rises from the bottom row and cools at random on the way up
const FIRE = { w: 120, h: 72, timer: /** @type {ReturnType<typeof setInterval> | null} */ (null), heat: /** @type {Uint8Array | null} */ (null) };
// the Doom fire palette: black, dark red, orange, yellow, near white; low heat fades to transparent
const FIRE_PALETTE = [[7, 7, 7], [31, 7, 7], [47, 15, 7], [71, 15, 7], [87, 23, 7], [103, 31, 7], [111, 35, 7], [127, 39, 7], [143, 47, 7], [159, 47, 7], [175, 63, 7], [191, 71, 7], [199, 71, 7], [223, 79, 7], [223, 87, 7], [223, 87, 7], [215, 95, 7], [215, 95, 7], [215, 103, 15], [207, 111, 15], [207, 119, 15], [207, 127, 15], [207, 135, 23], [199, 135, 23], [199, 143, 23], [199, 151, 27], [191, 159, 27], [191, 159, 31], [191, 167, 31], [191, 167, 31], [191, 175, 39], [183, 175, 39], [183, 183, 39], [183, 183, 47], [207, 207, 111], [223, 223, 159], [239, 239, 199]];
function fireStart() {
  const c = /** @type {HTMLCanvasElement} */ (document.getElementById('wp-fire')); c.hidden = false;
  const ctx = c.getContext && c.getContext('2d'); if (!ctx || FIRE.timer) return;   // no canvas in the headless test
  const { w, h } = FIRE, heat = FIRE.heat || (FIRE.heat = new Uint8Array(w * h)), img = ctx.createImageData(w, h), px = img.data;
  for (let x = 0; x < w; x++) heat[(h - 1) * w + x] = 36;
  const step = () => {
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) {
      const src = y * w + x, r = Math.random(), dst = src - w + (r > .66 ? 1 : r > .33 ? 0 : -1);
      if (dst >= 0 && dst < w * h) heat[dst] = Math.max(0, heat[src] - Math.floor(Math.random() * 4));   // cools by 0–3 per row: flames reach about a third up, with ragged tips
    }
    for (let x = 0; x < w; x++) heat[(h - 1) * w + x] = Math.random() > .85 ? 30 : 36;   // a flickering base
    for (let i = 0; i < w * h; i++) { const q = heat[i], [r, g, b] = FIRE_PALETTE[q]; px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b; px[i * 4 + 3] = q < 6 ? Math.round(q * 42) : 255; }
    ctx.putImageData(img, 0, 0);
  };
  FIRE.timer = setInterval(step, 1000 / 24);
}
function fireStop() { if (FIRE.timer) clearInterval(FIRE.timer); FIRE.timer = null; $('wp-fire').hidden = true; }
let wpObjectUrl = '';
/** show the chosen wallpaper: the fire, the stored file, the URL, or nothing */
async function applyWallpaper() {
  const wp = $('wallpaper'), v = /** @type {HTMLVideoElement} */ (document.getElementById('wp-video')), kind = settings.wallpaper || 'none';
  document.documentElement.style.setProperty('--wp-dim', String((settings.wallpaperDim == null ? 55 : settings.wallpaperDim) / 100));
  const hidden = typeof document.hidden === 'boolean' && document.hidden;
  renderWallpaperFields();
  fireStop(); try { v.pause(); } catch (e) { /* no media in the headless test */ } v.hidden = true;
  if (kind === 'fire') { wp.hidden = false; if (!hidden) fireStart(); }
  else if (kind === 'video') {
    const blob = await mediaGet('wallpaper');
    if (settings.wallpaper !== 'video') return;   // changed while loading
    if (wpObjectUrl) { URL.revokeObjectURL(wpObjectUrl); wpObjectUrl = ''; }
    const src = blob ? (wpObjectUrl = URL.createObjectURL(blob)) : (settings.wallpaperUrl || '').trim();
    wp.hidden = !src; v.hidden = !src;
    if (src) { if (v.getAttribute('src') !== src) v.src = src; if (!hidden) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); } }
  } else wp.hidden = true;
}
async function renderWallpaperFields() {
  $('wp-video-fields').hidden = settings.wallpaper !== 'video';
  $('wp-dim-val').textContent = (settings.wallpaperDim == null ? 55 : settings.wallpaperDim) + ' %';
  const blob = settings.wallpaper === 'video' ? await mediaGet('wallpaper') : null;
  $('wp-file-name').textContent = blob ? `a chosen file (${Math.round(blob.size / 1048576 * 10) / 10} MB)` : 'no file chosen';
  $('wp-file-clear').hidden = !blob;
}
$('wp-file').addEventListener('change', async e => {
  const input = /** @type {HTMLInputElement} */ (e.target), file = input.files && input.files[0]; if (!file) return; input.value = '';
  try { await mediaPut('wallpaper', file); settings.wallpaper = 'video'; save.settings(); $('set-wallpaper').value = 'video'; applyWallpaper(); toast('Wallpaper set'); } catch (err) { toast('Could not store the video on this device'); }
});
$('wp-file-clear').addEventListener('click', async () => { await mediaPut('wallpaper', null); applyWallpaper(); toast('Wallpaper file removed'); });
document.addEventListener('visibilitychange', () => { if (settings.wallpaper && settings.wallpaper !== 'none') applyWallpaper(); });
applyWallpaper();
})();
