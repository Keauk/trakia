// @ts-check
// D-033 phase 0: read 30 practised sentences and 10 deck words aloud; the browser's speech recognition
// (bg-BG) writes down what it heard, the app's checker judges it, and the results are copied as text.
(function () {
'use strict';
const C = window.TrakiaCore, DATA = window.TRAKIA_DATA;
/** @type {(id: string) => AppElement} */
const $ = id => /** @type {any} */ (document.getElementById(id));
const esc = (/** @type {string} */ s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
const read = (/** @type {string} */ k, /** @type {any} */ d) => { try { const v = localStorage.getItem('trakia.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };

// the checker as Practise uses it, with the learner's own settings (D-014)
const settings = Object.assign({ rank: DATA.learnedRank || 0, stage: 1, lang: 'nl', typoPct: 10, bagOfWords: true, strictPunct: false, strictYi: false, stripAccents: true, strictForms: true }, read('settings', {}));
const progress = read('progress', {});
// no DOM type for it in TypeScript's lib, so the constructor is looked up untyped
/** @type {any} */ const SR = /** @type {any} */ (window).SpeechRecognition || /** @type {any} */ (window).webkitSpeechRecognition;

/** @typedef {{kind: 'sentence' | 'word', id: string, bg: string, meaning: string, accepted: string[], result?: any, error?: string, tries: number, rec?: string, skipped?: boolean}} Item */
const shuffle = (/** @type {any[]} */ a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/** 30 sentences the learner typed into Bulgarian correctly at least once, topped up with the easiest eligible ones; then 10 deck words */
function pickItems() {
  const typed = new Set(Object.keys(progress).filter(k => /\|(nl|en)2bg$/.test(k) && progress[k].box >= 1).map(k => k.split('|')[0]));
  const elig = DATA.sentences.filter(s => C.eligible(s, settings));
  const known = shuffle(elig.filter(s => typed.has(s.id)));
  const rest = elig.filter(s => !typed.has(s.id)).sort((a, b) => (a.max_rank || 0) - (b.max_rank || 0));
  /** @type {Item[]} */ const sentences = known.concat(shuffle(rest.slice(0, 120))).slice(0, 30).map(s => /** @type {Item} */ ({ kind: 'sentence', id: s.id, bg: s.bg, meaning: s[C.langFor(s.id, settings)] || s.nl, accepted: [s.bg].concat(s.bg_alt || []), tries: 0 }));
  const words = shuffle(DATA.words.filter(w => w.rank <= Math.max(settings.rank, 100) && w.bg.length >= 3 && !/[ ,(…]/.test(w.bg) && /^(noun|verb|adj)/.test(w.pos))).slice(0, 10)
    .map(w => /** @type {Item} */ ({ kind: 'word', id: 'w' + w.rank, bg: w.bg, meaning: w.en, accepted: [w.bg], tries: 0 }));
  return sentences.concat(words);
}

/** @type {Item[]} */ let items = [];
let at = 0, listening = /** @type {any} */ (null), recordOn = false;
/** @type {MediaRecorder | null} */ let recorder = null; /** @type {Blob[]} */ let chunks = [];

function support() {
  const el = $('support');
  if (!SR) { el.textContent = 'This browser has no speech recognition (Chrome or Edge do). The test cannot run here.'; el.className = 'status bad'; $('btn-begin').disabled = true; return; }
  el.textContent = `Speech recognition: ${/** @type {any} */ (window).SpeechRecognition ? 'SpeechRecognition' : 'webkitSpeechRecognition'} · Bulgarian (bg-BG).` + (window.isSecureContext ? '' : ' Not a secure page: the microphone needs https or localhost.');
}

function render() {
  const it = items[at];
  $('count').textContent = `${it.kind === 'word' ? 'Word' : 'Sentence'} ${at + 1} of ${items.length}`;
  $('say').textContent = it.bg; $('meaning').textContent = it.meaning;
  $('heard').textContent = ''; $('verdict').textContent = ''; $('verdict').className = 'verdict'; $('playback').innerHTML = '';
  $('btn-next').disabled = true; $('btn-mic').disabled = false; setMic(false);
}
function setMic(/** @type {boolean} */ on) { $('btn-mic').classList.toggle('on', on); $('mic-label').textContent = on ? 'Listening… tap to stop' : 'Tap and speak'; }

async function startRecording() {
  recorder = null; chunks = [];
  if (!recordOn) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream); recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => stream.getTracks().forEach(t => t.stop());
    recorder.start();
  } catch (e) { items[at].rec = 'failed: ' + (e instanceof Error ? e.name : String(e)); }
}
function stopRecording() {
  const it = items[at], r = recorder; if (!r) return;
  r.addEventListener('stop', () => {
    const blob = new Blob(chunks, { type: r.mimeType || 'audio/webm' });
    it.rec = blob.size > 1000 ? `ok (${Math.round(blob.size / 1024)} KB)` : 'empty';
    if (blob.size > 1000) $('playback').innerHTML = `<audio controls src="${URL.createObjectURL(blob)}" style="margin-top:10px;width:100%"></audio>`;
  }, { once: true });
  if (r.state !== 'inactive') r.stop();
}

async function listen() {
  if (listening) { listening.stop(); return; }
  const it = items[at]; it.tries++;
  await startRecording();
  const r = new SR(); listening = r;
  r.lang = 'bg-BG'; r.interimResults = true; r.maxAlternatives = 5; r.continuous = false;
  /** @type {string[]} */ let alts = []; let error = '';
  r.onresult = (/** @type {any} */ e) => {
    const res = Array.from(e.results), last = /** @type {any} */ (res[res.length - 1]);
    $('heard').textContent = res.map((/** @type {any} */ x) => x[0].transcript).join(' ');
    if (last.isFinal) alts = res.length === 1 ? Array.from(/** @type {any} */ (res[0])).map((/** @type {any} */ a) => a.transcript) : [res.map((/** @type {any} */ x) => x[0].transcript).join(' ')];
  };
  r.onerror = (/** @type {any} */ e) => { error = e.error || 'error'; };
  r.onend = () => {
    listening = null; setMic(false); stopRecording();
    if (!alts.length) { it.error = error || 'no-speech'; $('verdict').textContent = `Nothing recognised (${it.error})` + (error === 'language-not-supported' ? ': this browser has no Bulgarian' : error === 'not-allowed' ? ': the microphone is blocked' : ''); $('verdict').className = 'verdict wrong'; return; }
    delete it.error;
    const v = C.checkSpoken(alts, it.accepted, Object.assign({}, settings, it.kind === 'word' ? { bagOfWords: false } : {}));
    it.result = { result: v.result, heard: v.heard, alt: v.alt, alts: alts.length };
    $('heard').textContent = 'Heard: ' + v.heard;
    $('verdict').textContent = { correct: '✓ Accepted', almost: '≈ Accepted as almost', wrong: '✕ Not accepted' }[v.result] + (v.alt > 0 ? ` (alternative ${v.alt + 1} of ${alts.length})` : '');
    $('verdict').className = 'verdict ' + v.result; $('btn-next').disabled = false; $('btn-next').focus();
  };
  setMic(true);
  try { r.start(); } catch (e) { listening = null; setMic(false); $('verdict').textContent = 'Could not start: ' + (e instanceof Error ? e.message : String(e)); }
}

function next(/** @type {boolean} */ skip) {
  if (listening) return;
  if (skip) { items[at].skipped = true; delete items[at].result; }
  if (at + 1 < items.length) { at++; render(); } else finish();
}

function finish() {
  $('run').hidden = true; $('done').hidden = false;
  const part = (/** @type {'sentence' | 'word'} */ kind) => {
    const list = items.filter(i => i.kind === kind && !i.skipped && i.result), ok = list.filter(i => i.result.result !== 'wrong');
    return { n: list.length, ok: ok.length, correct: list.filter(i => i.result.result === 'correct').length, pct: list.length ? Math.round(100 * ok.length / list.length) : 0 };
  };
  const s = part('sentence'), w = part('word'), recs = items.filter(i => i.rec), recOk = recs.filter(i => /^ok/.test(i.rec || '')).length;
  const noSpeech = items.filter(i => i.error && !i.result).length;
  $('summary').innerHTML = `<div><b>${s.ok}/${s.n}</b>sentences accepted (${s.pct} %)</div><div><b>${w.ok}/${w.n}</b>words accepted (${w.pct} %)</div>`;
  const ua = navigator.userAgent.replace(/\s+/g, ' ');
  const lines = [
    `Trakia speech test (D-033 phase 0) · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    `Browser: ${ua}`,
    `Sentences: ${s.ok}/${s.n} accepted (${s.pct} %; ${s.correct} correct, ${s.ok - s.correct} almost) · words: ${w.ok}/${w.n} (${w.pct} %)`,
    `Recording alongside: ${recordOn ? `${recOk} of ${recs.length} ok` : 'not tried'} · nothing recognised: ${noSpeech} · skipped: ${items.filter(i => i.skipped).length}`,
    '',
  ].concat(items.map(i => `${i.id}\t${i.skipped ? 'skipped' : i.result ? i.result.result : 'error ' + (i.error || '')}\ttries ${i.tries}${i.result && i.result.alt > 0 ? '\talt ' + (i.result.alt + 1) + '/' + i.result.alts : ''}${i.rec ? '\trec ' + i.rec : ''}\n  said:  ${i.bg}\n  heard: ${i.result ? i.result.heard : '–'}`));
  $('report').value = lines.join('\n');
}

$('btn-begin').addEventListener('click', () => {
  recordOn = $('opt-record').checked; items = pickItems(); at = 0;
  if (!items.length) { $('support').textContent = 'No sentences available: set your Anki position in the app first.'; return; }
  $('setup').hidden = true; $('run').hidden = false; render();
});
$('btn-mic').addEventListener('click', listen);
$('btn-retry').addEventListener('click', () => { if (!listening) { delete items[at].result; render(); listen(); } });
$('btn-skip').addEventListener('click', () => next(true));
$('btn-next').addEventListener('click', () => next(false));
$('btn-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('report').value); $('btn-copy').textContent = 'Copied ✓'; } catch (e) { /** @type {HTMLTextAreaElement} */ (document.getElementById('report')).select(); $('btn-copy').textContent = 'Select all and copy'; }
});
document.addEventListener('keydown', e => {
  if ($('run').hidden || e.repeat) return;
  if (e.key === ' ') { e.preventDefault(); listen(); } else if (e.key === 'Enter' && !$('btn-next').disabled) { e.preventDefault(); next(false); }
});
support();
// for the headless test
/** @type {any} */ (window).TrakiaSpeakTest = { items: () => items };
})();
