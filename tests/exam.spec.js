const { chromium, devices, A, URL, run, withServer } = require('./harness');

run('smoke4 — full exam simulation: timer, palette, results', async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto(URL);
  await p.waitForTimeout(400);
  await p.clock ? null : null;

  // gists in drill
  await p.click('.tab[data-v="drill"]');
  await p.evaluate(() => { const c=document.querySelector('.card[data-n="55"]'); c.classList.add('open'); c.querySelector('.reveal').click(); });
  A(await p.evaluate(() => document.querySelector('.card[data-n="55"] .choice[data-l="C"] .gist').offsetParent !== null), 'gists visible in drill after reveal');
  A((await p.textContent('.card[data-n="55"] .choice[data-l="C"] .gist')).includes('max_tokens'), 'gist content correct (Q55-C)');
  A(await p.$$eval('.gist', e => e.length) === 240, '240 gists present');

  // exam start
  await p.click('.tab[data-v="exam"]');
  A(await p.evaluate(() => document.getElementById('exam-start').offsetParent !== null), 'exam start screen shows');
  await p.click('.modebtn.sel');
  A(await p.evaluate(() => document.getElementById('exam-run').offsetParent !== null), 'exam runs after start');
  A((await p.textContent('#extimer')).trim() === '120:00' || (await p.textContent('#extimer')).startsWith('119'), 'timer starts at 120:00');
  A(await p.$$eval('.pal', e => e.length) === 60, 'palette has 60 buttons');
  // stem has no highlights in exam
  const markBg = await p.evaluate(() => { const m=document.querySelector('.exstem mark'); return m ? getComputedStyle(m).backgroundImage : 'none-no-mark'; });
  A(markBg === 'none' || markBg === 'none-no-mark', 'exam stem shows NO highlights (1:1 plain)');
  // answer Q1 = A, flag it, next
  await p.evaluate(() => exPick('A'));
  A(await p.evaluate(() => document.querySelector('.exchoice.sel') !== null), 'choice selects');
  await p.click('#exflagbtn');
  A(await p.evaluate(() => document.getElementById('pal1').classList.contains('flagged')), 'flag reflects in palette');
  await p.click('#exnext');
  A((await p.textContent('#exqlabel')).includes('2 / 60'), 'next navigates to Q2');
  A(await p.evaluate(() => document.getElementById('pal1').classList.contains('answered')), 'palette marks Q1 answered');

  // pause hides question + freezes timers
  await p.waitForTimeout(1200);
  await p.click('#expausebtn');
  A(await p.evaluate(() => document.getElementById('exam-pause').offsetParent !== null), 'pause overlay shows');
  A(await p.evaluate(() => document.getElementById('exam-run').offsetParent === null), 'question hidden while paused');
  const t1 = await p.evaluate(() => EX.remaining);
  await p.waitForTimeout(1500);
  const t2 = await p.evaluate(() => EX.remaining);
  A(t1 === t2, 'countdown frozen during pause');
  const q2timeBefore = await p.evaluate(() => EX.times[2] || 0);
  await p.click('.expausebox .exstart');
  A((await p.textContent('#exqlabel')).includes('2 / 60'), 'resume returns to SAME question');
  await p.waitForTimeout(1100);
  await p.evaluate(() => exNav(1));
  const q2time = await p.evaluate(() => EX.times[2]);
  A(q2time - q2timeBefore < 2.5 && q2time > 0, `pause excluded from Q2 time (${q2time.toFixed(1)}s active)`);

  // answer everything: Q1-30 correct, 31-59 wrong-ish, 60 blank; jump around via goto
  await p.evaluate(() => {
    const W = Object.fromEntries(Object.entries(QMETA).map(([n,m])=>[n,m.w]));
    for (let n=1;n<=30;n++) EX.answers[n]=W[n];
    for (let n=31;n<=59;n++) EX.answers[n]=(W[n]==='A'?'B':'A');
  });
  // submit with confirm (1 unanswered)
  p.once('dialog', d => d.accept());
  await p.evaluate(() => exSubmit(false));
  await p.waitForTimeout(400);
  A(await p.evaluate(() => document.getElementById('exam-results').offsetParent !== null), 'results render');
  const body = await p.textContent('#exam-results');
  A(body.includes('50%') && body.includes('30/60'), 'score computed (30/60 = 50%)');
  A(body.includes('pass = 720'), 'scaled score with pass mark shown');
  A(body.includes('Likely downfall'), 'downfall analysis present');
  A(body.includes('HOW TO THINK ABOUT THIS SET'), 'generic set analysis in downfall');
  A(await p.$$eval('.setrow', e => e.length) === 6, '6 set analytics rows ranked');
  A(await p.$$eval('.resq', e => e.length) === 60, '60 review rows');
  A(await p.$$eval('.resq .resflag', e => e.length) === 1, 'flag icon carried into overview');
  // times shown
  A(/\d:\d\d/.test(await p.textContent('#resq2 .restime')), 'per-question time displayed');
  // expand a wrong one (Q31) — detail clones drill with gists + your pick + set rule
  await p.evaluate(() => resTog(31));
  await p.waitForTimeout(200);
  const det = await p.textContent('#resq31 .resdetail');
  A(det.includes('YOUR PICK'), 'user pick tagged in review detail');
  A(await p.evaluate(() => { const g=document.querySelector('#resq31 .resdetail .gist'); return g && g.getBoundingClientRect().height > 0; }), 'gists RENDERED in review detail');
  A(await p.evaluate(() => { const e=document.querySelector('#resq31 .resdetail .expl'); return e && e.getBoundingClientRect().height > 0; }), 'In-Practice snippet RENDERED for correct answer');
  A(det.includes('HOW TO THINK —'), 'per-set how-to-think block in detail');
  A(await p.evaluate(() => document.querySelector('#resq31 .resdetail .verdict') !== null && getComputedStyle(document.querySelector('#resq31 .resdetail .choice[data-v="pick"] .verdict')).display !== 'none'), 'verdicts revealed in review clone');
  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
});
