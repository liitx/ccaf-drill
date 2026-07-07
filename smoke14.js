const { chromium, devices } = require('playwright');
const A = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('pass:', m); };
(async () => {
  const b = await chromium.launch();
  let p = await (await b.newContext()).newPage({ viewport: { width: 1000, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html');
  await p.waitForTimeout(500);

  // toolbar redesign: three labeled groups
  await p.click('.tourskip');
  await p.click('.tab[data-v="drill"]');
  A(await p.$$eval('.toolbar .cluster', e => e.length) === 3, 'toolbar grouped into 3 labeled rows');
  const labels = await p.$$eval('.toolbar .cluslab', e => e.map(x => x.textContent));
  A(labels.some(l => l.includes('Set')) && labels.some(l => l.includes('Narrow')) && labels.some(l => l.includes('View')), 'group labels: Set / Narrow / View');
  A(await p.evaluate(() => document.querySelector('#tg-sets .fbtn[data-f="E"]') !== null && document.querySelector('#tg-focus .fbtn[data-f="flag"]') !== null && document.querySelector('#tg-view #vSingle') !== null), 'pills sorted into correct groups');
  A(await p.evaluate(() => { const c = document.querySelector('.card[data-n="1"]'); c.classList.add('open'); LASTQ='1'; dockSync(); return document.getElementById('dock').style.display === 'flex'; }), 'floating dock appears for the open question');

  // spotlight launches from tour CTA
  await p.click('#helpbtn');
  for (let i = 0; i < 3; i++) await p.click('#tnext');
  A((await p.textContent('#tnext')).includes('Walk me through'), 'tour CTA offers screen walkthrough');
  await p.click('#tnext');
  await p.waitForTimeout(400);
  A(await p.evaluate(() => document.getElementById('spot').style.display !== 'none'), 'spotlight opens');
  // ring over the tabs on step 1
  const over = await p.evaluate(() => {
    const r = document.getElementById('spotring').getBoundingClientRect();
    const t = document.querySelector('.tabs').getBoundingClientRect();
    return Math.abs(r.left + 6 - t.left) < 12 && Math.abs(r.top + 6 - t.top) < 12;
  });
  A(over, 'ring frames the target component');
  // walk all 10 steps, ring must track a visible target each time
  let allTracked = true;
  for (let i = 0; i < 9; i++) {
    await p.click('#snext'); await p.waitForTimeout(350);
    const ok = await p.evaluate(() => { const r = document.getElementById('spotring').getBoundingClientRect(); return r.width > 20 && r.height > 10 && r.top > -50 && r.top < window.innerHeight; });
    if (!ok) { allTracked = false; console.log('  step', i + 2, 'ring lost'); }
  }
  A(allTracked, 'ring tracks all 10 components through view switches');
  A((await p.textContent('#snext')).includes('Finish'), 'last step shows Finish');
  const tipTexts = await p.evaluate(() => SPOT_STEPS.map(s => s.t + ' ' + s.p).join(' '));
  A(tipTexts.includes('Sets') && tipTexts.includes('Flagged') && tipTexts.includes('Single') && tipTexts.includes('Hint') && tipTexts.includes('dock') && tipTexts.includes('plain') && tipTexts.includes('Reveal') && tipTexts.includes('Easy/Medium/Hard'), 'walkthrough covers pills, toggles, per-choice minis, reveal, exam modes');
  await p.click('#snext'); // finish
  await p.waitForTimeout(400);
  A(await p.evaluate(() => document.getElementById('spot').style.display === 'none'), 'finish closes spotlight');
  A(await p.evaluate(() => document.getElementById('view-key').classList.contains('on') && document.getElementById('ksec0').classList.contains('open')), 'finish lands in Key guide');
  A(await p.evaluate(() => !document.querySelector('.card[data-n="1"]').classList.contains('revealed') && !document.querySelector('.card[data-n="1"]').classList.contains('open')), 'walkthrough cleans up after itself (Q1 restored)');

  // exit mid-way restores prior view
  await p.click('.tab[data-v="exam"]');
  await p.evaluate(() => spotStart());
  await p.waitForTimeout(300);
  await p.evaluate(() => spotEnd(false));
  await p.waitForTimeout(300);
  A(await p.evaluate(() => document.getElementById('view-exam').classList.contains('on')), 'mid-exit restores the view you came from');

  // mobile: tooltip pinned bottom, fits
  const mctx = await b.newContext({ ...devices['iPhone 12'], hasTouch: true });
  const mp = await mctx.newPage();
  await mp.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await mp.goto('file:///mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html');
  await mp.waitForTimeout(400);
  await mp.evaluate(() => spotStart());
  await mp.waitForTimeout(400);
  const mfit = await mp.evaluate(() => { const t = document.getElementById('spottip').getBoundingClientRect(); return t.left >= 0 && t.right <= window.innerWidth + 1 && t.bottom <= window.innerHeight + 1; });
  A(mfit, 'mobile tooltip pinned to bottom, fits viewport');
  await mp.tap('#snext');
  A(await mp.evaluate(() => document.getElementById('spotstep').textContent.includes('2 /')), 'touch advances walkthrough');
  await mctx.close();
  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
})();
