const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto('file:///mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html');
  await p.waitForTimeout(400);
  const overflow = async (label) => {
    const o = await p.evaluate(() => {
      const d = document.documentElement;
      if (d.scrollWidth <= d.clientWidth + 2) return null;
      const culprits = [];
      document.querySelectorAll('*').forEach(el => { const r = el.getBoundingClientRect(); if (r.right > d.clientWidth + 3 && r.width > 5) culprits.push((el.className||el.tagName).toString().slice(0,40) + ' w=' + Math.round(r.width)); });
      return { sw: d.scrollWidth, cw: d.clientWidth, culprits: [...new Set(culprits)].slice(0,4) };
    });
    console.log(o ? 'OVERFLOW ' + label + ' ' + JSON.stringify(o) : 'ok ' + label);
  };
  const sticky = async (label) => {
    const s = await p.evaluate(() => {
      const els = ['.tabs', '#keynav', '#view-drill .toolbar', '.exbar'].map(sel => { const e = document.querySelector(sel); if (!e || !e.offsetParent) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { sel, top: Math.round(r.top), bottom: Math.round(r.bottom), pos: cs.position, cssTop: cs.top }; }).filter(Boolean);
      return els;
    });
    // detect overlapping sticky bars
    const vis = s.filter(x => x.pos === 'sticky');
    let overlap = false;
    for (let i = 0; i < vis.length; i++) for (let j = i+1; j < vis.length; j++) {
      if (vis[i].bottom > vis[j].top + 4 && vis[j].bottom > vis[i].top + 4) overlap = true;
    }
    console.log((overlap ? 'STICKY-OVERLAP ' : 'sticky ok ') + label + ' ' + JSON.stringify(s));
  };
  for (const w of [320, 375, 414]) {
    await p.setViewportSize({ width: w, height: 740 });
    console.log('--- width ' + w + ' ---');
    // key: open a set section, expand a row
    await p.click('.tab[data-v="key"]');
    await p.evaluate(() => { ksecgo(4); kexp(document.querySelector('#ksec4 .krow .kq').textContent.slice(1)*1); });
    await p.waitForTimeout(300);
    await overflow('key+section+rowexp'); await p.evaluate(() => window.scrollTo(0, 300)); await sticky('key scrolled');
    // drill: open + hint + reveal
    await p.click('.tab[data-v="drill"]');
    await p.evaluate(() => { resetDrill(); const c = document.querySelector('.card[data-n="41"]'); c.classList.add('open'); c.querySelector('.hintbtn.assist').click(); c.querySelector('.reveal').click(); c.scrollIntoView(); });
    await p.waitForTimeout(300);
    await overflow('drill revealed'); await sticky('drill scrolled');
    // exam easy with assists + long stem
    await p.click('.tab[data-v="exam"]');
    await p.evaluate(() => { document.getElementById('exam-results').style.display='none'; document.getElementById('exam-run').style.display='none'; document.getElementById('exam-start').style.display=''; });
    await p.click('.modebtn:nth-child(1)');
    await p.waitForTimeout(200);
    await p.evaluate(() => { exGoto(54); ['hint','plain','gist','ex','reveal'].forEach(k => exAssist(document.querySelector('.asbtn[data-k="'+k+'"]'))); });
    await p.waitForTimeout(200);
    await overflow('exam easy all assists'); await p.evaluate(() => window.scrollTo(0, 200)); await sticky('exam scrolled');
    // results
    await p.evaluate(() => { for (let n=1;n<=59;n++) EX.answers[n] = (n%2? QMETA[n].w : 'A'); clearInterval(EX.tick); exSubmit(true); });
    await p.waitForTimeout(400);
    await p.evaluate(() => resTog(2));
    await p.waitForTimeout(200);
    await overflow('exam results + detail');
    // tap targets
    const tiny = await p.evaluate(() => {
      const bad = [];
      document.querySelectorAll('button').forEach(bn => { if (!bn.offsetParent) return; const r = bn.getBoundingClientRect(); if (r.height < 22 || r.width < 22) bad.push(bn.className.slice(0,20) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
      return [...new Set(bad)].slice(0, 6);
    });
    console.log(tiny.length ? 'TINY-TAP: ' + tiny.join(', ') : 'tap targets ok');
  }
  await b.close();
})();
