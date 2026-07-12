const { chromium, devices, A, URL, run, withServer } = require('./harness');

run('smoke — core: tabs, key rows, flags, filters, jumps', async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 900 } });
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto(URL);
  await p.waitForTimeout(500);

  // 1. default dark
  A(await p.evaluate(() => document.body.classList.contains('dark')), 'loads dark by default');
  // 2. theme toggle both ways
  await p.click('#themebtn');
  A(!(await p.evaluate(() => document.body.classList.contains('dark'))), 'toggle to light');
  await p.click('#themebtn');
  A(await p.evaluate(() => document.body.classList.contains('dark')), 'toggle back to dark');

  // 3. key view visible, 6 panels, 60 rows
  A(await p.evaluate(() => document.getElementById('view-key').classList.contains('on')), 'key view on by default');
  A(await p.$$eval('.keypanel', e => e.length) === 6, '6 key panels');
  A(await p.$$eval('.keytable tbody tr.krow', e => e.length) === 60, '60 key rows');

  // 4. answers bar removed by design
  A(await p.$$eval('.keyansbar, .ansdot', e => e.length) === 0, 'answers toggle bar removed');

  // 5. key row click jumps to drill and opens card
  await p.evaluate(() => jump(15));
  await p.waitForTimeout(600);
  A(await p.evaluate(() => document.getElementById('view-drill').classList.contains('on')), 'jump switches to drill');
  A(await p.evaluate(() => document.querySelector('.card[data-n="15"]').classList.contains('open')), 'jump opens Q15');
  // is the card header visible below sticky bars?
  const vis = await p.evaluate(() => {
    const r = document.querySelector('.card[data-n="15"]').getBoundingClientRect();
    const tabs = document.querySelector('.tabs').getBoundingClientRect();
    const tb = document.querySelector('.toolbar').getBoundingClientRect();
    const stickyBottom = Math.max(tabs.bottom, tb.bottom);
    return { cardTop: r.top, stickyBottom };
  });
  A(vis.cardTop >= vis.stickyBottom - 2, `jumped card not hidden under sticky bars (cardTop ${vis.cardTop.toFixed(0)} vs sticky ${vis.stickyBottom.toFixed(0)})`);

  // 6. reveal / hide on Q15
  await p.evaluate(() => document.querySelector('.card[data-n="15"] .reveal').click());
  A(await p.evaluate(() => document.querySelector('.card[data-n="15"]').classList.contains('revealed')), 'reveal works');
  A(await p.evaluate(() => getComputedStyle(document.querySelector('.card[data-n="15"] .choice[data-v="pick"] .verdict')).display) !== 'none', 'verdict visible after reveal');
  A((await p.evaluate(() => document.querySelector('.card[data-n="15"] .reveal').textContent)).includes('Hide'), 'button flips to Hide');
  A(await p.evaluate(() => getComputedStyle(document.querySelector('.card[data-n="15"] .disband')).display) !== 'none', 'disputed band shows after reveal');

  // 7. flags
  await p.evaluate(() => { flag(document.querySelector('.card[data-n="15"] .flag')); flag(document.querySelector('.card[data-n="22"] .flag')); });
  A((await p.textContent('#flagnote')).trim() === '2 flagged', 'flag counter = 2');

  // 8. flagged filter
  await p.click('.fbtn[data-f="flag"]');
  const shown = await p.$$eval('.card', cs => cs.filter(c => c.style.display !== 'none').map(c => c.dataset.n));
  A(shown.length === 2 && shown.includes('15') && shown.includes('22'), 'flagged filter shows only Q15,Q22');

  // 9. set filters counts (clear the narrow chip left on from the flagged test)
  await p.evaluate(() => { CURFOC = null; document.querySelectorAll('.fbtn.foc').forEach(b=>b.classList.remove('on')); applyDrill(); });
  const expect = { E: 10, V: 5, M: 15, C: 13, S: 14, T: 3 };
  for (const [k, n] of Object.entries(expect)) {
    await p.click(`.fbtn[data-f="${k}"]`);
    const c = await p.$$eval('.card', cs => cs.filter(x => x.style.display !== 'none').length);
    A(c === n, `set ${k} filter shows ${n} (got ${c})`);
  }
  // 10. disputed + debate narrows (combinable: reset set to all first)
  await p.click('.fbtn[data-f="all"]');
  await p.click('.fbtn[data-f="dis"]');
  A(await p.$$eval('.card', cs => cs.filter(x => x.style.display !== 'none').length) === 8, 'disputed filter = 8');
  await p.click('.fbtn[data-f="t3"]');
  A(await p.$$eval('.card', cs => cs.filter(x => x.style.display !== 'none').length) === 3, 'debate filter = 3');

  // 11. hide all answers (ghost action now; also clear the t3 narrow)
  await p.click('.fbtn[data-f="t3"]');
  await p.click('.fbtn[data-f="all"]');
  await p.evaluate(() => { document.querySelector('.card[data-n="2"] .reveal').click(); });
  await p.evaluate(() => hideAll());
  A(await p.$$eval('.card.revealed', e => e.length) === 0, 'hide-all clears reveals');
  A(await p.evaluate(() => document.querySelector('.card[data-n="15"] .reveal').textContent.trim()) === 'Reveal answer', 'buttons reset to Reveal');

  // 12. expand/collapse via header
  await p.evaluate(() => tog(document.querySelector('.card[data-n="1"] .headbtn')));
  A(await p.evaluate(() => document.querySelector('.card[data-n="1"]').classList.contains('open')), 'header toggles open');
  await p.evaluate(() => tog(document.querySelector('.card[data-n="1"] .headbtn')));
  A(!(await p.evaluate(() => document.querySelector('.card[data-n="1"]').classList.contains('open'))), 'header toggles closed');

  // 13. flag click must NOT toggle card open (event isolation)
  const wasOpen = await p.evaluate(() => document.querySelector('.card[data-n="3"]').classList.contains('open'));
  await p.click('.card[data-n="3"] .flag');
  A((await p.evaluate(() => document.querySelector('.card[data-n="3"]').classList.contains('open'))) === wasOpen, 'flag click does not expand card');

  // 14. doc links have hrefs + target blank
  const links = await p.$$eval('.srcs a', as => as.map(a => [a.href, a.target]));
  A(links.length > 0 && links.every(l => l[0].startsWith('http') && l[1] === '_blank'), `doc links valid (${links.length} links)`);

  // 15. mobile viewport
  await p.setViewportSize({ width: 380, height: 800 });
  await p.waitForTimeout(300);
  await p.evaluate(() => jump(40));
  await p.waitForTimeout(600);
  const mvis = await p.evaluate(() => {
    const r = document.querySelector('.card[data-n="40"]').getBoundingClientRect();
    const tabs = document.querySelector('.tabs').getBoundingClientRect();
    const tb = document.querySelector('.toolbar').getBoundingClientRect();
    return { cardTop: r.top, stickyBottom: Math.max(tabs.bottom, tb.bottom) };
  });
  A(mvis.cardTop >= mvis.stickyBottom - 2, `mobile jump not hidden (cardTop ${mvis.cardTop.toFixed(0)} vs sticky ${mvis.stickyBottom.toFixed(0)})`);
  const overflowX = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  A(!overflowX, 'no horizontal overflow at 380px');

  console.log(errors.length ? 'JS ERRORS:\n' + errors.join('\n') : 'no JS errors');
  await b.close();
});

