const { chromium, devices, A, URL, run, withServer } = require('./harness');

run('smoke3 — hint flow, no-spoil, plains/hintboxes', async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto(URL);
  await p.waitForTimeout(400);
  // cheat codes present + clickable Q link jumps
  A(await p.$$eval('.pat', e => e.length) === 12, '12 cheat codes restored in Key view');
  await p.evaluate(() => document.querySelector('.pqs .qlink').click());
  await p.waitForTimeout(500);
  A(await p.evaluate(() => document.getElementById('view-drill').classList.contains('on')), 'cheat-code Q link jumps to drill');
  A(await p.evaluate(() => document.querySelector('.card[data-n="1"]').classList.contains('open')), 'P1 first Q (1) opened');
  // hint flow on Q12 (unrevealed) — reset filter first (cheat link scoped it)
  await p.evaluate(() => filt(document.querySelector('.fbtn[data-f="all"]')));
  await p.evaluate(() => { document.querySelector('.card[data-n="12"]').classList.add('open'); document.querySelector('.card[data-n="12"]').scrollIntoView({block:'start',behavior:'instant'}); LASTQ='12'; dockSync(); });
  const vis = '(el)=>{const r=el.getBoundingClientRect();return r.height>3&&parseFloat(getComputedStyle(el).opacity)>.5}', hid = '(el)=>{const r=el.getBoundingClientRect();return r.height<=3||parseFloat(getComputedStyle(el).opacity)<=.5}';
  const plainVis = n => p.evaluate(n => { const e = document.querySelector(`.card[data-n="${n}"] .choice .cplain`); return e.getBoundingClientRect().height > 3 && parseFloat(getComputedStyle(e).opacity) > .5; }, n);
  A(!(await plainVis(12)), 'plain lines hidden before hint');
  A(await p.evaluate(`(${hid})(document.querySelector('.card[data-n="12"] .hintbox'))`), 'hint box hidden initially');
  await p.evaluate(() => dockAssist(document.querySelector('.dockbtn[data-k="hint"]')));
  await p.waitForTimeout(320);
  A(await p.evaluate(`(${vis})(document.querySelector('.card[data-n="12"] .hintbox'))`), 'hint box shows on click');
  A(await plainVis(12), 'plain rephrases appear with hint');
  A(await p.evaluate(() => document.querySelectorAll('.card[data-n="12"] .verdict:not([style])').length > 0 && getComputedStyle(document.querySelector('.card[data-n="12"] .verdict')).display === 'none'), 'verdicts STILL hidden after hint (no spoil)');
  const ask = await p.textContent('.card[data-n="12"] .hintbox');
  A(ask.includes('STRUCTURAL') || ask.toLowerCase().includes('really asking') , 'hint content present');
  // reveal also shows plain
  await p.evaluate(() => document.querySelector('.card[data-n="30"]').classList.add('open'));
  await p.evaluate(() => document.querySelector('.card[data-n="30"] .reveal').click());
  await p.waitForTimeout(400);
  A(await plainVis(30), 'reveal alone also shows plain lines');
  A(await p.$$eval('.cplain', e => e.length) === 240, '240 plain lines present');
  A(await p.$$eval('.hintbox', e => e.length) === 60, '60 hint boxes present');
  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
});

run('smoke6 — drill toggles via dock, exam scroll behavior', async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto(URL);
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
});

run('smoke7 — per-choice gists, dock sizing, reveal-all', async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto(URL);
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
  A(sizes.length === 10 && new Set(sizes).size === 1, 'dock buttons equal height (' + sizes + ')');
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
});

run('smoke8 — in-practice position, anchoring, views, reset', async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto(URL);
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
});
