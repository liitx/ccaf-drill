const { chromium } = require('playwright');
const A = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('pass:', m); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage({ viewport: { width: 900, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto('file:///mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html');
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
})();
