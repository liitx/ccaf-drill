const { chromium, devices, A, URL, run, withServer } = require('./harness');

run('smoke15 — toolbar v3 control languages, Set x Narrow', async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto(URL);
  await p.waitForTimeout(400);
  await p.click('.tab[data-v="drill"]');

  // distinct control languages
  A(await p.$$eval('.seg .segbtn', e => e.length) === 2, 'view is a joined segmented control');
  A(await p.evaluate(() => document.getElementById('hlbtn').classList.contains('switch')), 'highlights is a switch with state dot');
  A(await p.$$eval('.ghost', e => e.length) === 2, 'actions are ghost buttons, distinct from filters');
  A(await p.evaluate(() => getComputedStyle(document.querySelector('.vdiv')).width === '1px'), 'divider separates actions from toggles');
  const focPrefix = await p.evaluate(() => getComputedStyle(document.querySelector('.fbtn.foc'), '::before').content);
  A(focPrefix.includes('+'), 'narrow chips signal combinability with + prefix');

  // COMBINABLE filtering: set × narrow
  const vis = () => p.$$eval('#view-drill .card', cs => cs.filter(c => c.style.display !== 'none').map(c => +c.dataset.n));
  await p.click('.fbtn[data-f="M"]');
  A((await vis()).length === 15, 'set M alone: 15');
  await p.click('.fbtn[data-f="dis"]');
  const both = await vis();
  A(both.length === 4 && [2,12,18,41].every(n => both.includes(n)), 'M ∩ Disputed = exactly {2,12,18,41}');
  A((await p.textContent('#showing')).includes('4 of 60'), 'live "showing N of 60" readout');
  // tap again clears narrow
  await p.click('.fbtn[data-f="dis"]');
  A((await vis()).length === 15, 'tapping active narrow chip clears it (back to 15)');
  // selected set chip shows check
  const setPrefix = await p.evaluate(() => getComputedStyle(document.querySelector('.fbtn[data-f="M"]'), '::before').content);
  A(setPrefix.includes('✓'), 'selected set chip shows ✓');
  // narrow + single view position counter
  await p.click('.fbtn[data-f="dis"]');
  await p.click('#vSingle');
  A((await p.textContent('#dpos')).includes('/ 4 (filtered)'), 'single view honors combined filter');
  await p.click('#vAll');

  // highlights switch state
  const dotOn = () => p.evaluate(() => getComputedStyle(document.querySelector('#hlbtn .dot')).backgroundColor);
  const on = await dotOn();
  await p.click('#hlbtn');
  A(await dotOn() !== on && !(await p.evaluate(() => document.getElementById('hlbtn').classList.contains('on'))), 'switch dot reflects off state');
  A(await p.evaluate(() => document.querySelector('.card[data-n="12"]').classList.contains('q-nohl')), 'switch actually toggles highlights');
  await p.click('#hlbtn');

  // reset clears combined state
  await p.evaluate(() => resetDrill());
  A(await p.evaluate(() => CURF === 'all' && CURFOC === null && document.getElementById('hlbtn').classList.contains('on')), 'reset clears set+narrow+switch');
  A((await p.textContent('#showing')).trim() === '', 'showing readout empty when unfiltered');
  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
});