run('smoke2 — key tables, highlight wash, theme toggle', async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 900 } });
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto(URL);
  await p.waitForTimeout(500);
  await p.click('.tab[data-v="drill"]');

  // example block hidden before reveal, visible after
  await p.evaluate(() => { document.querySelector('.card[data-n="17"]').classList.add('open'); });
  const explwrapH = () => p.evaluate(() => document.querySelector('.card[data-n="17"] .explwrap').getBoundingClientRect().height);
  A(await explwrapH() < 4, 'example folded closed before reveal');
  await p.evaluate(() => document.querySelector('.card[data-n="17"] .reveal').click());
  await p.waitForTimeout(400);
  A(await explwrapH() > 40, 'example unfolds after reveal');
  const mech = await p.textContent('.card[data-n="17"] .mech');
  A(mech.toLowerCase().includes('resume'), 'Q17 mechanism labeled (' + mech.trim() + ')');
  const snip = await p.textContent('.card[data-n="17"] .snip');
  A(snip.includes('--resume'), 'Q17 snippet shows the actual CLI usage');
  A(await p.$$eval('.expl', e => e.length) === 60, 'all 60 example blocks present');

  // highlight toggle
  const markBg = () => p.evaluate(() => getComputedStyle(document.querySelector('.card[data-n="17"] .stem mark')).backgroundImage + getComputedStyle(document.querySelector('.card[data-n="17"] .stem mark')).backgroundColor);
  const before = await markBg();
  await p.click('#hlbtn');
  A(!(await p.evaluate(() => document.getElementById('hlbtn').classList.contains('on'))), 'switch flips to off');
  const after = await markBg();
  A(before !== after && after.includes('none'), 'stem highlights removed when off');
  A(await p.evaluate(() => getComputedStyle(document.querySelector('.card[data-n="17"] .chips')).display) === 'none', 'signal chips hidden when off');
  // key view highlights unaffected
  await p.click('.tab[data-v="key"]');
  A(await p.evaluate(() => getComputedStyle(document.querySelector('.keytable mark')).backgroundColor) !== 'rgba(0, 0, 0, 0)', 'key view giveaway highlights stay on');
  await p.click('.tab[data-v="drill"]');
  await p.click('#hlbtn');
  A(await p.evaluate(() => document.getElementById('hlbtn').classList.contains('on')) && (await markBg()) === before, 'highlights restore on');
  await b.close();
});

