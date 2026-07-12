const { chromium, devices, A, URL, run, withServer } = require('./harness');

run('smoke13 — tour: first-visit, persistence, storage-blocked', () => withServer(async () => {

  const b = await chromium.launch();
  // 1) desktop, fresh visitor
  let ctx = await b.newContext();
  let p = await ctx.newPage({ viewport: { width: 900, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8931/index.html'); // http origin so localStorage persists
  await p.waitForTimeout(500);
  A(await p.evaluate(() => document.getElementById('tour').style.display !== 'none'), 'tour shows on first visit');
  A(await p.$$eval('.tourstep', e => e.length) === 4, '4 tour steps');
  A(await p.evaluate(() => getComputedStyle(document.getElementById('tprev')).visibility === 'hidden'), 'Back hidden on step 1');
  // navigate all steps
  for (let i = 0; i < 3; i++) await p.click('#tnext');
  A((await p.textContent('#tnext')).includes('Walk me through'), 'final step CTA');
  const stepTexts = await p.evaluate(() => [...document.querySelectorAll('.tourstep')].map(s => s.textContent).join(' '));
  A(stepTexts.includes('Learn') && stepTexts.includes('study loop') || stepTexts.includes('Four moves'), 'covers rooms + loop');
  A(stepTexts.includes('Hint') && stepTexts.includes('Ask Claude') && stepTexts.includes('Disputed'), 'covers assists + badges + disputed');
  await p.click('#tnext'); // CTA → spotlight
  await p.waitForTimeout(400);
  A(await p.evaluate(() => document.getElementById('tour').style.display === 'none'), 'CTA closes tour');
  A(await p.evaluate(() => document.getElementById('spot').style.display !== 'none'), 'CTA hands off to the component walkthrough');
  await p.evaluate(() => spotEnd(true));
  await p.waitForTimeout(300);
  // 2) persistence: reload same context → no tour
  await p.reload(); await p.waitForTimeout(500);
  A(await p.evaluate(() => document.getElementById('tour').style.display === 'none'), 'tour does not reappear after completion (persisted)');
  // 3) ? Tour reopens
  await p.click('#helpbtn');
  A(await p.evaluate(() => document.getElementById('tour').style.display !== 'none' && document.querySelector('.tourstep.on').dataset.s === '0'), '? Tour reopens at step 1');
  await p.click('.tourskip');
  A(await p.evaluate(() => document.getElementById('tour').style.display === 'none'), 'Skip dismisses');
  await ctx.close();
  // 4) storage-blocked environment (artifact-sandbox-like): must not crash, tour still usable
  ctx = await b.newContext();
  p = await ctx.newPage();
  await p.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
  const errs2 = []; p.on('pageerror', e => errs2.push(e.message));
  await p.goto('http://localhost:8931/index.html'); await p.waitForTimeout(500);
  A(errs2.length === 0, 'no crash when localStorage is blocked');
  A(await p.evaluate(() => document.getElementById('tour').style.display !== 'none'), 'tour still shows when storage blocked');
  await p.click('.tourskip');
  A(await p.evaluate(() => document.getElementById('tour').style.display === 'none'), 'skip works without storage');
  await ctx.close();
  // 5) mobile fit
  ctx = await b.newContext({ ...devices['iPhone 12'], hasTouch: true });
  p = await ctx.newPage();
  await p.goto('http://localhost:8931/index.html'); await p.waitForTimeout(500);
  const fit = await p.evaluate(() => { const r = document.querySelector('.tourbox').getBoundingClientRect(); return r.width <= window.innerWidth && r.height <= window.innerHeight; });
  A(fit, 'tour box fits phone viewport');
  A(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2), 'no overflow with tour open on phone');
  await p.tap('#tnext');
  A(await p.evaluate(() => document.querySelector('.tourstep.on').dataset.s === '1'), 'touch navigation works');
  await ctx.close();
  console.log(errs.length ? 'JS ERRORS: ' + errs.join('|') : 'no JS errors');
  await b.close();
}));

run('smoke14 — toolbar clusters, spotlight end-to-end', async () => {

  const b = await chromium.launch();
  let p = await (await b.newContext()).newPage({ viewport: { width: 1000, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
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
  for (let i = 0; i < 10; i++) {
    await p.click('#snext'); await p.waitForTimeout(350);
    const ok = await p.evaluate(() => { const r = document.getElementById('spotring').getBoundingClientRect(); return r.width > 20 && r.height > 10 && r.top > -50 && r.top < window.innerHeight; });
    if (!ok) { allTracked = false; console.log('  step', i + 2, 'ring lost'); }
  }
  A(allTracked, 'ring tracks all 11 components through view switches');
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
  await mp.goto(URL);
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
});
