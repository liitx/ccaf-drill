const { chromium } = require('playwright');
const A = (c, msg) => { if (!c) { console.log('FAIL:', msg); process.exitCode = 1; } else console.log('pass:', msg); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 900 } });
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto('file:///mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html');
  await p.waitForTimeout(500);

  // 1. default dark
  A(await p.evaluate(() => document.body.classList.contains('dark')), 'loads dark by default');
  // 2. theme toggle both ways
  await p.click('#themebtn');
  A(!(await p.evaluate(() => document.body.classList.contains('dark'))), 'toggle to light');
  await p.click('#themebtn');
  A(await p.evaluate(() => document.body.classList.contains('dark')), 'toggle back to dark');

  // 3. key view visible, 6 panels, 60 rows
  A(await p.evaluate(() => document.getElementById('view-key').classList.contains('on')), 'key view on by default');
  A(await p.$$eval('.keypanel', e => e.length) === 6, '6 key panels');
  A(await p.$$eval('.keytable tbody tr.krow', e => e.length) === 60, '60 key rows');

  // 4. answers bar removed by design
  A(await p.$$eval('.keyansbar, .ansdot', e => e.length) === 0, 'answers toggle bar removed');

  // 5. key row click jumps to drill and opens card
  await p.evaluate(() => jump(15));
  await p.waitForTimeout(600);
  A(await p.evaluate(() => document.getElementById('view-drill').classList.contains('on')), 'jump switches to drill');
  A(await p.evaluate(() => document.querySelector('.card[data-n="15"]').classList.contains('open')), 'jump opens Q15');
  // is the card header visible below sticky bars?
  const vis = await p.evaluate(() => {
    const r = document.querySelector('.card[data-n="15"]').getBoundingClientRect();
    const tabs = document.querySelector('.tabs').getBoundingClientRect();
    const tb = document.querySelector('.toolbar').getBoundingClientRect();
    const stickyBottom = Math.max(tabs.bottom, tb.bottom);
    return { cardTop: r.top, stickyBottom };
  });
  A(vis.cardTop >= vis.stickyBottom - 2, `jumped card not hidden under sticky bars (cardTop ${vis.cardTop.toFixed(0)} vs sticky ${vis.stickyBottom.toFixed(0)})`);

  // 6. reveal / hide on Q15
  await p.evaluate(() => document.querySelector('.card[data-n="15"] .reveal').click());
  A(await p.evaluate(() => document.querySelector('.card[data-n="15"]').classList.contains('revealed')), 'reveal works');
  A(await p.evaluate(() => getComputedStyle(document.querySelector('.card[data-n="15"] .choice[data-v="pick"] .verdict')).display) !== 'none', 'verdict visible after reveal');
  A((await p.evaluate(() => document.querySelector('.card[data-n="15"] .reveal').textContent)).includes('Hide'), 'button flips to Hide');
  A(await p.evaluate(() => getComputedStyle(document.querySelector('.card[data-n="15"] .disband')).display) !== 'none', 'disputed band shows after reveal');

  // 7. flags
  await p.evaluate(() => { flag(document.querySelector('.card[data-n="15"] .flag')); flag(document.querySelector('.card[data-n="22"] .flag')); });
  A((await p.textContent('#flagnote')).trim() === '2 flagged', 'flag counter = 2');

  // 8. flagged filter
  await p.click('.fbtn[data-f="flag"]');
  const shown = await p.$$eval('.card', cs => cs.filter(c => c.style.display !== 'none').map(c => c.dataset.n));
  A(shown.length === 2 && shown.includes('15') && shown.includes('22'), 'flagged filter shows only Q15,Q22');

  // 9. set filters counts (clear the narrow chip left on from the flagged test)
  await p.evaluate(() => { CURFOC = null; document.querySelectorAll('.fbtn.foc').forEach(b=>b.classList.remove('on')); applyDrill(); });
  const expect = { E: 10, V: 5, M: 15, C: 13, S: 14, T: 3 };
  for (const [k, n] of Object.entries(expect)) {
    await p.click(`.fbtn[data-f="${k}"]`);
    const c = await p.$$eval('.card', cs => cs.filter(x => x.style.display !== 'none').length);
    A(c === n, `set ${k} filter shows ${n} (got ${c})`);
  }
  // 10. disputed + debate narrows (combinable: reset set to all first)
  await p.click('.fbtn[data-f="all"]');
  await p.click('.fbtn[data-f="dis"]');
  A(await p.$$eval('.card', cs => cs.filter(x => x.style.display !== 'none').length) === 8, 'disputed filter = 8');
  await p.click('.fbtn[data-f="t3"]');
  A(await p.$$eval('.card', cs => cs.filter(x => x.style.display !== 'none').length) === 3, 'debate filter = 3');

  // 11. hide all answers (ghost action now; also clear the t3 narrow)
  await p.click('.fbtn[data-f="t3"]');
  await p.click('.fbtn[data-f="all"]');
  await p.evaluate(() => { document.querySelector('.card[data-n="2"] .reveal').click(); });
  await p.evaluate(() => hideAll());
  A(await p.$$eval('.card.revealed', e => e.length) === 0, 'hide-all clears reveals');
  A(await p.evaluate(() => document.querySelector('.card[data-n="15"] .reveal').textContent.trim()) === 'Reveal answer', 'buttons reset to Reveal');

  // 12. expand/collapse via header
  await p.evaluate(() => tog(document.querySelector('.card[data-n="1"] .headbtn')));
  A(await p.evaluate(() => document.querySelector('.card[data-n="1"]').classList.contains('open')), 'header toggles open');
  await p.evaluate(() => tog(document.querySelector('.card[data-n="1"] .headbtn')));
  A(!(await p.evaluate(() => document.querySelector('.card[data-n="1"]').classList.contains('open'))), 'header toggles closed');

  // 13. flag click must NOT toggle card open (event isolation)
  const wasOpen = await p.evaluate(() => document.querySelector('.card[data-n="3"]').classList.contains('open'));
  await p.click('.card[data-n="3"] .flag');
  A((await p.evaluate(() => document.querySelector('.card[data-n="3"]').classList.contains('open'))) === wasOpen, 'flag click does not expand card');

  // 14. doc links have hrefs + target blank
  const links = await p.$$eval('.srcs a', as => as.map(a => [a.href, a.target]));
  A(links.length > 0 && links.every(l => l[0].startsWith('http') && l[1] === '_blank'), `doc links valid (${links.length} links)`);

  // 15. mobile viewport
  await p.setViewportSize({ width: 380, height: 800 });
  await p.waitForTimeout(300);
  await p.evaluate(() => jump(40));
  await p.waitForTimeout(600);
  const mvis = await p.evaluate(() => {
    const r = document.querySelector('.card[data-n="40"]').getBoundingClientRect();
    const tabs = document.querySelector('.tabs').getBoundingClientRect();
    const tb = document.querySelector('.toolbar').getBoundingClientRect();
    return { cardTop: r.top, stickyBottom: Math.max(tabs.bottom, tb.bottom) };
  });
  A(mvis.cardTop >= mvis.stickyBottom - 2, `mobile jump not hidden (cardTop ${mvis.cardTop.toFixed(0)} vs sticky ${mvis.stickyBottom.toFixed(0)})`);
  const overflowX = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  A(!overflowX, 'no horizontal overflow at 380px');

  console.log(errors.length ? 'JS ERRORS:\n' + errors.join('\n') : 'no JS errors');
  await b.close();
})();