run('smoke5 — mark-color invariant, scoped toggles, exam modes', async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto(URL);
  await p.waitForTimeout(400);

  // UNIVERSAL TEXT-COLOR INVARIANT: every visible <mark> must have the same computed
  // color as its parent text, in every theme × highlight state × view.
  const checkMarks = (label) => p.evaluate((label) => {
    let bad = [];
    document.querySelectorAll('mark').forEach(m => {
      if (!m.offsetParent) return;
      const mc = getComputedStyle(m).color;
      const pc = getComputedStyle(m.parentElement).color;
      if (mc !== pc) bad.push(label + ': mark "' + m.textContent.slice(0,25) + '" color=' + mc + ' parent=' + pc);
    });
    return bad;
  }, label);
  let bad = [];
  // key view, both themes
  bad = bad.concat(await checkMarks('key-dark'));
  await p.click('#themebtn'); bad = bad.concat(await checkMarks('key-light'));
  await p.click('#themebtn');
  // drill: open + reveal a card; highlights on then off (per-card and global)
  await p.click('.tab[data-v="drill"]');
  await p.evaluate(() => { const c = document.querySelector('.card[data-n="1"]'); c.classList.add('open'); c.querySelector('.reveal').click(); });
  bad = bad.concat(await checkMarks('drill-hl-on-dark'));
  await p.evaluate(() => { document.querySelector('.card[data-n="1"]').scrollIntoView({block:'start',behavior:'instant'}); LASTQ='1'; dockSync(); dockAssist(document.querySelector('.dockbtn[data-k="hl"]')); });
  bad = bad.concat(await checkMarks('drill-hl-off-dark'));
  await p.click('#themebtn'); bad = bad.concat(await checkMarks('drill-hl-off-light'));
  await p.click('#themebtn');
  // exam, both themes
  await p.click('.tab[data-v="exam"]');
  await p.click('.modebtn.sel'); await p.waitForTimeout(200);
  bad = bad.concat(await checkMarks('exam-dark'));
  await p.click('#themebtn'); bad = bad.concat(await checkMarks('exam-light'));
  await p.click('#themebtn');
  bad.slice(0,5).forEach(x => console.log('  ' + x));
  A(bad.length === 0, `mark text color ALWAYS equals surrounding text (0 violations across 7 states, ${bad.length} found)`);
  await p.evaluate(() => { EX && clearInterval(EX.tick); });

  // wash is translucent (alpha < 1) in both themes
  await p.click('.tab[data-v="drill"]');
  const alphas = await p.evaluate(() => {
    const get = () => getComputedStyle(document.querySelector('.card[data-n="2"] .chips .chip')).backgroundColor;
    return get();
  });
  A(/rgba\(.+, 0\.\d+\)/.test(alphas), 'highlight wash is translucent (' + alphas + ')');

  // per-question highlight toggle is scoped
  await p.evaluate(() => { document.querySelector('.card[data-n="3"]').classList.add('open'); });
  await p.evaluate(() => { document.querySelector('.card[data-n="3"]').scrollIntoView({block:'start',behavior:'instant'}); LASTQ='3'; dockSync(); dockAssist(document.querySelector('.dockbtn[data-k="hl"]')); });
  const q3off = await p.evaluate(() => getComputedStyle(document.querySelector('.card[data-n="3"] .chips')).display === 'none');
  const q4on = await p.evaluate(() => getComputedStyle(document.querySelector('.card[data-n="4"] .chips')).display !== 'none');
  A(q3off && q4on, 'highlight toggle scoped: Q3 off, Q4 unaffected');

  // per-choice plain toggle
  await p.evaluate(() => { document.querySelector('.card[data-n="5"]').classList.add('open'); });
  await p.evaluate(() => cplain(document.querySelector('.card[data-n="5"] .choice[data-l="B"] .plainbtn')));
  await p.waitForTimeout(320);
  const bShown = await p.evaluate(() => { const e = document.querySelector('.card[data-n="5"] .choice[data-l="B"] .cplain'); return e.getBoundingClientRect().height > 3; });
  const aHidden = await p.evaluate(() => document.querySelector('.card[data-n="5"] .choice[data-l="A"] .cplain').getBoundingClientRect().height <= 3);
  A(bShown && aHidden, 'plain toggle scoped to single choice (B on, A off)');

  // EXAM MODES
  await p.click('.tab[data-v="exam"]');
  // hard already ran; restart in easy
  await p.evaluate(() => { document.getElementById('exam-run').style.display='none'; document.getElementById('exam-start').style.display=''; });
  await p.click('.modebtn:nth-child(1)'); await p.waitForTimeout(200);
  A(await p.$$eval('.asbtn', e => e.length) === 8, 'easy mode: 5 assist toggles + 3 speak');
  await p.evaluate(() => exAssist(document.querySelector('.asbtn[data-k="hint"]')));
  A(await p.evaluate(() => document.querySelector('.exhintbox').offsetParent !== null), 'easy: hint toggles on');
  await p.evaluate(() => exAssist(document.querySelector('.asbtn[data-k="gist"]')));
  A(await p.evaluate(() => document.querySelector('.exqbox .gist').offsetParent !== null), 'easy: gists toggle on');
  await p.evaluate(() => exAssist(document.querySelector('.asbtn[data-k="reveal"]')));
  A(await p.evaluate(() => { const c=document.querySelector('.exchoice.iscorrect'); return c && getComputedStyle(c).borderColor !== '' && c.querySelector('.exwhy').offsetParent !== null; }), 'easy: reveal marks correct choice inline + whys');
  // toggles persist through picking an answer
  await p.evaluate(() => exPick('A'));
  A(await p.evaluate(() => document.querySelector('.exqbox').classList.contains('as-reveal')), 'assist state survives answering');
  // toggles reset on navigation
  await p.evaluate(() => exNav(1));
  A(await p.evaluate(() => !document.querySelector('.exqbox').classList.contains('as-reveal')), 'assist state resets per question');
  await p.evaluate(() => clearInterval(EX.tick));
  // medium
  await p.evaluate(() => { document.getElementById('exam-run').style.display='none'; document.getElementById('exam-start').style.display=''; });
  await p.click('.modebtn:nth-child(2)'); await p.waitForTimeout(200);
  const medBtns = await p.$$eval('.asbtn', e => e.map(x => x.dataset.k));
  A(medBtns.length === 4 && medBtns.includes('hint') && medBtns.includes('plain') && medBtns.includes('spq') && medBtns.includes('spc'), 'medium mode: hint + plain + 2 speak');
  await p.evaluate(() => clearInterval(EX.tick));
  // hard
  await p.evaluate(() => { document.getElementById('exam-run').style.display='none'; document.getElementById('exam-start').style.display=''; });
  await p.click('.modebtn:nth-child(3)'); await p.waitForTimeout(200);
  A(await p.$$eval('.asbtn', e => e.length) === 0, 'hard mode: zero assists (1:1)');
  await p.evaluate(() => clearInterval(EX.tick));
  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
});
