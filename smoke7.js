const { chromium } = require('playwright');
const A = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('pass:', m); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto('file:///mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html');
  await p.waitForTimeout(400);
  await p.click('.tab[data-v="drill"]');
  await p.evaluate(() => { const c=document.querySelector('.card[data-n="12"]'); c.classList.add('open'); c.scrollIntoView({block:'start',behavior:'instant'}); LASTQ='12'; dockSync(); });

  // per-choice gist scoping
  await p.evaluate(() => cgist(document.querySelector('.card[data-n="12"] .choice[data-l="D"] .gistbtn')));
  await p.waitForTimeout(320);
  const gv = (n, L) => p.evaluate(([n, L]) => { const e = document.querySelector(`.card[data-n="${n}"] .choice[data-l="${L}"] .gist`); return e.getBoundingClientRect().height > 3 && parseFloat(getComputedStyle(e).opacity) > .5; }, [n, L]);
  A(await gv(12, 'D'), 'per-choice gist: D shows');
  A(!(await gv(12, 'A')), 'per-choice gist scoped: A stays hidden');
  A(await p.evaluate(() => getComputedStyle(document.querySelector('.card[data-n="12"] .verdict')).display) === 'none', 'per-choice gist does not spoil verdicts');

  // uniform sizes: dock buttons same height
  const sizes = await p.$$eval('#dock .dockbtn', bs => bs.map(b => Math.round(b.getBoundingClientRect().height)));
  A(sizes.length === 6 && new Set(sizes).size === 1, 'dock buttons equal height (' + sizes + ')');
  const mini = await p.$$eval('.card[data-n="12"] .choice[data-l="A"] .plainbtn', bs => bs.map(b => Math.round(b.getBoundingClientRect().height)));
  A(mini.length === 2 && mini[0] === mini[1], 'per-choice plain + gist buttons same size');

  // reveal shows EVERYTHING: hintbox, plains, gists, in-practice, verdicts
  await p.evaluate(() => document.querySelector('.card[data-n="12"] .reveal').click());
  await p.waitForTimeout(350);
  const vis = sel => p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return r.height > 3 && parseFloat(getComputedStyle(e).opacity) > .5; }, sel);
  A(await vis('.card[data-n="12"] .hintbox'), 'reveal shows hint box');
  A(await vis('.card[data-n="12"] .choice[data-l="A"] .cplain'), 'reveal shows all plains');
  A(await gv(12, 'B'), 'reveal shows all gists');
  A(await vis('.card[data-n="12"] .explwrap'), 'reveal shows in-practice');
  A(await vis('.card[data-n="12"] .choice[data-v="pick"] .verdict'), 'reveal shows verdicts');

  // redundant toggles are non-interactive while revealed (dock + per-choice)
  const dead = await p.evaluate(() => {
    const dockDead = ['hint','gist','ex'].every(k => document.querySelector('.dockbtn[data-k="' + k + '"]').classList.contains('dead'));
    const mini = [...document.querySelectorAll('.card[data-n="12"] .choice[data-l="A"] .plainbtn')];
    return dockDead && mini.every(b => getComputedStyle(b).pointerEvents === 'none' && parseFloat(getComputedStyle(b).opacity) < 1);
  });
  A(dead, 'assist toggles disabled (dock dead + minis inert) while revealed');
  A(await p.evaluate(() => !document.querySelector('.dockbtn[data-k="hl"]').classList.contains('dead')), 'highlights toggle stays active while revealed');
  await p.evaluate(() => document.querySelector('.card[data-n="12"] .reveal').click());
  A(await p.evaluate(() => !document.querySelector('.dockbtn[data-k="hint"]').classList.contains('dead')), 'toggles re-enable after hiding answer');
  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
})();
