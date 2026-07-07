const { chromium } = require('playwright');
const A = (c, msg) => { if (!c) { console.log('FAIL:', msg); process.exitCode = 1; } else console.log('pass:', msg); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 900 } });
  await p.goto('file:///mnt/user-data/uploads/../outputs/CCA-F_Drill_Key_and_60Q.html'.replace('/uploads/..',''));
  await p.waitForTimeout(500);
  await p.click('.tab[data-v="drill"]');

  // example block hidden before reveal, visible after
  await p.evaluate(() => { document.querySelector('.card[data-n="17"]').classList.add('open'); });
  A(await p.evaluate(() => getComputedStyle(document.querySelector('.card[data-n="17"] .expl')).display) === 'none' ||
    await p.evaluate(() => document.querySelector('.card[data-n="17"] .expl').offsetParent === null), 'example hidden before reveal');
  await p.evaluate(() => document.querySelector('.card[data-n="17"] .reveal').click());
  A(await p.evaluate(() => document.querySelector('.card[data-n="17"] .expl').offsetParent !== null), 'example visible after reveal');
  const mech = await p.textContent('.card[data-n="17"] .mech');
  A(mech.toLowerCase().includes('resume'), 'Q17 mechanism labeled (' + mech.trim() + ')');
  const snip = await p.textContent('.card[data-n="17"] .snip');
  A(snip.includes('--resume'), 'Q17 snippet shows the actual CLI usage');
  A(await p.$$eval('.expl', e => e.length) === 60, 'all 60 example blocks present');

  // highlight toggle
  const markBg = () => p.evaluate(() => getComputedStyle(document.querySelector('.card[data-n="17"] .stem mark')).backgroundImage + getComputedStyle(document.querySelector('.card[data-n="17"] .stem mark')).backgroundColor);
  const before = await markBg();
  await p.click('#hlbtn');
  A((await p.textContent('#hlbtn')).includes('off'), 'toggle label flips to off');
  const after = await markBg();
  A(before !== after && after.includes('none'), 'stem highlights removed when off');
  A(await p.evaluate(() => getComputedStyle(document.querySelector('.card[data-n="17"] .chips')).display) === 'none', 'signal chips hidden when off');
  // key view highlights unaffected
  await p.click('.tab[data-v="key"]');
  A(await p.evaluate(() => getComputedStyle(document.querySelector('.keytable mark')).backgroundColor) !== 'rgba(0, 0, 0, 0)', 'key view giveaway highlights stay on');
  await p.click('.tab[data-v="drill"]');
  await p.click('#hlbtn');
  A((await p.textContent('#hlbtn')).includes('on') && (await markBg()) === before, 'highlights restore on');
  await b.close();
})();
