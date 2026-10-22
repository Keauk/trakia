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
for (const f of ['data.js', 'core.js', 'ui.js']) window.eval(fs.readFileSync(path.join(APP, f), 'utf8'));
const $ = id => document.getElementById(id);
const type = (v, key) => { $('answer').value = v; $('answer').dispatchEvent(new window.Event('input')); $('answer').dispatchEvent(new window.KeyboardEvent('keydown', { key: key || 'Enter' })); };
const C = window.TrakiaCore;

// home renders with the deck position
assert.match($('home-summary').textContent, /fit your Anki position \(word 102\)/);
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
const longest = s2.nl.split(/\s+/).sort((a, b) => b.length - a.length)[0];
const typo = s2.nl.replace(longest, longest[0] + (longest[1] === 'q' ? 'x' : 'q') + longest.slice(2));  // one letter replaced by q, so it is no real word (D-014)
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
// --- autofill: answer field is a single-line textarea; a keyboard-inserted line break submits
assert.equal($('answer').tagName, 'TEXTAREA'); assert.equal($('answer').getAttribute('autocomplete'), 'off');
document.querySelector('nav button[data-tab=practise]').click();
$('btn-home').click(); $('btn-start').click();
$('answer').value = 'iets\n'; $('answer').dispatchEvent(new window.InputEvent('input', { inputType: 'insertLineBreak' }));
assert.equal($('feedback').hidden, false, 'line break from the keyboard submits the answer');
assert.ok(!/\n/.test($('answer').value), 'no newline left in the field');
$('btn-quit').click(); $('btn-home').click();
// --- D-012: collapsible alternatives
document.querySelector('nav button[data-tab=practise]').click();
$('btn-home').click(); $('btn-start').click();
{
  let checked = false;
  for (let i = 0; i < 40 && !$('session-run').hidden && !checked; i++) {
    type('zzz qqq');
    if (!$('alts').hidden) {
      const n = $('alts').querySelectorAll('li').length;
      assert.ok(n >= 1);
      assert.equal($('alts').open, false, 'collapsed by default');
      assert.match($('alts').querySelector('summary').textContent, new RegExp('^' + n + ' other accepted answer'));
      assert.ok(!$('feedback').textContent.includes('Also accepted:'), 'no inline list any more');
      $('alts').open = true; $('alts').dispatchEvent(new window.Event('toggle'));
      assert.equal(JSON.parse(window.localStorage.getItem('trakia.altsOpen')), true, 'open state remembered');
      $('alts').open = false; $('alts').dispatchEvent(new window.Event('toggle'));
      assert.equal(JSON.parse(window.localStorage.getItem('trakia.altsOpen')), false);
      checked = true;
    }
    type('', 'Enter');
  }
  assert.ok(checked, 'found a card with alternatives');
  if (!$('session-run').hidden) $('btn-quit').click();
  $('btn-home').click();
}
// --- D-009: grammar tab and drills
document.querySelector('nav button[data-tab=grammar]').click();
assert.ok(document.querySelectorAll('#grammar-cards details').length >= 15, 'grammar cards rendered');
assert.ok($('grammar-cards').textContent.includes('съм'), 'tables contain forms');
document.querySelector('nav button[data-tab=practise]').click();
$('btn-home').click();
$('btn-gdrill').click();
assert.equal($('session-run').hidden, false); assert.equal($('dir-badge').textContent, 'Grammar drill');
assert.equal($('counter').textContent, '1 / 15');
// answer the first item correctly using the generated answer, the second wrongly
const drillItems = Object.fromEntries(C.drillItems(window.TRAKIA_DATA.grammar, 5).map(it => [it.prompt + '|' + it.hint, it]));
let it = drillItems[$('prompt').textContent + '|' + $('newwords').textContent];
assert.ok(it, 'drill prompt maps to a generated item');
type(it.answers[0]);
assert.match($('verdict').className, /correct/);
assert.ok($('gloss').textContent.startsWith('See:'), 'link to the grammar card');
type('', 'Enter');
type('ггг');
assert.match($('verdict').className, /wrong/);
assert.equal($('btn-accept').hidden, true, 'no accept-my-answer in drills');
type('', 'Enter');
const tally = JSON.parse(window.localStorage.getItem('trakia.drills'));
assert.equal(Object.values(tally).reduce((a, t) => a + t.ok + t.bad, 0), 2);
assert.equal(JSON.parse(window.localStorage.getItem('trakia.drillLog')).length, 2);
// drills never touch the review progress
assert.equal(Object.keys(JSON.parse(window.localStorage.getItem('trakia.progress'))).filter(k => k.startsWith('drill')).length, 0);
$('btn-quit').click();
assert.match($('done-summary').textContent, /Grammar drill/);
assert.equal($('btn-again').textContent, 'Drill again');
document.querySelector('nav button[data-tab=stats]').click();
assert.match($('stats-drills').textContent, /drill answers today/);
assert.ok($('weak-forms').textContent.length > 5, 'weak forms table rendered');
// drill a single table from the grammar tab
document.querySelector('nav button[data-tab=grammar]').click();
document.querySelector('[data-drill=sum]').click();
assert.equal($('dir-badge').textContent, 'Grammar drill');
assert.ok(/\+ съм$/.test($('prompt').textContent), 'single-table drill: ' + $('prompt').textContent);
$('btn-quit').click(); $('btn-home').click();
// --- D-011: English practice language
const nlProgressBefore = Object.keys(JSON.parse(window.localStorage.getItem('trakia.progress'))).filter(k => /\|(bg2nl|nl2bg)$/.test(k)).length;
document.querySelector('nav button[data-tab=settings]').click();
$('set-lang').value = 'en'; $('set-lang').dispatchEvent(new window.Event('input'));
assert.equal(JSON.parse(window.localStorage.getItem('trakia.settings')).lang, 'en');
document.querySelector('nav button[data-tab=practise]').click();
assert.match($('home-summary').textContent, /practising in English/);
$('btn-start').click();
assert.equal($('session-run').hidden, false);
assert.equal($('dir-badge').textContent, 'BG → EN', 'first English card is BG → EN');
const sEn = window.TRAKIA_DATA.sentences.find(x => x.bg === $('prompt').textContent);
assert.ok(sEn, 'prompt is a sentence');
assert.equal($('answer').placeholder, 'Enter translation');
type(sEn.en);
assert.match($('verdict').className, /correct/, 'English primary accepted: ' + $('verdict').textContent);
assert.match($('gloss').textContent, /^NL: /, 'third language shown as gloss');
type('', 'Enter');
// a contraction / spelling variant of the next English answer is still correct
const sEn2 = window.TRAKIA_DATA.sentences.find(x => x.bg === $('prompt').textContent);
type(sEn2.en.replace(/\bI am\b/, "I'm").replace(/\bdo not\b/, "don't").replace(/\bcolor\b/, 'colour'));
assert.match($('verdict').className, /correct|almost/, 'variant accepted: ' + $('verdict').textContent);
type('', 'Enter');
// D-014: a looser translation is correct, tagged "≈ looser", and shows the closer exact answer with a diff
const sEn3 = window.TRAKIA_DATA.sentences.find(x => x.bg === $('prompt').textContent);
sEn3.en_loose = ['Something rather loosely rendered.'];
type('Something rather loosely rendered');
assert.match($('verdict').className, /correct/, 'loose answer accepted: ' + $('verdict').textContent);
assert.ok($('verdict').querySelector('.loose-tag'), 'loose tag shown');
assert.equal($('expected-label').textContent, 'Closer to the Bulgarian');
assert.ok([sEn3.en].concat(sEn3.en_alt || []).includes($('expected').textContent), 'closer is an exact answer: ' + $('expected').textContent);
assert.ok($('diff').innerHTML.includes('<ins>'), 'diff against the closer answer');
assert.ok([...$('alts').querySelectorAll('li.loose')].length === 0, 'the typed loose answer is not listed again');
delete sEn3.en_loose;
type('', 'Enter');
assert.equal($('expected-label').textContent, 'Closer to the Bulgarian', 'label is only reset on the next verdict');
$('btn-quit').click();
const progEn = JSON.parse(window.localStorage.getItem('trakia.progress'));
assert.ok(Object.keys(progEn).some(k => k.endsWith('|bg2en')), 'English cards stored under their own keys');
assert.equal(Object.keys(progEn).filter(k => /\|(bg2nl|nl2bg)$/.test(k)).length, nlProgressBefore, 'Dutch progress untouched');
// the English card unlocks its production card in the next session
$('btn-home').click(); $('btn-start').click();
let sawEnProd = false;
for (let i = 0; i < 60 && !$('session-run').hidden; i++) { if ($('dir-badge').textContent === 'EN → BG') { sawEnProd = true; break; } $('btn-dontknow').click(); $('btn-next').click(); }
assert.ok(sawEnProd, 'EN → BG card appeared');
assert.equal($('prompt').lang, 'en');
$('btn-quit').click(); $('btn-home').click();
// Library shows English under the Bulgarian and English columns
document.querySelector('nav button[data-tab=library]').click();
assert.ok($('lib-table').textContent.includes('BG→EN'), 'library header follows the language');
// back to Dutch: Dutch cards are the ones served again
document.querySelector('nav button[data-tab=settings]').click();
$('set-lang').value = 'nl'; $('set-lang').dispatchEvent(new window.Event('input'));
document.querySelector('nav button[data-tab=practise]').click();
$('btn-start').click();
assert.ok(/NL/.test($('dir-badge').textContent), 'Dutch direction again: ' + $('dir-badge').textContent);
$('btn-quit').click(); $('btn-home').click();
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
