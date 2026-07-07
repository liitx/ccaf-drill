const { chromium } = require('playwright');
const A = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('pass:', m); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto('file:///mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html');
  await p.waitForTimeout(400);

  // no javascript: hrefs anywhere (CSP-safe for claude.ai sandbox / GH pages CSP)
  A(await p.$$eval('a[href^="javascript:"], a[onclick]', e => e.length) === 0, 'zero javascript: hrefs or inline-handler anchors');

  // cheat code redirect works via real click (not evaluate)
  await p.evaluate(() => ksecgo(1));
  await p.waitForTimeout(200);
  await p.click('#ksec1 .pqs .qlink'); // P1 first Q = 1 (set E)
  await p.waitForTimeout(500);
  A(await p.evaluate(() => document.getElementById('view-drill').classList.contains('on')), 'cheat-code click (real) lands in Drill');
  A(await p.evaluate(() => CURF === 'E'), 'scoped to the question set');
  A(await p.evaluate(() => location.href.indexOf('javascript') === -1), 'no javascript: navigation attempted');

  // key expansion link also CSP-safe and works
  await p.click('.tab[data-v="key"]');
  await p.evaluate(() => { ksecgo(2); kexp(1); });
  await p.waitForTimeout(200);
  await p.click('#kexp1 .kexplink');
  await p.waitForTimeout(400);
  A(await p.evaluate(() => document.getElementById('view-drill').classList.contains('on')), 'Open-in-Drill link works via real click');

  // section chips: set chips carry set colors, differ from neutral chips
  await p.click('.tab[data-v="key"]');
  const chipColors = await p.evaluate(() => ({
    guide: getComputedStyle(document.getElementById('knavc0')).color,
    codes: getComputedStyle(document.getElementById('knavc1')).color,
    e: getComputedStyle(document.getElementById('knavc2')).color,
    m: getComputedStyle(document.getElementById('knavc4')).color,
  }));
  A(chipColors.guide === chipColors.codes && chipColors.e !== chipColors.guide && chipColors.m !== chipColors.e, 'set nav chips colored per set; utility chips neutral');
  // and consistent with drill's set pill colors
  const match = await p.evaluate(() => {
    const key = getComputedStyle(document.getElementById('knavc2')).color;
    const drill = getComputedStyle(document.querySelector('.toolbar .fbtn[data-f="E"]')).color;
    return key === drill;
  });
  A(match, 'Key set chip color matches Drill set pill color (theme consistent)');

  // section header not clipped under sticky nav after chip click — desktop + narrow
  for (const [w, label] of [[900, 'desktop'], [380, 'mobile-wrap']]) {
    await p.setViewportSize({ width: w, height: 800 });
    await p.waitForTimeout(200);
    await p.evaluate(() => ksecgo(4));
    await p.waitForTimeout(250);
    const pos = await p.evaluate(() => {
      const h = document.querySelector('#ksec4 .ksechead').getBoundingClientRect();
      const nav = document.getElementById('keynav').getBoundingClientRect();
      return { headTop: Math.round(h.top), navBottom: Math.round(nav.bottom) };
    });
    A(pos.headTop >= pos.navBottom - 2, `section header clear of sticky chips at ${label} (head ${pos.headTop} vs nav ${pos.navBottom})`);
  }
  // dark AND light
  await p.setViewportSize({ width: 900, height: 800 });
  await p.click('#themebtn'); await p.waitForTimeout(150);
  await p.evaluate(() => ksecgo(6));
  await p.waitForTimeout(250);
  const pos2 = await p.evaluate(() => {
    const h = document.querySelector('#ksec6 .ksechead').getBoundingClientRect();
    const nav = document.getElementById('keynav').getBoundingClientRect();
    return h.top >= nav.bottom - 2;
  });
  A(pos2, 'header clear of chips in light theme too');
  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
})();
