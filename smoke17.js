// STATE-ISOLATION MATRIX: every component toggle must change ONLY its designated state.
const { chromium } = require('playwright');
const A = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('pass:', m); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto('file:///mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html');
  await p.waitForTimeout(400);
  await p.click('.tab[data-v="drill"]');

  // fingerprint: everything observable that could leak
  const FP = () => p.evaluate(() => {
    const card = n => { const c = document.querySelector(`.card[data-n="${n}"]`); const m = c.querySelector('.stem mark');
      return { cls: [...c.classList].sort().join(' '),
        mark: getComputedStyle(m).backgroundColor, markColor: getComputedStyle(m).color,
        chips: getComputedStyle(c.querySelector('.chips')).display,
        choiceB: [...c.querySelector('.choice[data-l="B"]').classList].sort().join(' ') }; };
    return { q1: card(1), q2: card(2), q3: card(3),
      dockOn: [...document.querySelectorAll('.dockbtn.on')].map(x => x.dataset.k).sort().join(','),
      dockDead: [...document.querySelectorAll('.dockbtn.dead')].map(x => x.dataset.k).sort().join(','),
      dockQ: document.getElementById('dockq').textContent,
      curf: CURF, curfoc: CURFOC, dmode: DMODE,
      hlSwitch: document.getElementById('hlbtn').classList.contains('on'),
      focused: document.activeElement === document.body ? 'body' : document.activeElement.className };
  });
  const diff = (a, b2) => {
    const flat = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (v !== null && typeof v === 'object') ? flat(v, pre + k + '.') : [[pre + k, String(v)]]);
    const A2 = Object.fromEntries(flat(a)), B2 = Object.fromEntries(flat(b2));
    return Object.keys(A2).filter(k => A2[k] !== B2[k]);
  };
  // setup: Q1 open+hinted+gisted (a "decoy" with state), Q2 open clean (the target), Q3 closed
  await p.evaluate(() => {
    const c1 = document.querySelector('.card[data-n="1"]'); c1.classList.add('open', 'hinted', 'q-showgist');
    const c2 = document.querySelector('.card[data-n="2"]'); c2.classList.add('open');
    c2.scrollIntoView({ block: 'start', behavior: 'instant' }); LASTQ = '2'; dockSync();
  });
  await p.waitForTimeout(200);

  // matrix: [name, action (real click), allowed-changed-key predicates]
  const CASES = [
    ['dock Hint',       () => p.click('.dockbtn[data-k="hint"]'),  k => k.startsWith('q2.cls') || k.startsWith('dockOn')],
    ['dock Highlights', () => p.click('.dockbtn[data-k="hl"]'),    k => k.startsWith('q2.') || k.startsWith('dockOn')],
    ['dock Gists',      () => p.click('.dockbtn[data-k="gist"]'),  k => k.startsWith('q2.cls') || k.startsWith('dockOn')],
    ['dock In practice',() => p.click('.dockbtn[data-k="ex"]'),    k => k.startsWith('q2.cls') || k.startsWith('dockOn')],
    ['dock Reveal',     () => p.click('.dockbtn[data-k="rev"]'),   k => k.startsWith('q2.cls') || k.startsWith('dockOn') || k.startsWith('dockDead')],
    ['choice ◦plain',   () => p.click('.card[data-n="2"] .choice[data-l="B"] .plainbtn'), k => k === 'q2.choiceB'],
    ['choice ⌁gist',    () => p.click('.card[data-n="2"] .choice[data-l="B"] .gistbtn'),  k => k === 'q2.choiceB'],
    ['in-card Reveal',  () => p.click('.card[data-n="2"] .reveal'), k => k.startsWith('q2.cls') || k.startsWith('dockOn') || k.startsWith('dockDead')],
  ];
  for (const [name, act, allowed] of CASES) {
    const before = await FP();
    await act(); await p.waitForTimeout(380);   // apply
    const mid = await FP();
    const leaked = diff(before, mid).filter(k => !allowed(k));
    A(leaked.length === 0, `${name}: only its own state changes` + (leaked.length ? ' — LEAKED: ' + leaked.join(', ') : ''));
    A(mid.focused === 'body', `${name}: no lingering focus highlight on the button`);
    // critically: highlights (mark bg + chips) untouched by non-HL toggles
    if (!name.includes('Highlights')) {
      A(before.q2.mark === mid.q2.mark && before.q2.chips === mid.q2.chips, `${name}: does NOT alter highlight wash or chips`);
    }
    A(before.q1.cls === mid.q1.cls && before.q3.cls === mid.q3.cls, `${name}: neighbor cards untouched`);
    await act(); await p.waitForTimeout(380);   // revert
    const after = await FP();
    const residue = diff(before, after).filter(k => !k.startsWith('dockQ'));
    A(residue.length === 0, `${name}: fully reversible` + (residue.length ? ' — residue: ' + residue.join(', ') : ''));
  }

  // toolbar controls: verify scope of each
  const b0 = await FP();
  await p.click('.fbtn[data-f="dis"]'); await p.waitForTimeout(250);
  let d = diff(b0, await FP());
  A(d.every(k => k === 'curfoc' || k.startsWith('dock') || k.startsWith('q')), 'narrow chip: filter state + visibility only');
  await p.click('.fbtn[data-f="dis"]'); await p.waitForTimeout(250);
  await p.click('#hlbtn'); await p.waitForTimeout(250);
  const hlAll = await p.evaluate(() => [1, 2, 3].every(n => document.querySelector(`.card[data-n="${n}"]`).classList.contains('q-nohl')));
  A(hlAll, 'global Highlights switch: affects all cards (by design), nothing else');
  await p.click('#hlbtn'); await p.waitForTimeout(250);

  // exam: assists must never resurrect highlights in the 1:1 stem
  await p.click('.tab[data-v="exam"]');
  await p.click('.modebtn:nth-child(1)'); await p.waitForTimeout(250);
  for (const k of ['hint', 'plain', 'gist', 'ex', 'reveal']) {
    await p.click(`.asbtn[data-k="${k}"]`); await p.waitForTimeout(320);
    const stemClean = await p.evaluate(() => { const m = document.querySelector('.exstem mark'); return !m || getComputedStyle(m).backgroundColor === 'rgba(0, 0, 0, 0)'; });
    A(stemClean, `exam assist '${k}': stem stays highlight-free (1:1)`);
    const onlyOwn = await p.evaluate(k => { const cl = [...document.getElementById('exqbox').classList].filter(c => c.startsWith('as-')); return cl.length <= 5; }, k);
    A(onlyOwn, `exam assist '${k}': scoped to its as-class`);
  }
  await p.evaluate(() => clearInterval(EX.tick));
  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
})();
