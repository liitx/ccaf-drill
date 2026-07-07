const { chromium, devices } = require('playwright');
const A = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('pass:', m); };
const vis = "(el)=>{const r=el.getBoundingClientRect();return r.height>3&&parseFloat(getComputedStyle(el).opacity)>.5}";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto('file:///mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html');
  await p.waitForTimeout(400);
  await p.click('.tab[data-v="drill"]');

  // dock lifecycle
  A(await p.evaluate(() => document.getElementById('dock').style.display === 'none'), 'no dock when nothing open');
  await p.evaluate(() => document.querySelector('.card[data-n="7"] .headbtn').click());
  await p.waitForTimeout(150);
  A(await p.evaluate(() => document.getElementById('dock').style.display === 'flex' && document.getElementById('dockq').textContent === 'Q7'), 'dock appears labeled with the open question');
  A(await p.evaluate(() => getComputedStyle(document.getElementById('dock')).position === 'fixed'), 'dock is fixed (cannot shift)');

  // dock toggles drive the active card + fold animation
  const shown = sel => p.evaluate(`(${vis})(document.querySelector('${sel}'))`);
  A(!(await shown('.card[data-n="7"] .hintbox')), 'hint folded closed initially');
  await p.evaluate(() => dockAssist(document.querySelector('.dockbtn[data-k="hint"]')));
  await p.waitForTimeout(350);
  A(await shown('.card[data-n="7"] .hintbox'), 'dock Hint unfolds the hint box');
  A(await p.evaluate(() => getComputedStyle(document.querySelector('.hintbox')).transitionDuration).then(t => parseFloat(t) > 0), 'unfold is animated, not a snap');
  await p.evaluate(() => dockAssist(document.querySelector('.dockbtn[data-k="gist"]')));
  await p.waitForTimeout(350);
  A(await shown('.card[data-n="7"] .choice[data-l="A"] .gist'), 'dock Gists unfolds gists');
  A(await p.evaluate(() => document.querySelector('.dockbtn[data-k="gist"]').classList.contains('on')), 'dock button reflects on-state');

  // THE ILLUSION: card top must not move when toggling from the dock
  await p.evaluate(() => document.querySelector('.card[data-n="7"]').scrollIntoView({block:'start', behavior:'instant'}));
  await p.waitForTimeout(250);
  for (const k of ['ex', 'hint', 'gist', 'rev', 'rev']) {
    const before = await p.evaluate(() => Math.round(document.querySelector('.card[data-n="7"]').getBoundingClientRect().top));
    await p.evaluate(k => dockAssist(document.querySelector('.dockbtn[data-k="' + k + '"]')), k);
    await p.waitForTimeout(340);
    const after = await p.evaluate(() => Math.round(document.querySelector('.card[data-n="7"]').getBoundingClientRect().top));
    A(Math.abs(after - before) <= 2, `card top pixel-still through dock '${k}' (${before}→${after})`);
  }

  // reveal state: hint/gist/ex dead, rev says Hide, in-card reveal synced
  await p.evaluate(() => dockAssist(document.querySelector('.dockbtn[data-k="rev"]')));
  await p.waitForTimeout(200);
  A(await p.evaluate(() => document.querySelector('.dockbtn[data-k="hint"]').classList.contains('dead')), 'assists dead while revealed');
  A(await p.evaluate(() => document.querySelector('.dockbtn[data-k="rev"]').textContent === 'Hide'), 'dock Reveal flips to Hide');
  A(await p.evaluate(() => document.querySelector('.card[data-n="7"] .reveal').textContent === 'Hide answer'), 'in-card reveal button stays in sync');
  await p.evaluate(() => dockAssist(document.querySelector('.dockbtn[data-k="rev"]')));

  // scroll switches active card in All view
  await p.evaluate(() => { document.querySelector('.card[data-n="20"] .headbtn').click(); });
  await p.evaluate(() => document.querySelector('.card[data-n="20"]').scrollIntoView({block:'start', behavior:'instant'}));
  await p.evaluate(() => window.scrollBy(0, 1)); // trigger scroll listener
  await p.waitForTimeout(300);
  A(await p.evaluate(() => document.getElementById('dockq').textContent === 'Q20'), 'dock follows scroll to the card in view');

  // Ask Claude from dock
  await p.evaluate(() => dockAssist(document.querySelector('.dockbtn[data-k="ask"]')));
  await p.waitForTimeout(200);
  const clip = await p.evaluate(() => window.__lastClaudePayload);
  A(clip && clip.includes('"question_number": 20'), 'dock Ask copies the active question payload');

  // dock hides on other views; content clearance
  A(await p.evaluate(() => getComputedStyle(document.querySelector('#view-drill')).paddingBottom) === '96px', 'drill bottom padding clears the dock');
  await p.click('.tab[data-v="key"]');
  await p.waitForTimeout(150);
  A(await p.evaluate(() => document.getElementById('dock').style.display === 'none'), 'dock hidden outside Drill');

  // single view: dock always tracks the visible card
  await p.click('.tab[data-v="drill"]');
  await p.click('#vSingle');
  await p.waitForTimeout(200);
  A(await p.evaluate(() => document.getElementById('dock').style.display === 'flex'), 'dock present in Single view');
  await p.evaluate(() => dnav(1));
  await p.waitForTimeout(200);
  A(await p.evaluate(() => document.getElementById('dockq').textContent === 'Q' + [...document.querySelectorAll('#view-drill .card')].find(c => c.style.display !== 'none').dataset.n), 'dock tracks Single-view navigation');

  console.log(errs.length ? 'JS ERRORS: ' + errs.join(' | ') : 'no JS errors');
  await b.close();
})();
