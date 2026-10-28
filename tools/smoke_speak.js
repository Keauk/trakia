// Headless test of the speech test page (D-033 phase 0): node tools/smoke_speak.js
// A fake recogniser "hears" what the page shows (lower case, no punctuation, like a real one), or a set text.
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path'), assert = require('assert');
const APP = path.join(__dirname, '..', 'app');
const dom = new JSDOM(fs.readFileSync(path.join(APP, 'speak-test.html'), 'utf8'), { url: 'http://localhost/app/speak-test.html', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom, { document } = window, $ = id => document.getElementById(id);
window.localStorage.setItem('trakia.settings', JSON.stringify({ rank: 150 }));
let hear = null, fail = null;
window.SpeechRecognition = class {
  start() {
    setTimeout(() => {
      if (fail) { this.onerror({ error: fail }); this.onend(); return; }
      const text = hear != null ? hear : $('say').textContent.toLowerCase().replace(/[.,!?„“]/g, '');
      const result = [{ transcript: text }, { transcript: text + ' да' }]; result.isFinal = true;
      this.onresult({ results: [result] }); this.onend();
    }, 0);
  }
  stop() {}
};
for (const f of ['data.js', 'core.js', 'speak-test.js']) window.eval(fs.readFileSync(path.join(APP, f), 'utf8'));
const tick = () => new Promise(r => setTimeout(r, 5));

(async () => {
  assert.match($('support').textContent, /bg-BG/);
  $('btn-begin').click();
  const items = window.TrakiaSpeakTest.items();
  assert.equal(items.filter(i => i.kind === 'sentence').length, 30); assert.equal(items.filter(i => i.kind === 'word').length, 10);
  for (let i = 0; i < items.length; i++) {
    assert.equal($('say').textContent, items[i].bg);
    if (i === 3) hear = 'нещо съвсем друго';
    if (i === 5) { $('btn-skip').click(); continue; }
    if (i === 7) { fail = 'language-not-supported'; $('btn-mic').click(); await tick(); assert.match($('verdict').textContent, /no Bulgarian/); fail = null; }
    $('btn-mic').click(); await tick();
    if (i === 3) { assert.match($('verdict').textContent, /Not accepted/); hear = null; } else assert.match($('verdict').textContent, /Accepted/, `${items[i].bg}: ${$('heard').textContent}`);
    assert.equal($('btn-next').disabled, false); $('btn-next').click();
  }
  assert.equal($('done').hidden, false);
  const report = $('report').value;
  assert.match(report, /Sentences: 28\/29 accepted/, report.split('\n')[2]); assert.match(report, /words: 10\/10/);
  assert.match(report, /skipped: 1/); assert.match(report, /tries 2/, 'the failed start counts as a try');
  console.log('Speech test page smoke test passed');
})().catch(e => { console.error(e); process.exit(1); });
