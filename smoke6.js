const { chromium } = require('playwright');
const A = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('pass:', m); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto('file:///mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html');
  await p.waitForTimeout(400);

  // DRILL individual toggles
  await p.click('.tab[data-v="drill"]');
  await p.evaluate(() => { const c=document.querySelector('.card[data-n="8"]'); c.classList.add('open'); c.scrollIntoView({block:'start',behavior:'instant'}); LASTQ='8'; dockSync(); });
  const g = n => p.evaluate(n => { const e = document.querySelector(`.card[data-n="${n}"] .gist`); return e.getBoundingClientRect().height > 3 && parseFloat(getComputedStyle(e).opacity) > .5; }, n);
  const e = n => p.evaluate(n => { const x = document.querySelector(`.card[data-n="${n}"] .explwrap`); return x.getBoundingClientRect().height > 3 && parseFloat(getComputedStyle(x).opacity) > .5; }, n);
  A(!(await g(8)) && !(await e(8)), 'gists + in-practice hidden by default');
  await p.evaluate(() => dockAssist(document.querySelector('.dockbtn[data-k="gist"]')));
  await p.waitForTimeout(320);
  A(await g(8), 'Gists toggle shows gists WITHOUT reveal');
  A(await p.evaluate(() => getComputedStyle(document.querySelector('.card[data-n="8"] .verdict')).display) === 'none', 'gist toggle does not spoil verdicts');
  await p.evaluate(() => dockAssist(document.querySelector('.dockbtn[data-k="ex"]')));
  await p.waitForTimeout(320);
  A(await e(8), 'In-practice toggle shows snippet WITHOUT reveal');
  A(await p.evaluate(() => { const a = document.querySelector('.card[data-n="8"] .afterreveal'); return getComputedStyle(a).display === 'none'; }), 'disputed/debate bands still hidden (no spoilers)');
  // scoping: card 9 untouched
  A(!(await g(9)), 'toggles scoped: Q9 gists still hidden');
  // reveal still shows everything
  await p.evaluate(() => document.querySelector('.card[data-n="9"]').classList.add('open'));
  await p.evaluate(() => document.querySelector('.card[data-n="9"] .reveal').click());
  await p.waitForTimeout(350);
  A((await g(9)) && (await e(9)), 'reveal still shows gists + in-practice');

  // EXAM scroll behavior
  await p.click('.tab[data-v="exam"]');
  await p.click('.modebtn.sel'); await p.waitForTimeout(300);
  await p.evaluate(() => window.scrollTo({top: 0}));
  await p.waitForTimeout(200);
  await p.evaluate(() => exPick('B'));
  await p.waitForTimeout(700); // smooth scroll
  const navVisible = await p.evaluate(() => {
    const r = document.querySelector('.exnav').getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight + 2;
  });
  A(navVisible, 'picking a choice scrolls Next button into view');
  const yAfterPick = await p.evaluate(() => window.scrollY);
  A(yAfterPick > 0, 'pick does NOT jump to top (scrollY=' + yAfterPick + ')');
  await p.evaluate(() => exNav(1));
  await p.waitForTimeout(700);
  A(await p.evaluate(() => window.scrollY) === 0, 'Next navigation returns to top of new question');
  await p.evaluate(() => clearInterval(EX.tick));
  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
})();
