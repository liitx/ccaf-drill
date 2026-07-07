const { chromium } = require('playwright');
const A = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('pass:', m); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto('file:///mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html');
  await p.waitForTimeout(400);
  // cheat codes present + clickable Q link jumps
  A(await p.$$eval('.pat', e => e.length) === 12, '12 cheat codes restored in Key view');
  await p.evaluate(() => document.querySelector('.pqs .qlink').click());
  await p.waitForTimeout(500);
  A(await p.evaluate(() => document.getElementById('view-drill').classList.contains('on')), 'cheat-code Q link jumps to drill');
  A(await p.evaluate(() => document.querySelector('.card[data-n="1"]').classList.contains('open')), 'P1 first Q (1) opened');
  // hint flow on Q12 (unrevealed) — reset filter first (cheat link scoped it)
  await p.evaluate(() => filt(document.querySelector('.fbtn[data-f="all"]')));
  await p.evaluate(() => { document.querySelector('.card[data-n="12"]').classList.add('open'); document.querySelector('.card[data-n="12"]').scrollIntoView({block:'start',behavior:'instant'}); LASTQ='12'; dockSync(); });
  const vis = '(el)=>{const r=el.getBoundingClientRect();return r.height>3&&parseFloat(getComputedStyle(el).opacity)>.5}', hid = '(el)=>{const r=el.getBoundingClientRect();return r.height<=3||parseFloat(getComputedStyle(el).opacity)<=.5}';
  const plainVis = n => p.evaluate(n => { const e = document.querySelector(`.card[data-n="${n}"] .choice .cplain`); return e.getBoundingClientRect().height > 3 && parseFloat(getComputedStyle(e).opacity) > .5; }, n);
  A(!(await plainVis(12)), 'plain lines hidden before hint');
  A(await p.evaluate(`(${hid})(document.querySelector('.card[data-n="12"] .hintbox'))`), 'hint box hidden initially');
  await p.evaluate(() => dockAssist(document.querySelector('.dockbtn[data-k="hint"]')));
  await p.waitForTimeout(320);
  A(await p.evaluate(`(${vis})(document.querySelector('.card[data-n="12"] .hintbox'))`), 'hint box shows on click');
  A(await plainVis(12), 'plain rephrases appear with hint');
  A(await p.evaluate(() => document.querySelectorAll('.card[data-n="12"] .verdict:not([style])').length > 0 && getComputedStyle(document.querySelector('.card[data-n="12"] .verdict')).display === 'none'), 'verdicts STILL hidden after hint (no spoil)');
  const ask = await p.textContent('.card[data-n="12"] .hintbox');
  A(ask.includes('STRUCTURAL') || ask.toLowerCase().includes('really asking') , 'hint content present');
  // reveal also shows plain
  await p.evaluate(() => document.querySelector('.card[data-n="30"]').classList.add('open'));
  await p.evaluate(() => document.querySelector('.card[data-n="30"] .reveal').click());
  await p.waitForTimeout(400);
  A(await plainVis(30), 'reveal alone also shows plain lines');
  A(await p.$$eval('.cplain', e => e.length) === 240, '240 plain lines present');
  A(await p.$$eval('.hintbox', e => e.length) === 60, '60 hint boxes present');
  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
})();
