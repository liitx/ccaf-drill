const { chromium, devices } = require('playwright');
const A = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('pass:', m); };
(async () => {
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
})();