run('smoke9 — key sections, guide, inline row expansion', async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto(URL);
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
});

run('smoke10 — guide bullets, cheat links, Ask Claude payload', async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage({ viewport: { width: 900, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto(URL);
  await p.waitForTimeout(400);

  // guide uses bullets, no pager, no "Cheat codes →" button
  await p.evaluate(() => ksecgo(0));
  A(await p.$$eval('#ksec0 .kul li', e => e.length) >= 15, 'guide reformatted as bullet lists');
  A(await p.$$eval('.ksec .dnav', e => e.length) === 0, 'redundant section pager removed');
  const g = await p.textContent('#ksec0');
  A(!g.includes('Cheat codes →') && g.includes('Ask Claude'), 'no pager arrow; guide documents Ask Claude');

  // cheat-code Q link scopes drill to that question's set
  await p.evaluate(() => ksecgo(1));
  await p.evaluate(() => jumpSet(33)); // P3 → Q33, set S
  await p.waitForTimeout(500);
  A(await p.evaluate(() => document.getElementById('view-drill').classList.contains('on')), 'cheat-code link lands in Drill');
  A(await p.evaluate(() => CURF === 'S' && document.querySelector('.fbtn[data-f="S"]').classList.contains('on')), 'drill scoped to Q33 set (Support Agent)');
  const shown = await p.$$eval('#view-drill .card', cs => cs.filter(c => c.style.display !== 'none').length);
  A(shown === 14, 'only the set group visible (14 S cards)');
  A(await p.evaluate(() => document.querySelector('.card[data-n="33"]').classList.contains('open')), 'target question opened');
  // in single mode too
  await p.click('#vSingle');
  await p.evaluate(() => jumpSet(28)); // set V
  await p.waitForTimeout(300);
  const sv = await p.$$eval('#view-drill .card', cs => cs.filter(c => c.style.display !== 'none').map(c => c.dataset.n));
  A(sv.length === 1 && sv[0] === '28' && (await p.textContent('#dpos')).includes('/ 5'), 'single mode: scoped to set V, positioned on Q28');
  await p.click('#vAll');

  // Ask Claude button
  A(await p.$$eval('.dockclaude', e => e.length) === 1, 'Ask Claude lives in the dock');
  await p.evaluate(() => { document.querySelector('.fbtn[data-f="all"]').click(); const c = document.querySelector('.card[data-n="42"]'); c.classList.add('open'); c.scrollIntoView({block:'start',behavior:'instant'}); LASTQ='42'; dockSync(); });
  await p.evaluate(() => dockAssist(document.querySelector('.dockbtn[data-k="ask"]')));
  await p.waitForTimeout(300);
  const clip = await p.evaluate(() => window.__lastClaudePayload);
  A(clip.startsWith('Teach me this one CCA-F'), 'payload begins with a focused instruction');
  A(clip.includes('plain, simple language') && clip.includes('under 45 characters') && clip.includes('memory hook'), 'instruction demands simple language, no horizontal scroll, examples-first');
  const jsonStr = clip.split('```json\n')[1].split('\n```')[0];
  let obj = null; try { obj = JSON.parse(jsonStr); } catch (e) {}
  A(obj !== null, 'embedded JSON parses cleanly');
  A(obj.question_number === 42 && obj.correct_answer === 'D', 'JSON carries question number + correct answer');
  A(obj.question_verbatim.length > 100 && Object.keys(obj.choices).length === 4, 'JSON carries verbatim question + 4 choices');
  A(obj.choices.D.pattern_gist.includes('category') && obj.choices.B.why.length > 10, 'per-choice gists + whys included');
  A(obj.in_practice.mechanism && obj.in_practice.snippet.includes('isError'), 'in-practice mechanism + snippet included');
  A(obj.set_rule.length > 50 && obj.signal_phrases.length >= 2, 'set rule + signal phrases included');
  // clipboard actually received it
  const clipReal = await p.evaluate(() => navigator.clipboard.readText());
  A(clipReal === clip, 'payload actually lands on the clipboard');
  A((await p.textContent('.dockbtn[data-k="ask"]')).includes('Copied'), 'button confirms copy');
  await p.waitForTimeout(1700);
  A((await p.textContent('.dockbtn[data-k="ask"]')).includes('Ask'), 'button label restores');
  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
});

run('smoke11 — CSP guards, chip colors, sticky clearance', async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto(URL);
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
});
