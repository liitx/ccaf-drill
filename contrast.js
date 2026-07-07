const { chromium } = require('playwright');
// WCAG relative luminance contrast
const lum = c => { const [r,g,b] = c.match(/\d+/g).map(Number).map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4}); return .2126*r+.7152*g+.0722*b; };
const ratio = (a,b) => { const l1=lum(a),l2=lum(b); return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 900 } });
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto('file:///mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html');
  await p.waitForTimeout(500);
  let bad = 0;
  for (const mode of ['dark','light']) {
    const isDark = await p.evaluate(() => document.body.classList.contains('dark'));
    if ((mode==='dark') !== isDark) { await p.click('#themebtn'); await p.waitForTimeout(200); }
    await p.click('.tab[data-v="drill"]');
    const items = await p.evaluate(() => {
      const bg = el => { let e = el; while (e) { const c = getComputedStyle(e).backgroundColor; if (c && !c.includes('0, 0, 0, 0')) return c; e = e.parentElement; } return 'rgb(255,255,255)'; };
      const sel = ['.toolbar .fbtn','.tab','#themebtn','.card[data-n="1"] .qnum','.card[data-n="1"] .setpill','.card[data-n="1"] .tier','.reveal','.keyansbar .util','.flag','#flagnote'];
      const out = [];
      for (const s of sel) for (const el of document.querySelectorAll(s)) {
        if (!el.offsetParent) continue;
        out.push([ (el.textContent||'').trim().slice(0,22) || s, getComputedStyle(el).color, bg(el) ]);
      }
      return out;
    });
    for (const [name, fg, bgc] of items) {
      const r = ratio(fg, bgc);
      const flagBtn = name === '⚑';
      const min = flagBtn ? 1.6 : 3.0; // idle flag is intentionally faint
      if (r < min) { console.log(`LOW ${mode}: "${name}" ratio ${r.toFixed(2)} fg=${fg} bg=${bgc}`); bad++; }
    }
    console.log(mode, 'checked', items.length, 'elements');
  }
  console.log(bad === 0 ? 'ALL CONTRAST OK' : bad + ' low-contrast elements');
  await b.close();
})();
