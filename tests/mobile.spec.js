const { chromium, devices, A, URL, run, withServer } = require('./harness');

run('smoke12 — mobile iPhone 12: overflow, taps, fonts, timer', async () => {

  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 12'], hasTouch: true }); // 390x844, touch
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto(URL);
  await p.waitForTimeout(500);

  const noOverflow = async label => A(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2), 'no horizontal overflow: ' + label);
  const noStickyOverlap = async label => {
    const bad = await p.evaluate(() => {
      const bars = ['.tabs', '#keynav', '#view-drill .toolbar', '.exbar'].map(s => document.querySelector(s)).filter(e => e && e.offsetParent && getComputedStyle(e).position === 'sticky').map(e => e.getBoundingClientRect());
      for (let i = 0; i < bars.length; i++) for (let j = i + 1; j < bars.length; j++)
        if (bars[i].bottom > bars[j].top + 4 && bars[j].bottom > bars[i].top + 4) return true;
      return false;
    });
    A(!bad, 'no sticky-bar overlap: ' + label);
  };

  // KEY on phone: tap chip, section opens with header visible, tap row → inline expansion readable
  await p.tap('#knavc3');
  await p.waitForTimeout(300);
  A(await p.evaluate(() => document.getElementById('ksec3').classList.contains('open')), 'tap opens key section');
  A(await p.evaluate(() => document.querySelector('#ksec3 .ksechead').getBoundingClientRect().top >= -2), 'section header visible after chip tap');
  await noOverflow('key section open');
  await p.tap('#ksec3 .krow');
  await p.waitForTimeout(300);
  const kex = await p.evaluate(() => {
    const d = document.querySelector('#ksec3 .kexpbody .card');
    const gist = d.querySelector('.gist'); const snip = d.querySelector('.snip');
    return { h: d.getBoundingClientRect().height > 100,
      gistWrap: getComputedStyle(gist).whiteSpace, snipWrap: getComputedStyle(snip).whiteSpace,
      fontOk: parseFloat(getComputedStyle(d.querySelector('.ctext')).fontSize) >= 12 };
  });
  A(kex.h && kex.gistWrap.includes('pre-wrap') && kex.snipWrap.includes('pre-wrap') && kex.fontOk, 'inline expansion renders, code wraps, font ≥12px');
  await noOverflow('key row expanded');
  await p.evaluate(() => window.scrollTo(0, 400)); await noStickyOverlap('key scrolled');

  // DRILL on phone: single view, touch nav, assists, reveal
  await p.tap('.tab[data-v="drill"]');
  await p.tap('#vSingle');
  await p.waitForTimeout(300);
  A(await p.$$eval('#view-drill .card', cs => cs.filter(c => c.style.display !== 'none').length) === 1, 'single view on phone: one card');
  await p.tap('#dnav .exnavbtn:last-of-type');
  await p.waitForTimeout(300);
  A((await p.textContent('#dpos')).includes('2 / 60'), 'touch Next advances');
  await p.evaluate(() => { dockAssist(document.querySelector('.dockbtn[data-k="hint"]')); dockAssist(document.querySelector('.dockbtn[data-k="rev"]')); });
  await p.waitForTimeout(300);
  await noOverflow('drill single revealed');
  const taps = await p.evaluate(() => {
    const mini = ['plainbtn', 'gistbtn', 'qlink', 'flag'];
    const bad = [];
    document.querySelectorAll('button').forEach(bn => {
      if (!bn.offsetParent) return;
      const r = bn.getBoundingClientRect();
      const isMini = mini.some(c => bn.classList.contains(c));
      const min = isMini ? 28 : 40; // HIG 44 target; 40 floor for primary, 28 for inline minis
      if (r.height < min) bad.push(bn.className.slice(0, 20) + ' h=' + Math.round(r.height));
    });
    return [...new Set(bad)];
  });
  A(taps.length === 0, 'primary buttons ≥40px, inline minis ≥28px (HIG-aligned)' + (taps.length ? ' bad: ' + taps.join(', ') : ''));
  const bodyFont = await p.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  A(bodyFont >= 16, 'body text ≥16px on phone (' + bodyFont + 'px)');
  await p.evaluate(() => resetDrill());

  // EXAM on phone: timer bar pinned, pick scrolls Next into view, palette usable
  await p.tap('.tab[data-v="exam"]');
  await p.tap('.modebtn.sel');
  await p.waitForTimeout(300);
  await noOverflow('exam running');
  await p.evaluate(() => window.scrollTo(0, 600));
  await p.waitForTimeout(200);
  const pinned = await p.evaluate(() => { const r = document.querySelector('.exbar').getBoundingClientRect(); return r.top <= 2 && r.top >= -2; });
  A(pinned, 'exam timer bar stays pinned while scrolled');
  await noStickyOverlap('exam scrolled');
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.evaluate(() => exPick('B'));
  await p.waitForTimeout(800);
  A(await p.evaluate(() => { const r = document.querySelector('.exnav').getBoundingClientRect(); return r.bottom <= window.innerHeight + 2 && r.top >= 0; }), 'pick brings Next into view on phone');
  const pal = await p.evaluate(() => { const r = document.querySelector('.pal').getBoundingClientRect(); return r.width >= 30 && r.height >= 28; });
  A(pal, 'palette cells thumb-sized on phone');
  // results on phone
  await p.evaluate(() => { for (let n = 1; n <= 60; n++) EX.answers[n] = QMETA[n].w; clearInterval(EX.tick); exSubmit(true); });
  await p.waitForTimeout(400);
  await p.evaluate(() => resTog(5));
  await p.waitForTimeout(200);
  await noOverflow('exam results + detail');
  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
});
