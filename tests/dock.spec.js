const { chromium, devices, A, URL, run, withServer } = require('./harness');

run('smoke16 — dock lifecycle, anchoring, fold, scroll tracking', async () => {
const vis = "(el)=>{const r=el.getBoundingClientRect();return r.height>3&&parseFloat(getComputedStyle(el).opacity)>.5}";

  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){} });
  await p.goto(URL);
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
});

// smoke18 — text-to-speech, side rail, scope binding, gentle snap
run('smoke18 — TTS, side rail, scope binding, snap, voice panel', async () => {

const seed = p => p.addInitScript(() => {
  try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){}
  window.__utter = []; window.__meta = []; window.__cancels = 0;
  const fake = {
    speak(u){
      window.__utter.push(u.text);
      window.__meta.push({ rate: u.rate, voice: u.voice && u.voice.name });
      setTimeout(() => { if (u.onstart) u.onstart(); }, 10);
      setTimeout(() => { if (u.onend) u.onend(); }, 120);
    },
    cancel(){ window.__cancels++; },
    getVoices(){ return [
      { name: 'Samantha', lang: 'en-US', localService: true, default: true },
      { name: 'Google US English', lang: 'en-US', localService: false, default: false },
      { name: 'Google UK English Female', lang: 'en-GB', localService: false, default: false },
      { name: 'Google UK English Male', lang: 'en-GB', localService: false, default: false },
      { name: 'Albert', lang: 'en-US', localService: true, default: false },
      { name: 'Anna', lang: 'de-DE', localService: true, default: false },
    ]; },
    addEventListener(){},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  window.SpeechSynthesisUtterance = function(t){ this.text = t; };
});


  const b = await chromium.launch();

  // ---------- desktop rail (>=1100px) ----------
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await seed(p);
  await p.goto(URL);
  await p.waitForTimeout(400);
  await p.click('.tab[data-v="drill"]');
  await p.click('.card[data-n="1"] .headbtn');
  await p.waitForTimeout(300);

  // rail geometry: right-anchored vertical column
  const dr = await p.evaluate(() => {
    const r = document.getElementById('dock').getBoundingClientRect();
    return { right: innerWidth - r.right, height: r.height, width: r.width, top: r.top };
  });
  A(dr.right < 40 && dr.height > dr.width, 'dock is a right-side vertical rail (' + Math.round(dr.width) + 'x' + Math.round(dr.height) + ')');

  // speak buttons present, spr gated on reveal
  A(await p.$$eval('#dock .dockspk', e => e.length) === 4, 'speak cluster: 3 speak + voice settings');
  A(await p.$eval('#dock [data-k="spr"]', e => e.classList.contains('dead')), 'speak-why dead before reveal');

  // scope binding: active card carries dock-target, label matches
  A(await p.$eval('.card[data-n="1"]', c => c.classList.contains('dock-target')), 'active card marked dock-target');
  A((await p.textContent('#dockq')).trim() === 'Q1', 'rail labeled Q1');

  // speak question
  await p.click('#dock [data-k="spq"]');
  await p.waitForTimeout(60);
  let st = await p.evaluate(() => ({ n: window.__utter.length, first: window.__utter[0] || '', playing: !!document.querySelector('#dock [data-k="spq"].playing') }));
  A(st.n >= 1 && st.first.startsWith('Question 1.'), 'speak-question utters the stem (' + st.first.slice(0, 40) + '...)');
  A(st.playing, 'speak button pulses while playing');

  // tap again = stop
  await p.click('#dock [data-k="spq"]');
  st = await p.evaluate(() => ({ cancels: window.__cancels, playing: !!document.querySelector('#dock .dockbtn.playing') }));
  A(st.cancels >= 1 && !st.playing, 'second tap stops speech');

  // speak choices reads all four options
  await p.evaluate(() => { window.__utter = []; });
  await p.click('#dock [data-k="spc"]');
  await p.waitForTimeout(900);
  let all = await p.evaluate(() => window.__utter.join(' '));
  A(['Option A.','Option B.','Option C.','Option D.'].every(s => all.includes(s)), 'speak-choices reads all four options');

  // reveal unlocks speak-why; script covers verdict + reasoning + set rule
  await p.click('#dock [data-k="rev"]');
  await p.waitForTimeout(350);
  A(await p.$eval('#dock [data-k="spr"]', e => !e.classList.contains('dead')), 'speak-why alive after reveal');
  await p.evaluate(() => { window.__utter = []; });
  await p.click('#dock [data-k="spr"]');
  await p.waitForTimeout(3000);
  all = await p.evaluate(() => window.__utter.join(' '));
  const win = await p.evaluate(() => QMETA[1].w);
  A(all.includes('Correct answer: ' + win), 'speak-why states the correct answer');
  A(all.includes('The set rule:'), 'speak-why ends with the set rule');
  const wrong = ['A','B','C','D'].filter(L => L !== win);
  A(wrong.every(L => all.includes('Option ' + L + ',')), 'speak-why covers every wrong choice');
  const maxLen = await p.evaluate(() => Math.max(...window.__utter.map(t => t.length)));
  A(maxLen <= 260, 'utterances chunked under Chrome cutoff (max ' + maxLen + ')');

  // hide answer mid-speech stops it
  await p.evaluate(() => { window.__utter = []; window.__cancels = 0; });
  await p.click('#dock [data-k="rev"]'); // hide → revealed off
  await p.waitForTimeout(100);
  A(await p.evaluate(() => window.__cancels >= 0 && !document.querySelector('.playing')), 'hiding the answer stops speech');
  A(await p.$eval('#dock [data-k="spr"]', e => e.classList.contains('dead')), 'speak-why dead again after hide');

  // scope follows scroll: open Q2, scroll it under the line
  await p.click('.card[data-n="2"] .headbtn');
  await p.evaluate(() => document.querySelector('.card[data-n="2"]').scrollIntoView({ behavior: 'instant', block: 'start' }));
  await p.waitForTimeout(400);
  A((await p.textContent('#dockq')).trim() === 'Q2', 'rail follows scroll to Q2');
  A(await p.$eval('.card[data-n="2"]', c => c.classList.contains('dock-target')), 'Q2 takes dock-target');
  A(await p.$eval('.card[data-n="1"]', c => !c.classList.contains('dock-target')), 'Q1 releases dock-target');

  // tab switch stops speech
  await p.click('#dock [data-k="spq"]');
  await p.waitForTimeout(60);
  await p.click('.tab[data-v="key"]');
  A(await p.evaluate(() => !document.querySelector('.playing')), 'leaving Drill stops speech');
  A(await p.evaluate(() => document.querySelectorAll('.card.dock-target').length) === 0, 'no dock-target lingers outside Drill');
  await p.click('.tab[data-v="drill"]');

  // gentle snap: settle near a boundary → magnetized to alignment
  await p.evaluate(() => {
    const c = document.querySelector('.card[data-n="2"]');
    const margin = parseFloat(getComputedStyle(c).scrollMarginTop || '0');
    window.scrollBy({ top: c.getBoundingClientRect().top - margin - 50, behavior: 'instant' });
  });
  await p.waitForTimeout(1100);
  const snapOff = await p.evaluate(() => {
    const c = document.querySelector('.card[data-n="2"]');
    return c.getBoundingClientRect().top - parseFloat(getComputedStyle(c).scrollMarginTop || '0');
  });
  A(Math.abs(snapOff) <= 4, 'card snaps to rail alignment after scroll settles (off ' + Math.round(snapOff) + 'px)');

  // fold actions do NOT trigger snap drift (no-shift invariant)
  await p.evaluate(() => window.scrollBy({ top: 40, behavior: 'instant' })); // sit off-alignment
  await p.waitForTimeout(1100); // let any snap settle first
  const before = await p.evaluate(() => document.querySelector('.card[data-n="2"]').getBoundingClientRect().top);
  await p.click('#dock [data-k="hint"]');
  await p.waitForTimeout(700);
  const after = await p.evaluate(() => document.querySelector('.card[data-n="2"]').getBoundingClientRect().top);
  A(Math.abs(after - before) <= 1, 'card pixel-still through dock hint despite snap (' + Math.round(before) + '→' + Math.round(after) + ')');

  // ---------- voice / speed / highlight ----------
  await p.evaluate(() => document.querySelector('.card[data-n="2"]').scrollIntoView({ behavior: 'instant', block: 'start' }));
  await p.waitForTimeout(400);
  await p.click('#dock [data-k="cfg"]');
  A(await p.$eval('#ttspanel', e => e.getBoundingClientRect().height > 40), 'voice panel opens');
  let opts = await p.$$eval('#ttsvoice option', os => os.map(o => o.value));
  A(opts.length === 3 && opts[0] === 'Google US English' && opts[1] === 'Google UK English Female' && opts[2] === 'Google UK English Male', 'picker shows ONLY the 3 Google voices, ranked US, UK-F, UK-M (' + opts.join(' | ') + ')');
  A(await p.$eval('#ttsvoice', e => e.value) === 'Google US English', 'Google US English is the default');
  A(await p.$eval('.ratechip[data-r="1"]', e => e.classList.contains('on')), 'rate defaults to 1x');
  await p.click('.ratechip[data-r="1.4"]');
  await p.selectOption('#ttsvoice', 'Google UK English Female');
  await p.evaluate(() => { window.__meta = []; window.__utter = []; });
  await p.click('#dock [data-k="spq"]');
  await p.waitForTimeout(200); // let the prefix utterance finish so the stem chunk (with range highlight) is live
  let meta = await p.evaluate(() => window.__meta[0]);
  A(meta && meta.rate === 1.4 && meta.voice === 'Google UK English Female', 'chosen rate + voice applied to utterance (' + JSON.stringify(meta) + ')');
  // follow-along highlight: element wash + range highlight while speaking, cleared after
  st = await p.evaluate(() => ({
    active: !!document.querySelector('.ttsactive'),
    line: !!(window.CSS && CSS.highlights && CSS.highlights.get('ttsline')),
  }));
  A(st.active && st.line, 'follow-along highlight live while speaking');
  await p.click('#dock [data-k="spq"]'); // stop
  st = await p.evaluate(() => ({
    active: !!document.querySelector('.ttsactive'),
    line: !!(window.CSS && CSS.highlights && CSS.highlights.get('ttsline')),
  }));
  A(!st.active && !st.line, 'highlight cleared on stop');
  // settings persist
  A(await p.evaluate(() => localStorage.getItem('ccaf_tts_rate') === '1.4' && localStorage.getItem('ccaf_tts_voice') === 'Google UK English Female'), 'voice + rate persisted');
  await p.click('#dock [data-k="cfg"]');
  A(await p.$eval('#ttspanel', e => e.style.display === 'none'), 'panel closes on second tap');

  A(errors.length === 0, 'no JS errors on desktop (' + errors.join(' | ') + ')');
  await p.close();

  // ---------- narrow desktop keeps bottom pill ----------
  const p2 = await b.newPage({ viewport: { width: 900, height: 900 } });
  await seed(p2);
  await p2.goto(URL);
  await p2.waitForTimeout(400);
  await p2.click('.tab[data-v="drill"]');
  await p2.click('.card[data-n="1"] .headbtn');
  await p2.waitForTimeout(300);
  const dr2 = await p2.evaluate(() => {
    const r = document.getElementById('dock').getBoundingClientRect();
    return { bottomGap: innerHeight - r.bottom, width: r.width, height: r.height };
  });
  A(dr2.bottomGap < 40 && dr2.width > dr2.height, 'below 1100px the dock stays a bottom pill');
  A(await p2.$$eval('#dock .dockspk', e => e.length) === 4, 'speak buttons present in pill mode too');
  await p2.close();

  // ---------- exam modes ----------
  const p3 = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errors3 = [];
  p3.on('pageerror', e => errors3.push('pageerror: ' + e.message));
  await seed(p3);
  await p3.goto(URL);
  await p3.waitForTimeout(400);
  await p3.click('.tab[data-v="exam"]');
  await p3.click('.modebtn:has-text("Easy")');
  await p3.waitForTimeout(300);
  let ks = await p3.$$eval('.asbtn', bs => bs.map(x => x.dataset.k));
  A(ks.includes('spq') && ks.includes('spc') && ks.includes('spr'), 'exam easy: all three speak buttons');
  A(await p3.$eval('.asbtn[data-k="spr"]', e => e.classList.contains('dead')), 'exam speak-why dead until reveal');
  await p3.click('.asbtn[data-k="reveal"]');
  A(await p3.$eval('.asbtn[data-k="spr"]', e => !e.classList.contains('dead')), 'exam reveal unlocks speak-why');
  await p3.evaluate(() => { window.__utter = []; });
  await p3.click('.asbtn[data-k="spq"]');
  await p3.waitForTimeout(60);
  A(await p3.evaluate(() => (window.__utter[0] || '').startsWith('Question 1.')), 'exam speak-question works');
  // navigation stops speech and resets reveal gating
  await p3.click('#exnext');
  A(await p3.evaluate(() => !document.querySelector('.playing')), 'exam navigation stops speech');
  A(await p3.$eval('.asbtn[data-k="spr"]', e => e.classList.contains('dead')), 'speak-why re-gated on new question');
  A(errors3.length === 0, 'no JS errors in exam (' + errors3.join(' | ') + ')');
  await p3.close();

  // ---------- medium + hard button sets ----------
  const p4 = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await seed(p4);
  await p4.goto(URL);
  await p4.waitForTimeout(400);
  await p4.click('.tab[data-v="exam"]');
  await p4.click('.modebtn:has-text("Medium")');
  await p4.waitForTimeout(200);
  ks = await p4.$$eval('.asbtn', bs => bs.map(x => x.dataset.k));
  A(ks.includes('spq') && ks.includes('spc') && !ks.includes('spr'), 'exam medium: question + choices speech, no speak-why');
  await p4.close();

  // ---------- no speechSynthesis → controls hidden ----------
  const p5 = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p5.addInitScript(() => {
    try { localStorage.setItem('ccaf_tour_done','1'); } catch(e){}
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
  });
  await p5.goto(URL);
  await p5.waitForTimeout(400);
  await p5.click('.tab[data-v="drill"]');
  await p5.click('.card[data-n="1"] .headbtn');
  await p5.waitForTimeout(200);
  A(await p5.$$eval('#dock .dockspk', bs => bs.every(x => x.getBoundingClientRect().height === 0)), 'speak buttons hidden when speech unsupported');
  await p5.click('.tab[data-v="exam"]');
  await p5.click('.modebtn:has-text("Easy")');
  await p5.waitForTimeout(200);
  ks = await p5.$$eval('.asbtn', bs => bs.map(x => x.dataset.k));
  A(!ks.some(k => k && k.slice(0, 2) === 'sp'), 'exam speak buttons absent when unsupported');
  await p5.close();

  await b.close();
});
