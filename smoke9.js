const { chromium } = require('playwright');
const A = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('pass:', m); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto('file:///mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html');
  await p.waitForTimeout(400);

  // sections exist, collapsed by default
  A(await p.$$eval('.ksec', e => e.length) === 8, '8 key sections (guide + codes + 6 sets)');
  A(await p.$$eval('.ksec.open', e => e.length) === 0, 'all sections collapsed by default');
  A(await p.$$eval('#keynav .fbtn', e => e.length) === 8, 'section nav chips present');

  // guide explains Disputed + features
  await p.evaluate(() => ksecgo(0));
  const guide = await p.textContent('#ksec0');
  A(guide.includes('Disputed 8') && guide.includes('Q2, 12, 15, 17, 18, 22, 41, 42'), 'guide explains Disputed 8 with the Q list');
  A(guide.includes('Exam') && guide.includes('Hint') && guide.includes('DOCS-VERIFIED') && guide.includes('Flag'), 'guide covers views, assists, tiers, flags');

  // nav chip opens one section and closes others
  await p.evaluate(() => ksecgo(2));
  A(await p.$$eval('.ksec.open', e => e.length) === 1 && await p.evaluate(() => document.getElementById('ksec2').classList.contains('open')), 'nav chip opens target section exclusively');

  A(await p.$$eval('.ksec .dnav', e => e.length) === 0, 'section pager removed by design');

  // inline row expansion: full answer value + reasoning right there
  const rowN = await p.evaluate(() => { const r = document.querySelector('#ksec2 .krow'); const n = parseInt(r.querySelector('.kq').textContent.slice(1)); ksecgo(2); kexp(n); return n; });
  await p.waitForTimeout(200);
  const exp = await p.evaluate(n => {
    const d = document.getElementById('kexp'+n);
    return { vis: d.offsetParent !== null,
      verdict: d.querySelector('.choice[data-v="pick"] .verdict') && getComputedStyle(d.querySelector('.choice[data-v="pick"] .verdict')).display !== 'none',
      choiceText: d.querySelector('.choice[data-v="pick"] .ctext').textContent.length > 20,
      gist: getComputedStyle(d.querySelector('.gist')).display !== 'none',
      expl: d.querySelector('.explwrap') && d.querySelector('.explwrap').offsetParent !== null,
      link: !!d.querySelector('.kexplink') };
  }, rowN);
  A(exp.vis, 'row click expands inline in Key');
  A(exp.verdict && exp.choiceText, 'expansion shows the actual answer VALUE (full choice text + verdict)');
  A(exp.gist && exp.expl, 'expansion includes gists + in-practice');
  A(exp.link, 'Open-in-Drill link available (no back button needed — it is inline)');
  // collapse again
  await p.evaluate(n => kexp(n), rowN);
  A(await p.evaluate(n => document.getElementById('kexprow'+n).style.display === 'none', rowN), 'second click collapses the row');


  // no color violations in opened key section (marks visible now)
  const badMarks = await p.evaluate(() => {
    let bad = 0;
    document.querySelectorAll('#view-key mark').forEach(m => { if (m.offsetParent && getComputedStyle(m).color !== getComputedStyle(m.parentElement).color) bad++; });
    return bad;
  });
  A(badMarks === 0, 'mark color invariant holds in opened key sections');
  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
})();
