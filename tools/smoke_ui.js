// Headless UI smoke test with jsdom: node tools/smoke_ui.js  (needs `jsdom` resolvable via NODE_PATH)
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path'), assert = require('assert');
const APP = path.join(__dirname, '..', 'app');
const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
const dom = new JSDOM(html, { url: 'http://localhost/app/index.html', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom; const { document } = window;
window.HTMLCanvasElement.prototype.getContext = () => null;   // no canvas in jsdom
window.confirm = () => true;
// jsdom's Blob has no text()/arrayBuffer(); real browsers do
window.Blob.prototype.text = function () { return new Promise(r => { const fr = new window.FileReader(); fr.onload = () => r(fr.result); fr.readAsText(this); }); }; window.URL.createObjectURL = () => 'blob:x'; window.URL.revokeObjectURL = () => {};
for (const f of ['data.js', 'core.js']) window.eval(fs.readFileSync(path.join(APP, f), 'utf8'));
window.eval(html.match(/<script>([\s\S]*)<\/script>/)[1]);
const $ = id => document.getElementById(id);
const type = (v, key) => { $('answer').value = v; $('answer').dispatchEvent(new window.Event('input')); $('answer').dispatchEvent(new window.KeyboardEvent('keydown', { key: key || 'Enter' })); };
const C = window.TrakiaCore;

// home renders with the deck position
assert.match($('home-summary').textContent, /within your Anki position \(word 102\)/);
assert.match($('hdr-rank').textContent, /word 102/);
// start a session -> first card is BG->NL, lowest rank first
$('btn-start').click();
assert.equal($('session-run').hidden, false);
assert.equal($('dir-badge').textContent, 'BG → NL');
const id = (() => { const txt = $('prompt').textContent; return window.TRAKIA_DATA.sentences.find(s => s.bg === txt); })();
assert.ok(id, 'prompt is a bundled sentence');
// exact answer -> correct
type(id.nl);
assert.match($('verdict').className, /correct/);
assert.equal($('btn-accept').hidden, true);
type('', 'Enter'); // next
// second card: one typo -> almost
const s2 = window.TRAKIA_DATA.sentences.find(s => s.bg === $('prompt').textContent);
const typo = s2.nl.slice(0, -2) + s2.nl.slice(-1);  // drop one char
type(typo);
assert.match($('verdict').className, /almost/, 'typo counts as almost: ' + $('verdict').textContent);
assert.ok($('diff').innerHTML.includes('<ins>'), 'diff shows the missing char');
type('', 'Enter');
// third card: nonsense -> wrong, then accept my answer -> correct and stored
const s3 = window.TRAKIA_DATA.sentences.find(s => s.bg === $('prompt').textContent);
type('dit is helemaal fout');
assert.match($('verdict').className, /wrong/);
assert.equal($('btn-accept').hidden, false);
$('btn-accept').click();
assert.match($('verdict').className, /correct/);
assert.deepEqual(JSON.parse(window.localStorage.getItem('trakia.userAlts'))[s3.id + '|bg2nl'], ['dit is helemaal fout']);
type('', 'Enter');
// fourth: don't know -> wrong and re-queued
const s4 = window.TRAKIA_DATA.sentences.find(s => s.bg === $('prompt').textContent);
const before = $('counter').textContent.split(' / ')[1];
$('btn-dontknow').click();
assert.match($('verdict').className, /wrong/);
$('btn-next').click();
assert.equal(+$('counter').textContent.split(' / ')[1], +before + 1, 'wrong card appended for retry');
// progress persisted
const prog = JSON.parse(window.localStorage.getItem('trakia.progress'));
assert.equal(prog[id.id + '|bg2nl'].box, 1); assert.equal(prog[s2.id + '|bg2nl'].box, 1); assert.equal(prog[s3.id + '|bg2nl'].box, 1); assert.equal(prog[s4.id + '|bg2nl'].box, 0);
// end session, check summary
$('btn-quit').click();
assert.equal($('session-done').hidden, false);
assert.match($('done-stats').textContent, /correct/);
// stats + library + settings tabs render without throwing
document.querySelector('nav button[data-tab=stats]').click();
assert.match($('stats-today').textContent, /answers/);
assert.ok($('hardest').textContent.length > 0);
document.querySelector('nav button[data-tab=library]').click();
assert.match($('lib-count').textContent, /^\d+ sentences/);
$('lib-filter').value = 'seen'; $('lib-filter').dispatchEvent(new window.Event('change'));
assert.equal($('lib-count').textContent, '4 sentences');
document.querySelector('nav button[data-tab=settings]').click();
assert.equal($('set-rank').value, '102');
$('set-rank').value = '600'; $('set-rank').dispatchEvent(new window.Event('input'));
assert.equal(JSON.parse(window.localStorage.getItem('trakia.settings')).rank, 600);
assert.match($('rank-help').textContent, /sentences eligible/);
// gated direction: after a correct bg2nl answer the nl2bg card becomes available
document.querySelector('nav button[data-tab=practise]').click();
$('btn-home').click();
$('btn-start').click();
let sawReverse = false;
for (let i = 0; i < 60 && !$('session-run').hidden; i++) { if ($('dir-badge').textContent === 'NL → BG') { sawReverse = true; break; } $('btn-dontknow').click(); $('btn-next').click(); }
assert.ok(sawReverse, 'reverse direction card appeared in the next session');
// translit preview on a NL->BG card
window.eval("window.__s = JSON.parse(localStorage.getItem('trakia.settings')); window.__s.translit = true; localStorage.setItem('trakia.settings', JSON.stringify(window.__s));");
// (setting is read at card render; simulate via the checkbox)
document.querySelector('nav button[data-tab=settings]').click(); $('set-translit').checked = true; $('set-translit').dispatchEvent(new window.Event('change'));
document.querySelector('nav button[data-tab=practise]').click();
$('answer').value = 'kupih hlyab'; $('answer').dispatchEvent(new window.Event('input'));
assert.equal($('translit-preview').textContent, 'купих хляб');
// import a CSV with lemmas and one estimated row
const csv = 'bg,nl,nl_alt,lemmas\n"Дай ми хляб.",Geef me brood.,Geef mij brood.,"аз, хляб"\n"Това е тест.",Dit is een test.,,\n';
const file = new window.File([csv], 'extra.csv', { type: 'text/csv' });
const inp = $('import-file'); Object.defineProperty(inp, 'files', { value: [file] });
inp.dispatchEvent(new window.Event('change'));
setTimeout(() => {
  assert.match($('import-result').textContent, /2 added/);
  const us = JSON.parse(window.localStorage.getItem('trakia.userSentences'));
  const vals = Object.values(us);
  assert.equal(vals.length, 2);
  assert.ok(vals.some(s => s.rank_estimated === true), 'row without lemmas is rank-estimated');
  assert.ok(vals.some(s => s.max_rank > 0 && s.nl_alt[0] === 'Geef mij brood.'));
  // export progress produces a file
  let downloaded = null; const origCreate = document.createElement.bind(document);
  document.createElement = tag => { const el = origCreate(tag); if (tag === 'a') el.click = () => { downloaded = el.download; }; return el; };
  $('btn-export-progress').click();
  assert.match(downloaded, /^trakia-progress-/);
  console.log('UI smoke test passed');
}, 100);
