const { chromium } = require('playwright');
const A = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('pass:', m); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto('file:///mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html');
  await p.waitForTimeout(400);
  await p.click('.tab[data-v="drill"]');

  // distinct control languages
  A(await p.$$eval('.seg .segbtn', e => e.length) === 2, 'view is a joined segmented control');
  A(await p.evaluate(() => document.getElementById('hlbtn').classList.contains('switch')), 'highlights is a switch with state dot');
  A(await p.$$eval('.ghost', e => e.length) === 2, 'actions are ghost buttons, distinct from filters');
  A(await p.evaluate(() => getComputedStyle(document.querySelector('.vdiv')).width === '1px'), 'divider separates actions from toggles');
  const focPrefix = await p.evaluate(() => getComputedStyle(document.querySelector('.fbtn.foc'), '::before').content);
  A(focPrefix.includes('+'), 'narrow chips signal combinability with + prefix');

  // COMBINABLE filtering: set × narrow
  const vis = () => p.$$eval('#view-drill .card', cs => cs.filter(c => c.style.display !== 'none').map(c => +c.dataset.n));
  await p.click('.fbtn[data-f="M"]');
  A((await vis()).length === 15, 'set M alone: 15');
  await p.click('.fbtn[data-f="dis"]');
  const both = await vis();
  A(both.length === 4 && [2,12,18,41].every(n => both.includes(n)), 'M ∩ Disputed = exactly {2,12,18,41}');
  A((await p.textContent('#showing')).includes('4 of 60'), 'live "showing N of 60" readout');
  // tap again clears narrow
  await p.click('.fbtn[data-f="dis"]');
  A((await vis()).length === 15, 'tapping active narrow chip clears it (back to 15)');
  // selected set chip shows check
  const setPrefix = await p.evaluate(() => getComputedStyle(document.querySelector('.fbtn[data-f="M"]'), '::before').content);
  A(setPrefix.includes('✓'), 'selected set chip shows ✓');
  // narrow + single view position counter
  await p.click('.fbtn[data-f="dis"]');
  await p.click('#vSingle');
  A((await p.textContent('#dpos')).includes('/ 4 (filtered)'), 'single view honors combined filter');
  await p.click('#vAll');

  // highlights switch state
  const dotOn = () => p.evaluate(() => getComputedStyle(document.querySelector('#hlbtn .dot')).backgroundColor);
  const on = await dotOn();
  await p.click('#hlbtn');
  A(await dotOn() !== on && !(await p.evaluate(() => document.getElementById('hlbtn').classList.contains('on'))), 'switch dot reflects off state');
  A(await p.evaluate(() => document.querySelector('.card[data-n="12"]').classList.contains('q-nohl')), 'switch actually toggles highlights');
  await p.click('#hlbtn');

  // reset clears combined state
  await p.evaluate(() => resetDrill());
  A(await p.evaluate(() => CURF === 'all' && CURFOC === null && document.getElementById('hlbtn').classList.contains('on')), 'reset clears set+narrow+switch');
  A((await p.textContent('#showing')).trim() === '', 'showing readout empty when unfiltered');
  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
})();
