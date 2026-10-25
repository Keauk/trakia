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
// D-015: one progress segment per card, current one marked; chips mirrored for phones; phone layout flag
const qLen = +$('counter').textContent.split(' of ')[1];
assert.equal($('counter').textContent, '1 of ' + qLen); assert.equal($('counter-m').textContent, '1/' + qLen);
assert.equal($('segs').children.length, qLen); assert.equal($('segs').children[0].className, 'cur');
assert.ok($('chips-m').textContent.includes('BG → NL') && !$('chips-m').querySelector('[id]'), 'chips mirrored without ids');
assert.ok(document.body.classList.contains('running'));
assert.equal($('run-card').dataset.state, 'idle');
const id = (() => { const txt = $('prompt').textContent; return window.TRAKIA_DATA.sentences.find(s => s.bg === txt); })();
assert.ok(id, 'prompt is a bundled sentence');
// exact answer -> correct
type(id.nl);
assert.match($('verdict').className, /correct/);
assert.equal($('run-card').dataset.state, 'correct'); assert.equal($('verdict').textContent, '✓ Correct');
assert.equal($('expected').querySelector('mark'), null, 'exact answer: nothing highlighted'); assert.equal($('verdict-note').textContent, '');
assert.equal($('btn-accept').hidden, true);
type('', 'Enter'); // next
assert.equal($('segs').children[0].className, 'done'); assert.equal($('segs').children[1].className, 'cur');
// second card: one typo -> almost
const s2 = window.TRAKIA_DATA.sentences.find(s => s.bg === $('prompt').textContent);
const longest = s2.nl.split(/\s+/).sort((a, b) => b.length - a.length)[0];
const typo = s2.nl.replace(longest, longest[0] + (longest[1] === 'q' ? 'x' : 'q') + longest.slice(2));  // one letter replaced by q, so it is no real word (D-014)
// D-006: the note names the misspelt word
type(typo);
assert.match($('verdict').className, /almost/, 'typo counts as almost: ' + $('verdict').textContent);
assert.equal($('notes').hidden, false, 'explanation shown'); assert.match($('notes').textContent, /^spelling: /, 'spelling note: ' + $('notes').textContent);
assert.ok($('notes').textContent.includes(' → ' + longest.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '')), 'the note names the expected word: ' + $('notes').textContent);
assert.equal($('run-card').dataset.state, 'almost');
assert.ok($('expected').querySelector('mark'), 'the misspelt word is highlighted'); assert.match($('verdict-note').textContent, /character/);
assert.equal($('expected').textContent, s2.nl, 'highlighting keeps the sentence text');
type('', 'Enter');
// third card: nonsense -> wrong, then accept my answer -> correct and stored
const s3 = window.TRAKIA_DATA.sentences.find(s => s.bg === $('prompt').textContent);
type('dit is helemaal fout');
assert.match($('verdict').className, /wrong/);
assert.equal($('run-card').dataset.state, 'wrong'); assert.equal($('verdict-note').textContent, 'Differences highlighted');
assert.equal($('btn-accept').hidden, false);
$('btn-accept').click();
assert.match($('verdict').className, /correct/);
assert.deepEqual(JSON.parse(window.localStorage.getItem('trakia.userAlts'))[s3.id + '|bg2nl'], ['dit is helemaal fout']);
type('', 'Enter');
// fourth: don't know -> wrong and re-queued
const s4 = window.TRAKIA_DATA.sentences.find(s => s.bg === $('prompt').textContent);
const before = $('counter').textContent.split(' of ')[1];
$('btn-dontknow').click();
assert.match($('verdict').className, /wrong/);
assert.equal($('run-card').dataset.state, 'revealed'); assert.equal($('verdict').textContent, '→ Answer');
assert.equal($('expected').querySelector('mark'), null, 'a revealed answer has no highlights');
$('btn-next').click();
assert.equal(+$('counter').textContent.split(' of ')[1], +before + 1, 'wrong card appended for retry');
assert.equal($('segs').children.length, +before + 1, 'the retry adds a segment');
// progress persisted
const prog = JSON.parse(window.localStorage.getItem('trakia.progress'));
assert.equal(prog[id.id + '|bg2nl'].box, 1); assert.equal(prog[s2.id + '|bg2nl'].box, 1); assert.equal(prog[s3.id + '|bg2nl'].box, 1); assert.equal(prog[s4.id + '|bg2nl'].box, 0);
// end session, check summary
// Enter in the answer field checks and stops there (it used to reach the document handler and skip the result)
const s5 = window.TRAKIA_DATA.sentences.find(s => s.bg === $('prompt').textContent);
$('answer').value = 'qqq ' + s5.nl; $('answer').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
assert.equal($('feedback').hidden, false, 'Enter shows the result');
// D-019: an extra typed word is struck through in the expected line, the sentence itself unmarked
assert.equal($('expected').querySelector('del')?.textContent, 'qqq', 'the extra word is shown struck through');
assert.equal($('expected').querySelector('mark'), null); assert.equal($('expected').textContent, 'qqq ' + s5.nl);
document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, repeat: true }));
assert.equal($('feedback').hidden, false, 'a held Enter does not continue');
document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
assert.equal($('feedback').hidden, true, 'the next Enter continues');
$('btn-quit').click();
assert.equal($('session-done').hidden, false);
assert.ok(!document.body.classList.contains('running'));
assert.match($('done-stats').textContent, /correct/);
// stats + library + settings tabs render without throwing
document.querySelector('nav button[data-tab=stats]').click();
assert.match($('stats-today').textContent, /answers/);
assert.ok($('hardest').textContent.length > 0);
document.querySelector('nav button[data-tab=library]').click();
assert.match($('lib-count').textContent, /^\d+ sentences/);
$('lib-filter').value = 'seen'; $('lib-filter').dispatchEvent(new window.Event('change'));
assert.equal($('lib-count').textContent, '5 sentences');   // four cards above plus the Enter-key check
document.querySelector('nav button[data-tab=settings]').click();
// D-016: the top-bar switch flips light/dark, stores it and keeps the Settings select in step (jsdom has no dark system scheme)
assert.equal($('btn-theme').getAttribute('aria-label'), 'Switch to dark mode');
$('btn-theme').click();
assert.equal(document.documentElement.dataset.theme, 'dark'); assert.equal($('set-theme').value, 'dark');
assert.equal(JSON.parse(window.localStorage.getItem('trakia.settings')).theme, 'dark');
assert.equal($('btn-theme-m').getAttribute('aria-label'), 'Switch to light mode');
$('btn-theme-m').click();
assert.equal(document.documentElement.dataset.theme, 'light'); assert.equal($('set-theme').value, 'light');
assert.equal(document.querySelector('meta[name=theme-color]').getAttribute('content'), '#ffffff');
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
// --- D-012: collapsible alternatives; D-021: every card starts collapsed, the accept button under the toggle
document.querySelector('nav button[data-tab=practise]').click();
$('btn-home').click(); $('btn-start').click();
{
  let checked = 0;
  for (let i = 0; i < 40 && !$('session-run').hidden && checked < 2; i++) {
    type('zzz qqq');
    if (!$('alts').hidden) {
      const n = $('alts').querySelectorAll('li').length;
      assert.ok(n >= 1);
      assert.equal($('alts').open, false, checked ? 'collapsed again after the previous card was opened' : 'collapsed by default');
      assert.match($('alts').querySelector('summary').textContent, new RegExp('^' + n + ' other accepted answer'));
      assert.ok(!$('feedback').textContent.includes('Also accepted:'), 'no inline list any more');
      assert.equal($('alts').nextElementSibling, $('btn-accept'), '"My answer was correct" comes after the toggle');
      $('alts').open = true; $('alts').dispatchEvent(new window.Event('toggle'));
      assert.equal(window.localStorage.getItem('trakia.altsOpen'), null, 'open state not remembered');
      checked++;
    }
    type('', 'Enter');
  }
  assert.equal(checked, 2, 'found two cards with alternatives');
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
assert.equal($('counter').textContent, '1 of 15');
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
assert.equal($('answer').placeholder, 'Type the English translation');
// an accepted answer in lower case still highlights the capitals it lacks (D-015)
type(sEn.en.toLowerCase());
assert.match($('verdict').className, /correct/, 'English primary accepted in lower case: ' + $('verdict').textContent);
if (/\p{Lu}/u.test(sEn.en)) { assert.ok($('expected').querySelector('mark'), 'case difference highlighted'); assert.equal($('verdict-note').textContent, 'Accepted — small differences highlighted'); }
assert.match($('gloss').textContent, /^rank \d+/, 'only the rank under the answer (D-021): ' + $('gloss').textContent);
assert.ok(!$('gloss').textContent.includes(sEn.nl), 'no Dutch translation while practising English');
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
assert.equal($('expected-label').hidden, false); assert.equal($('expected-label').textContent, '→ Exact translation');
assert.ok([sEn3.en].concat(sEn3.en_alt || []).includes($('expected').textContent), 'closer is an exact answer: ' + $('expected').textContent);
assert.ok($('expected').querySelector('mark'), 'closer answer highlighted against what was typed');
assert.ok([...$('alts').querySelectorAll('li.loose')].length === 0, 'the typed loose answer is not listed again');
delete sEn3.en_loose;
type('', 'Enter');
type('zzz qqq');
assert.equal($('expected-label').hidden, true, 'an ordinary verdict hides the label again');
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
// D-021: cards in a row before switching keyboard
document.querySelector('nav button[data-tab=settings]').click();
assert.equal($('set-run').value, '1', 'default: switch on every card');
$('set-run').value = '4'; $('set-run').dispatchEvent(new window.Event('input'));
assert.equal(JSON.parse(window.localStorage.getItem('trakia.settings')).dirRun, 4, 'stored as a number');
document.querySelector('nav button[data-tab=practise]').click();
$('btn-start').click();
{
  const kbs = [];
  for (let i = 0; i < 80 && !$('session-run').hidden; i++) { if (!$('retry-badge').hidden) break; kbs.push(/→ BG$/.test($('dir-badge').textContent) ? 'C' : 'L'); $('btn-dontknow').click(); $('btn-next').click(); }
  const runs = kbs.join('').match(/C+|L+/g) || [];
  assert.ok(runs.slice(0, -2).every(r => r.length >= 4), 'blocks of four before the last two: ' + kbs.join(''));
}
if (!$('session-run').hidden) $('btn-quit').click();
$('btn-home').click();
document.querySelector('nav button[data-tab=settings]').click();
$('set-run').value = '1'; $('set-run').dispatchEvent(new window.Event('input'));
document.querySelector('nav button[data-tab=practise]').click();
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
