const { chromium } = require('playwright');
const A = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('pass:', m); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto('file:///mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html');
  await p.waitForTimeout(400);
  await p.click('.tab[data-v="drill"]');
  const y = () => p.evaluate(() => Math.round(window.scrollY));
  const settle = async () => { let prev = -1; for (let i = 0; i < 30; i++) { const cur = await y(); if (cur === prev) return; prev = cur; await p.waitForTimeout(120); } };
  // steadiness = the clicked element stays at the same viewport position
  const steady = async (label, sel, tol=6) => {
    await settle();
    const top = () => p.evaluate(sel => Math.round(document.querySelector(sel).getBoundingClientRect().top), sel);
    const a = await top();
    await p.evaluate(sel => document.querySelector(sel).click(), sel);
    await p.waitForTimeout(350);
    const b2 = await top();
    A(Math.abs(b2 - a) <= tol, `${label}: clicked control stays put in viewport (${a}→${b2})`);
  };

  // In-Practice position: explwrap before choices in DOM, and appears under stem when toggled
  const order = await p.evaluate(() => {
    const body = document.querySelector('.card[data-n="1"] .body');
    const kids = [...body.children].map(e => e.className.split(' ')[0]);
    return kids.indexOf('explwrap') < kids.indexOf('choices') && kids.indexOf('explwrap') > kids.indexOf('stem');
  });
  A(order, 'In-Practice sits between question body and choices');

  // scroll-jump regression: the 4 reproduced jumps
  await p.evaluate(() => { const c = document.querySelector('.card[data-n="20"]'); c.classList.add('open'); c.scrollIntoView(); });
  await p.waitForTimeout(450);
  await p.evaluate(() => { LASTQ='20'; dockSync(); });
  await steady('choice plain toggle', '.card[data-n="20"] .choice[data-l="B"] .plainbtn');
  // reveal/hide: the CARD TOP (reading position) is the anchor now, not the button
  const cardSteady = async (label, fn) => {
    await settle();
    const top = () => p.evaluate(() => Math.round(document.querySelector('.card[data-n="20"]').getBoundingClientRect().top));
    const a = await top(); await fn(); await p.waitForTimeout(400); const b2 = await top();
    A(Math.abs(b2 - a) <= 2, `${label}: reading position (card top) stays put (${a}→${b2})`);
  };
  await cardSteady('reveal', () => p.evaluate(() => document.querySelector('.card[data-n="20"] .reveal').click()));
  await p.evaluate(() => document.querySelector('.card[data-n="20"] .revealrow').scrollIntoView({block:'center'}));
  await cardSteady('hide answer from deep scroll', () => p.evaluate(() => document.querySelector('.card[data-n="20"] .reveal').click()));
  // hide-all + filter now land predictably at list top
  await p.evaluate(() => { const c=document.querySelector('.card[data-n="30"]'); c.classList.add('open'); c.querySelector('.reveal').click(); c.scrollIntoView(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => hideAll());
  await p.waitForTimeout(300);
  const tb = await p.evaluate(() => document.querySelector('#view-drill .toolbar').getBoundingClientRect().top);
  A(tb > -120 && tb < 200, 'hide-all lands at list top (toolbar at ' + Math.round(tb) + 'px)');
  await p.evaluate(() => document.querySelector('.card[data-n="50"]').scrollIntoView());
  await p.waitForTimeout(300);
  await p.click('.fbtn[data-f="E"]');
  await p.waitForTimeout(300);
  const tb2 = await p.evaluate(() => document.querySelector('#view-drill .toolbar').getBoundingClientRect().top);
  A(tb2 > -120 && tb2 < 200, 'filter switch lands at list top');

  // SINGLE VIEW
  await p.click('#vSingle');
  await p.waitForTimeout(200);
  let visible = await p.$$eval('#view-drill .card', cs => cs.filter(c => c.style.display !== 'none').map(c => c.dataset.n));
  A(visible.length === 1, 'single view shows exactly one card');
  A((await p.textContent('#dpos')).includes('1 / 10'), 'single view respects set filter (E: 1/10) — got ' + (await p.textContent('#dpos')));
  A(await p.evaluate(v => document.querySelector('.card[data-n="'+v+'"]').classList.contains('open'), visible[0]), 'single view auto-opens the card');
  await p.evaluate(() => dnav(1));
  const v2 = await p.$$eval('#view-drill .card', cs => cs.filter(c => c.style.display !== 'none').map(c => c.dataset.n));
  A(v2[0] !== visible[0] && v2.length === 1, 'single next advances within filter');
  await p.evaluate(() => dnav(-1));
  // switch back to all
  await p.click('#vAll');
  visible = await p.$$eval('#view-drill .card', cs => cs.filter(c => c.style.display !== 'none').length);
  A(visible === 10, 'all view restores filtered list (10 E cards)');

  // jump in single mode
  await p.click('#vSingle');
  await p.click('.tab[data-v="key"]');
  await p.evaluate(() => jump(15));
  await p.waitForTimeout(300);
  const jv = await p.$$eval('#view-drill .card', cs => cs.filter(c => c.style.display !== 'none').map(c => c.dataset.n));
  A(jv.length === 1 && jv[0] === '15', 'jump in single mode lands on Q15 alone');

  // RESET
  await p.evaluate(() => { const c = document.querySelector('.card[data-n="15"]'); c.classList.add('hinted','q-nohl'); c.querySelector('.reveal').click(); });
  await p.evaluate(() => resetDrill());
  await p.waitForTimeout(200);
  const clean = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#view-drill .card')];
    return cards.every(c => !c.classList.contains('revealed') && !c.classList.contains('hinted') && !c.classList.contains('q-nohl') && !c.classList.contains('q-showgist') && !c.classList.contains('q-showex') && !c.classList.contains('open'))
      && document.querySelector('.fbtn[data-f="all"]').classList.contains('on');
  });
  A(clean, 'reset clears every toggle, collapse state, and filter');
  const stillFlag = await p.evaluate(() => { flag(document.querySelector('.card[data-n="3"] .flag')); const n = document.querySelectorAll('.flag.on').length; resetDrill(); return document.querySelectorAll('.flag.on').length === n; });
  A(stillFlag, 'reset preserves flags (user data)');
  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
})();
