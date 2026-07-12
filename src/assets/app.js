
const ANS = __ANSWERS_JS__;
function theme(){
 const d = document.body.classList.toggle(ControlState.DARK);
 document.getElementById('themebtn').textContent = d ? '◑ Light' : '◐ Dark';
}
theme(); // dark by default; button switches to light
if (!window.speechSynthesis) document.querySelectorAll('.dockspk, .docksep').forEach(b => { b.style.display = 'none'; });
function tab(btn){
 ttsStop();
 document.querySelectorAll('.tab[data-v]').forEach(b=>b.classList.remove(ControlState.ON));
 btn.classList.add(ControlState.ON);
 document.querySelectorAll('.view').forEach(v=>v.classList.remove(ControlState.ON));
 document.getElementById('view-'+btn.dataset.v).classList.add(ControlState.ON);
 dockSync();
}
let LASTQ = null;
function keepCardAnchored(c, fn){
 SNAPHOLD = Date.now() + 800;
 const t = c.getBoundingClientRect().top;
 fn();
 const d = c.getBoundingClientRect().top - t;
 if (d) window.scrollBy({top: d, left: 0, behavior: 'instant'});
}
function activeCard(){
 if (!document.getElementById('view-drill').classList.contains(ControlState.ON)) return null;
 const cards = [...document.querySelectorAll('#view-drill .card')].filter(c => c.style.display !== 'none' && c.classList.contains(CardState.OPEN));
 if (!cards.length) return null;
 if (DMODE === 'single') return cards[0];
 if (LASTQ) { const c = cards.find(x => x.dataset.n === String(LASTQ)); if (c) { const r = c.getBoundingClientRect(); if (r.bottom > 60 && r.top < window.innerHeight) return c; } }
 const line = window.innerHeight * 0.33;
 let best = null, bd = 1e9;
 for (const c of cards) { const r = c.getBoundingClientRect(); if (r.top <= line && r.bottom >= 60) return c; const d = Math.abs(r.top - line); if (d < bd) { bd = d; best = c; } }
 return best;
}
function dockSync(){
 const dock = document.getElementById('dock');
 const c = activeCard();
 if (!c) { dock.style.display = 'none'; document.body.classList.remove(ControlState.DOCK_VISIBLE); document.querySelectorAll('.card.' + CardState.DOCK_TARGET).forEach(x => x.classList.remove(CardState.DOCK_TARGET)); ttsHidePanel(); return; }
 dock.style.display = 'flex';
 document.body.classList.add(ControlState.DOCK_VISIBLE);
 document.getElementById('dockq').textContent = 'Q' + c.dataset.n;
 document.querySelectorAll('.card.' + CardState.DOCK_TARGET).forEach(x => { if (x !== c) x.classList.remove(CardState.DOCK_TARGET); });
 c.classList.add(CardState.DOCK_TARGET);
 dock.style.setProperty('--scd', c.style.getPropertyValue('--scd'));
 const revealed = c.classList.contains(CardState.REVEALED);
 const st = { [DockAction.HINT]: c.classList.contains(CardState.HINTED), [DockAction.HIGHLIGHTS]: !c.classList.contains(CardState.NO_HIGHLIGHT), [DockAction.GISTS]: c.classList.contains(CardState.SHOW_GISTS), [DockAction.EXAMPLE]: c.classList.contains(CardState.SHOW_EXAMPLE) };
 dock.querySelectorAll('.dockbtn').forEach(b => {
   const k = b.dataset.k;
   if (k in st) b.classList.toggle(ControlState.ON, st[k]);
   if ([DockAction.HINT, DockAction.GISTS, DockAction.EXAMPLE].includes(k)) b.classList.toggle(ControlState.DEAD, revealed);
   if (k === DockAction.SPEAK_WHY) b.classList.toggle(ControlState.DEAD, !revealed);
   if (k === DockAction.REVEAL) b.textContent = revealed ? 'Hide' : 'Reveal';
 });
}
function dockAssist(b){
 const c = activeCard();
 if (!c) return;
 LASTQ = c.dataset.n;
 const k = b.dataset.k;
 if (k === DockAction.ASK) { askClaude(b, parseInt(c.dataset.n, 10)); return; }
 if (k === DockAction.VOICE_SETTINGS) { ttsTogglePanel(b); return; }
 if (DockAction.isSpeak(k)) { ttsPlay(speakSegs(c, SpeechScope.forDockAction(k)), b); return; }
 keepCardAnchored(c, () => {
   if (k === DockAction.HINT) c.classList.toggle(CardState.HINTED);
   else if (k === DockAction.HIGHLIGHTS) c.classList.toggle(CardState.NO_HIGHLIGHT);
   else if (k === DockAction.GISTS) c.classList.toggle(CardState.SHOW_GISTS);
   else if (k === DockAction.EXAMPLE) c.classList.toggle(CardState.SHOW_EXAMPLE);
   else if (k === DockAction.REVEAL) {
     c.classList.toggle(CardState.REVEALED);
     c.querySelector('.reveal').textContent = c.classList.contains(CardState.REVEALED) ? 'Hide answer' : 'Reveal answer';
     if (!c.classList.contains(CardState.REVEALED)) ttsStop();
   }
 });
 dockSync();
}
let dockScrollTick = false;
window.addEventListener('scroll', () => {
 if (dockScrollTick) return;
 dockScrollTick = true;
 requestAnimationFrame(() => { dockScrollTick = false; if (document.getElementById('view-drill').classList.contains(ControlState.ON)) dockSync(); });
}, {passive: true});
// ---------- text-to-speech ----------
let TTSID = 0, TTSON = false, TTSQ = [], TTSBTN = null;
let TTSRATE = Math.min(1.4, parseFloat(safeGet(StorageKey.TTS_RATE) || '1') || 1);
let TTSVOICE = safeGet(StorageKey.TTS_VOICE) || '';
const HLAPI = !!(window.Highlight && window.CSS && CSS.highlights);
function ttsClearHL(){
 if (HLAPI) { CSS.highlights.delete('ttsline'); CSS.highlights.delete('ttsword'); }
 document.querySelectorAll('.ttsactive').forEach(e => e.classList.remove(ControlState.SPEAKING_WASH));
}
function ttsStop(){
 TTSID++; TTSON = false; TTSQ = [];
 if (window.speechSynthesis) speechSynthesis.cancel();
 if (TTSBTN) TTSBTN.classList.remove(ControlState.PLAYING);
 TTSBTN = null;
 ttsClearHL();
}
function normMap(raw){
 let text = '', ws = true;
 const map = [];
 for (let i = 0; i < raw.length; i++) {
   const ch = raw[i];
   if (/\s/.test(ch)) { if (!ws && text.length) { text += ' '; map.push(i); } ws = true; }
   else { text += ch; map.push(i); ws = false; }
 }
 while (text.length && text[text.length - 1] === ' ') { text = text.slice(0, -1); map.pop(); }
 return { text: text, map: map };
}
function segChunks(text){
 const re = /[^.!?]+[.!?]+[”")\]]?\s*|[^.!?]+$/g;
 const sents = [];
 let m;
 while ((m = re.exec(text))) sents.push([m.index, m.index + m[0].length]);
 if (!sents.length) return [[0, text.length]];
 const out = [];
 let s = sents[0][0], e = sents[0][1];
 for (let i = 1; i < sents.length; i++) {
   if ((sents[i][1] - s) > 190) { out.push([s, e]); s = sents[i][0]; }
   e = sents[i][1];
 }
 out.push([s, e]);
 return out;
}
function ttsRange(el, s, e){
 try {
   const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
   let pos = 0, node, haveStart = false;
   const r = document.createRange();
   while ((node = w.nextNode())) {
     const len = node.textContent.length;
     if (!haveStart && s < pos + len) { r.setStart(node, Math.max(0, s - pos)); haveStart = true; }
     if (haveStart && e <= pos + len) { r.setEnd(node, e - pos); return r; }
     pos += len;
   }
   if (haveStart) { r.setEndAfter(el.lastChild || el); return r; }
 } catch(err) {}
 return null;
}
function ttsMark(item){
 ttsClearHL();
 if (!item.el) return;
 item.el.classList.add(ControlState.SPEAKING_WASH);
 if (HLAPI && item.s != null) {
   const r = ttsRange(item.el, item.map[item.s], item.map[item.e - 1] + 1);
   if (r) CSS.highlights.set('ttsline', new Highlight(r));
 }
}
function ttsWord(item, ci, clen){
 if (!HLAPI || !item.el || item.s == null) return;
 const a = item.s + ci;
 if (a >= item.e) return;
 let blen = clen || 0;
 if (!blen) { const rest = item.norm.slice(a); const sp = rest.search(/\s/); blen = sp < 0 ? rest.length : sp; }
 const bEnd = Math.min(a + blen, item.e);
 if (bEnd <= a) return;
 const r = ttsRange(item.el, item.map[a], item.map[bEnd - 1] + 1);
 if (r) CSS.highlights.set('ttsword', new Highlight(r));
}
function ttsQueueFrom(segs){
 const q = [];
 for (const seg of segs) {
   if (seg.text != null) {
     const nm0 = normMap(seg.text);
     for (const se of segChunks(nm0.text)) q.push({ text: nm0.text.slice(se[0], se[1]).trim(), el: seg.el || null });
     continue;
   }
   const nm = normMap(seg.el.textContent);
   if (!nm.text) continue;
   for (const se of segChunks(nm.text)) {
     q.push({ text: nm.text.slice(se[0], se[1]).trim(), el: seg.el, norm: nm.text, map: nm.map, s: se[0], e: se[1] });
   }
 }
 return q.filter(it => it.text);
}
function ttsVoices(){
 if (!window.speechSynthesis || !speechSynthesis.getVoices) return [];
 const en = speechSynthesis.getVoices().filter(v => v.lang && v.lang.replace('_', '-').slice(0, 2).toLowerCase() === 'en');
 const goog = en.filter(v => /^google (us|uk) english/i.test(v.name));
 return goog.length ? goog : en;
}
function ttsRank(v){
 const s = (v.name + ' ' + (v.voiceURI || '')).toLowerCase();
 if (s.startsWith('google us english')) return 100;
 if (s.startsWith('google uk english female')) return 90;
 if (s.startsWith('google uk english male')) return 80;
 let r = 0;
 const prefs = [['natural', 40], ['neural', 40], ['premium', 30], ['enhanced', 25], ['siri', 20], ['samantha', 12], ['ava', 12], ['allison', 10], ['zoe', 10]];
 for (const pr of prefs) if (s.includes(pr[0])) r += pr[1];
 if (v.localService) r += 2;
 if (v.default) r += 1;
 return r;
}
function ttsVoice(){
 const vs = ttsVoices();
 if (!vs.length) return null;
 if (TTSVOICE) { const m = vs.find(v => v.name === TTSVOICE); if (m) return m; }
 return vs.slice().sort((a, b) => ttsRank(b) - ttsRank(a))[0];
}
function ttsPlay(segs, btn){
 if (!window.speechSynthesis) return;
 if (btn === TTSBTN && TTSON) { ttsStop(); return; }
 ttsStop();
 const id = TTSID;
 TTSON = true; TTSBTN = btn; btn.classList.add(ControlState.PLAYING);
 TTSQ = ttsQueueFrom(segs);
 ttsNext(id);
}
function ttsNext(id){
 if (id !== TTSID || !TTSON) return;
 if (!TTSQ.length) { ttsStop(); return; }
 const item = TTSQ.shift();
 const u = new SpeechSynthesisUtterance(item.text);
 u.rate = TTSRATE;
 const v = ttsVoice();
 if (v) u.voice = v;
 u.onstart = () => { if (id === TTSID) ttsMark(item); };
 u.onboundary = ev => { if (id === TTSID && ev.name === 'word') ttsWord(item, ev.charIndex, ev.charLength); };
 u.onend = () => ttsNext(id);
 u.onerror = () => { if (id === TTSID) ttsStop(); };
 speechSynthesis.speak(u);
}
function speakSegs(cardEl, scope){
 const card = new QuestionCard(cardEl);
 const segs = [];
 const push = (pre, el) => { if (pre) segs.push({ text: pre, el: el || null }); if (el) segs.push({ el: el }); };
 if (scope === SpeechScope.QUESTION) { push('Question ' + card.number + '.', card.stemEl); return segs; }
 if (scope === SpeechScope.CHOICES) {
   for (const choice of card.choices) push('Option ' + choice.letter + '.', choice.isPlainShown ? choice.plainEl : choice.textEl);
   return segs;
 }
 const win = card.winningLetter;
 push('Question ' + card.number + '. Correct answer: ' + win + '.', card.winningChoice.whyEl);
 for (const choice of card.choices) {
   if (choice.letter === win) continue;
   const tag = choice.verdict === Verdict.RUNNER ? 'close second' : 'eliminate';
   push('Option ' + choice.letter + ', ' + tag + '.', choice.whyEl);
 }
 if (card.exampleLeadEl) push('In practice.', card.exampleLeadEl);
 const rule = SETMETA[card.setKey].rule;
 if (rule) segs.push({ text: 'The set rule: ' + rule, el: null });
 return segs;
}
function ttsPanelSync(){
 const sel = document.getElementById('ttsvoice');
 const vs = ttsVoices().slice().sort((a, b) => ttsRank(b) - ttsRank(a));
 const cur = ttsVoice();
 sel.innerHTML = vs.map(v => '<option value="' + v.name.replace(/"/g, '&quot;') + '"' + (cur && v.name === cur.name ? ' selected' : '') + '>' + v.name + '</option>').join('');
 document.querySelectorAll('#ttspanel .ratechip').forEach(b => b.classList.toggle(ControlState.ON, parseFloat(b.dataset.r) === TTSRATE));
}
function ttsTogglePanel(b){
 const p = document.getElementById('ttspanel');
 const show = p.style.display === 'none';
 p.style.display = show ? 'block' : 'none';
 const cfg = document.querySelector('#dock [data-k="cfg"]');
 if (cfg) cfg.classList.toggle(ControlState.ON, show);
 if (show) ttsPanelSync();
}
function ttsHidePanel(){
 document.getElementById('ttspanel').style.display = 'none';
 const cfg = document.querySelector('#dock [data-k="cfg"]');
 if (cfg) cfg.classList.remove(ControlState.ON);
}
function ttsSetVoice(name){ TTSVOICE = name; safeSet(StorageKey.TTS_VOICE, name); }
function ttsSetRate(b){ TTSRATE = parseFloat(b.dataset.r); safeSet(StorageKey.TTS_RATE, String(TTSRATE)); ttsPanelSync(); }
function ttsTest(b){ ttsPlay([{ text: 'This is how the drill will sound at this voice and speed.', el: null }], b); }
if (window.speechSynthesis && typeof speechSynthesis.addEventListener === 'function') speechSynthesis.addEventListener('voiceschanged', () => { if (document.getElementById('ttspanel').style.display !== 'none') ttsPanelSync(); });

// ---------- gentle snap: after scrolling settles, magnetize the active card to the dock ----------
let SNAPT = null, SNAPHOLD = 0, SNAPPING = false;
window.addEventListener('scroll', () => {
 if (SNAPPING) return;
 clearTimeout(SNAPT);
 SNAPT = setTimeout(snapToCard, 170);
}, {passive: true});
function snapToCard(){
 if (Date.now() < SNAPHOLD || window.innerWidth < 561 || DMODE !== 'all') return;
 if (!document.getElementById('view-drill').classList.contains(ControlState.ON)) return;
 const c = activeCard();
 if (!c) return;
 const off = c.getBoundingClientRect().top - parseFloat(getComputedStyle(c).scrollMarginTop || '0');
 if (Math.abs(off) > 4 && Math.abs(off) < 90) {
   SNAPPING = true;
   window.scrollBy({top: off, behavior: 'smooth'});
   setTimeout(() => { SNAPPING = false; }, 600);
 }
}
function keepAnchored(el, fn){
 SNAPHOLD = Date.now() + 800;
 const t = el.getBoundingClientRect().top;
 fn();
 const d = el.getBoundingClientRect().top - t;
 if (d) window.scrollBy({top: d, left: 0, behavior: 'instant'});
}
function listTop(){ document.querySelector('#view-drill .toolbar').scrollIntoView({behavior:'instant', block:'start'}); window.scrollBy({top:-80, behavior:'instant'}); }
function tog(b){const c=b.closest('.card'); c.classList.toggle(CardState.OPEN); LASTQ=c.dataset.n; dockSync();}
function rev(b){
 const c = b.closest('.card');
 keepCardAnchored(c, () => {
   c.classList.toggle(CardState.REVEALED);
   b.textContent = c.classList.contains(CardState.REVEALED) ? 'Hide answer' : 'Reveal answer';
   if (!c.classList.contains(CardState.REVEALED)) ttsStop();
 });
 LASTQ = c.dataset.n;
 dockSync();}
function hint(b){ keepAnchored(b, () => { b.classList.toggle(ControlState.ON); b.closest('.card').classList.toggle(CardState.HINTED); }); }
function cplain(b){ keepAnchored(b, () => b.closest('.choice').classList.toggle(ChoiceState.SHOW_PLAIN)); }
function cgist(b){ keepAnchored(b, () => b.closest('.choice').classList.toggle(ChoiceState.SHOW_GIST)); }
function qtog(b,cls){ keepAnchored(b, () => { b.classList.toggle(ControlState.ON); b.closest('.card').classList.toggle(cls); }); }
function qhl(b){
 keepAnchored(b, () => {
   const c = b.closest('.card');
   const off = c.classList.toggle(CardState.NO_HIGHLIGHT);
   b.textContent = '🖍 Highlights: ' + (off ? 'off' : 'on');
 });
}
function hilite(){
 const btn = document.getElementById('hlbtn');
 const turnOff = btn.classList.contains(ControlState.ON);
 btn.classList.toggle(ControlState.ON, !turnOff);
 document.querySelectorAll('#view-drill .card').forEach(c => {
   c.classList.toggle(CardState.NO_HIGHLIGHT, turnOff);
   const b = c.querySelector('.hintrow button:nth-child(2)');
   if (b) b.textContent = '🖍 Highlights: ' + (turnOff ? 'off' : 'on');
 });
}
function hideAll(){ttsStop();document.querySelectorAll('.card.' + CardState.REVEALED).forEach(c=>{c.classList.remove(CardState.REVEALED);c.querySelector('.reveal').textContent='Reveal answer';}); listTop();}
function flag(b){
 b.classList.toggle(ControlState.ON);
 const n = document.querySelectorAll('.flag.' + ControlState.ON).length;
 document.getElementById('flagnote').textContent = n + ' flagged';
}
let CURF = 'all', CURFOC = null, DMODE = 'all', DIDX = 0;
function matchesF(c){
 const setOk = CURF === 'all' || c.dataset.set === CURF;
 let focOk = true;
 if (CURFOC === 'flag') focOk = c.querySelector('.flag').classList.contains(ControlState.ON);
 else if (CURFOC === 'dis') focOk = c.dataset.dis === '1';
 else if (CURFOC === 't3') focOk = c.dataset.tier === '3';
 return setOk && focOk;
}
function applyDrill(){ requestAnimationFrame(dockSync);
 const cards = [...document.querySelectorAll('#view-drill .card')];
 const matched = cards.filter(c => matchesF(c));
 if (DMODE === 'all') {
   cards.forEach(c => c.style.display = matchesF(c) ? '' : 'none');
   document.getElementById('dnav').style.display = 'none';
 } else {
   DIDX = Math.min(DIDX, Math.max(0, matched.length - 1));
   cards.forEach(c => c.style.display = 'none');
   if (matched.length) { const cur = matched[DIDX]; cur.style.display = ''; cur.classList.add(CardState.OPEN); }
   const nav = document.getElementById('dnav');
   nav.style.display = matched.length ? 'flex' : 'none';
   document.getElementById('dpos').textContent = matched.length ? `${DIDX+1} / ${matched.length}${(CURF!=='all'||CURFOC)?' (filtered)':''}` : '';
 }
 const sh = document.getElementById('showing');
 if (sh) sh.textContent = (CURF !== 'all' || CURFOC) ? '→ showing ' + matched.length + ' of 60' : '';
}
function filt(btn){
 const f = btn.dataset.f;
 if (!f) return;
 if (['flag','dis','t3'].includes(f)) {
   CURFOC = (CURFOC === f) ? null : f;
   document.querySelectorAll('.fbtn.foc').forEach(b => b.classList.toggle(ControlState.ON, b.dataset.f === CURFOC));
 } else {
   CURF = f;
   document.querySelectorAll('.fbtn[data-f]:not(.foc)').forEach(b => b.classList.toggle(ControlState.ON, b.dataset.f === f));
 }
 DIDX = 0;
 applyDrill(); listTop();
}
function dview(m){
 DMODE = m;
 document.getElementById('vAll').classList.toggle(ControlState.ON, m==='all');
 document.getElementById('vSingle').classList.toggle(ControlState.ON, m==='single');
 applyDrill(); listTop();
}
function dnav(d){
 ttsStop();
 const max = [...document.querySelectorAll('#view-drill .card')].filter(c => matchesF(c)).length;
 DIDX = Math.min(max-1, Math.max(0, DIDX + d));
 applyDrill(); listTop();
}
function resetDrill(){
 ttsStop();
 DMODE = 'all';
 document.getElementById('vAll').classList.add(ControlState.ON);
 document.getElementById('vSingle').classList.remove(ControlState.ON);
 document.querySelectorAll('#view-drill .card').forEach(c => {
   c.classList.remove(CardState.OPEN,'revealed','hinted','q-nohl','q-showgist','q-showex');
   c.querySelectorAll('.choice').forEach(ch => ch.classList.remove(ChoiceState.SHOW_PLAIN,'showgist'));
   c.querySelectorAll('.hintbtn.' + ControlState.ON).forEach(b => b.classList.remove(ControlState.ON));
   const hb = c.querySelector('.hintrow button:nth-child(2)'); if (hb) hb.textContent = '🖍 Highlights: on';
   c.querySelector('.reveal').textContent = 'Reveal answer';
 });
 document.getElementById('hlbtn').classList.add(ControlState.ON);
 document.querySelectorAll('.fbtn[data-f]').forEach(b=>b.classList.remove(ControlState.ON));
 document.querySelector('.fbtn[data-f="all"]').classList.add(ControlState.ON);
 CURF = 'all'; CURFOC = null; DIDX = 0;
 applyDrill(); listTop();
}
function askClaude(btn, n){
 const qc = QuestionCard.byNumber(n);
 const card = qc.el;
 const t = sel => { const e = card.querySelector(sel); return e ? e.textContent.trim() : null; };
 const verdictLabels = { [Verdict.PICK]: 'CORRECT', [Verdict.RUNNER]: 'close 2nd — plausible but loses', [Verdict.KILL]: 'eliminate' };
 const choices = {};
 for (const choice of qc.choices) {
   choices[choice.letter] = {
     text: choice.textEl.textContent.trim(),
     plain_words: choice.plainEl.textContent.trim(),
     pattern_gist: choice.gistEl.textContent.trim(),
     verdict: verdictLabels[choice.verdict],
     why: choice.whyEl.textContent.trim()
   };
 }
 const hintItems = card.querySelectorAll('.hintbox .hintitem p');
 const payload = {
   source: 'CCA-F practice drill (Anthropic Claude Certification – Foundations)',
   question_number: n,
   pattern_set: SETMETA[qc.setKey].name,
   set_rule: SETMETA[qc.setKey].rule,
   confidence_tier: {'1':'verified against official Anthropic docs/spec','2':'follows published Anthropic guidance','3':'debated — two defensible reads'}[card.dataset.tier],
   skim_cue: t('.cue'),
   signal_phrases: [...card.querySelectorAll('.chips .chip')].map(c => c.textContent.trim()),
   question_verbatim: t('.stem'),
   really_asking: hintItems[0] ? hintItems[0].textContent.trim() : null,
   look_first: hintItems[1] ? hintItems[1].textContent.trim() : null,
   choices: choices,
   correct_answer: qc.winningLetter,
   in_practice: { mechanism: t('.mech'), lead: t('.explead'), snippet: t('.snip') }
 };
 const instruction = 'Teach me this one CCA-F practice question. My study tool packed everything you need into the JSON below. Rules: use plain, simple language. Short lines. Examples over explanations. Give me: (1) the pattern in one short sentence. (2) a tiny concrete example for the correct answer - code or JSON, keep every line under 45 characters so nothing scrolls sideways. (3) one line per wrong choice: what makes it tempting, then the simple reason it loses. (4) a one-line memory hook to recall this pattern on the exam. Do not repeat the JSON back. Do not add generic exam advice. Keep the whole reply short - this is a learning aid, not an essay.'
 const text = instruction + '\n\n```json\n' + JSON.stringify(payload, null, 1) + '\n```';
 const done = ok => { const old = btn.textContent; btn.textContent = ok ? '✓ Copied — paste into Claude' : '✗ copy failed'; setTimeout(()=>btn.textContent = old, 1800); };
 if (navigator.clipboard && navigator.clipboard.writeText) {
   navigator.clipboard.writeText(text).then(()=>done(true), ()=>{ fallbackCopy(text) ? done(true) : done(false); });
 } else { fallbackCopy(text) ? done(true) : done(false); }
 window.__lastClaudePayload = text;
}
function fallbackCopy(text){
 const ta = document.createElement('textarea');
 ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
 document.body.appendChild(ta); ta.select();
 let ok = false; try { ok = document.execCommand('copy'); } catch(e) {}
 document.body.removeChild(ta); return ok;
}
function jumpSet(n){
 const setk = QMETA[n].s;
 document.querySelector('.tab[data-v="drill"]').click();
 CURFOC = null;
 document.querySelectorAll('.fbtn.foc').forEach(b=>b.classList.remove(ControlState.ON));
 document.querySelectorAll('.fbtn[data-f]:not(.foc)').forEach(b=>b.classList.toggle(ControlState.ON, b.dataset.f===setk));
 CURF = setk;
 if (DMODE === 'single') {
   const matched = [...document.querySelectorAll('#view-drill .card')].filter(c => matchesF(c));
   DIDX = Math.max(0, matched.findIndex(c => c.dataset.n === String(n)));
   applyDrill(); listTop();
 } else {
   applyDrill();
   const c = QuestionCard.byNumber(n).el;
   if(c){ c.classList.add(CardState.OPEN); scrollUnderToolbar(c); }
 }
}
function scrollUnderToolbar(el){
 const tb = document.querySelector('#view-drill .toolbar');
 const sticky = getComputedStyle(tb).position === 'sticky';
 el.scrollIntoView({behavior:'instant', block:'start'});
 if (sticky) {
   const d = el.getBoundingClientRect().top - (tb.getBoundingClientRect().bottom + 8);
   if (Math.abs(d) > 2) window.scrollBy({top: d, behavior: 'instant'});
 }
}
function jump(n){
 document.querySelector('.tab[data-v="drill"]').click();
 CURFOC = null;
 document.querySelectorAll('.fbtn.foc').forEach(b=>b.classList.remove(ControlState.ON));
 document.querySelectorAll('.fbtn[data-f]:not(.foc)').forEach(b=>b.classList.toggle(ControlState.ON, b.dataset.f==='all'));
 CURF='all';
 if (DMODE === 'single') { DIDX = n - 1; applyDrill(); listTop(); }
 else {
   applyDrill();
   const c = QuestionCard.byNumber(n).el;
   if(c){ c.classList.add(CardState.OPEN); scrollUnderToolbar(c); }
 }
}
const QMETA = __QMETA_JS__;
const SETMETA = __SETMETA_JS__;
const ORDER = Array.from({length:60},(_,i)=>i+1);
let EX = null;
function fmt(s){ s=Math.max(0,Math.round(s)); const m=Math.floor(s/60), ss=s%60; return m+':' + String(ss).padStart(2,'0'); }
function exStart(mode){
  EX = { mode: mode || (EX && EX.mode) || 'hard', answers:{}, flags:new Set(), times:{}, cur:0, remaining:7200, running:true, qStart:Date.now(), tick:null };
  document.getElementById('exam-start').style.display='none';
  document.getElementById('exam-results').style.display='none';
  document.getElementById('exam-run').style.display='';
  buildPalette(); renderExQ(); startTick();
}
function startTick(){
  EX.tick = setInterval(()=>{
    EX.remaining--;
    const t = document.getElementById('extimer');
    t.textContent = fmt(EX.remaining);
    t.classList.toggle(ExamState.TIMER_LOW, EX.remaining <= 600);
    if(EX.remaining<=0) exSubmit(true);
  },1000);
}
function bankTime(){ const n=ORDER[EX.cur]; EX.times[n]=(EX.times[n]||0)+(Date.now()-EX.qStart)/1000; EX.qStart=Date.now(); }
function exPause(){
  if(!EX.running) return;
  bankTime(); clearInterval(EX.tick); EX.running=false;
  document.getElementById('exam-run').style.display='none';
  document.getElementById('exam-pause').style.display='';
}
function exResume(){
  document.getElementById('exam-pause').style.display='none';
  document.getElementById('exam-run').style.display='';
  EX.running=true; EX.qStart=Date.now(); startTick();
}
function buildPalette(){
  document.getElementById('expalette').innerHTML = ORDER.map((n,i)=>`<button class="pal" id="pal${n}" onclick="exGoto(${i})">${n}</button>`).join('');
}
function palSync(){
  ORDER.forEach((n,i)=>{
    const p=document.getElementById('pal'+n);
    p.classList.toggle(ExamState.ANSWERED, n in EX.answers);
    p.classList.toggle(ExamState.FLAGGED, EX.flags.has(n));
    p.classList.toggle(ExamState.CURRENT, i===EX.cur);
  });
}
function renderExQ(){
  const n = ORDER[EX.cur];
  const qc = QuestionCard.byNumber(n);
  const card = qc.el;
  const stem = qc.stemEl.innerHTML;
  const win = qc.winningLetter;
  let ch='';
  for(const choice of qc.choices){
    const L = choice.letter;
    ch += `<div class="exchoice ${EX.answers[n]===L?ControlState.SELECTED:''} ${L===win?'iscorrect':''}" onclick="exPick('${L}')">
      <div class="exrow"><span class="exlet">${L}</span><span>${choice.textEl.textContent}</span></div>
      <div class="cplain">${choice.plainEl.textContent}</div><code class="gist">${choice.gistEl.textContent}</code><div class="exwhy">${choice.whyEl.textContent}</div></div>`;
  }
  const hint = card.querySelector('.hintbox');
  const expl = card.querySelector('.expl');
  const extra = `<div class="exhintbox">${hint.innerHTML}</div><div class="exexpl">${expl.innerHTML}</div>`;
  const qbox = document.getElementById('exqbox');
  qbox.className = 'exqbox'; // assist toggles reset per question (exPick restores its own)
  qbox.innerHTML = `<p class="exstem">${stem}</p>${extra}${ch}`;
  // assist bar per mode; toggles reset per question
  const AS = {
    easy:[[DockAction.HINT,'💡 hint'],[DockAction.EXAM_PLAIN,'◦ plain words'],[DockAction.GISTS,'⌁ gists'],[DockAction.EXAMPLE,'in practice'],[DockAction.EXAM_REVEAL,'reveal answer'],[DockAction.SPEAK_QUESTION,'🔊 question'],[DockAction.SPEAK_CHOICES,'🔊 choices'],[DockAction.SPEAK_WHY,'🔊 hear why']],
    medium:[[DockAction.HINT,'💡 hint'],[DockAction.EXAM_PLAIN,'◦ plain words'],[DockAction.SPEAK_QUESTION,'🔊 question'],[DockAction.SPEAK_CHOICES,'🔊 choices']],
    hard:[]};
  const asBtns = (AS[EX.mode]||[]).filter(([k])=>window.speechSynthesis || !DockAction.isSpeak(k)).map(([k,l])=>`<button class="asbtn${k===DockAction.SPEAK_WHY?' '+ControlState.DEAD:''}" data-k="${k}" onclick="exAssist(this)">${l}</button>`).join('');
  document.getElementById('exassist').innerHTML = asBtns ? '<span class="tglab">Help<br><i>' + EX.mode + ' mode</i></span>' + asBtns : '';
  document.getElementById('exqlabel').textContent = `Q ${EX.cur+1} / 60`;
  document.getElementById('exflagbtn').classList.toggle(ControlState.ON, EX.flags.has(n));
  document.getElementById('exprev').disabled = EX.cur===0;
  document.getElementById('exnext').disabled = EX.cur===59;
  palSync();
}
function exAssist(b){
  const k=b.dataset.k;
  if (DockAction.isSpeak(k)) {
    ttsPlay(speakSegs(QuestionCard.byNumber(ORDER[EX.cur]).el, SpeechScope.forDockAction(k)), b);
    return;
  }
  b.classList.toggle(ControlState.ON);
  document.getElementById('exqbox').classList.toggle(ExamState.assist(k), b.classList.contains(ControlState.ON));
  if (k===DockAction.EXAM_REVEAL) exSprSync();
}
function exSprSync(){
  const s=document.querySelector('.asbtn[data-k="' + DockAction.SPEAK_WHY + '"]');
  if (!s) return;
  const on=document.getElementById('exqbox').classList.contains(ExamState.assist(DockAction.EXAM_REVEAL));
  s.classList.toggle(ControlState.DEAD, !on);
  if (!on && TTSBTN===s) ttsStop();
}
function exPick(L){
  const box=document.getElementById('exqbox');
  const keep=['as-hint','as-plain','as-gist','as-ex','as-reveal'].filter(c=>box.classList.contains(c));
  EX.answers[ORDER[EX.cur]]=L; renderExQ();
  const nb=document.getElementById('exqbox');
  keep.forEach(c=>nb.classList.add(c));
  keep.forEach(c=>{const btn=document.querySelector('.asbtn[data-k="'+c.slice(3)+'"]'); if(btn) btn.classList.add(ControlState.ON);});
  exSprSync();
  document.querySelector('.exnav').scrollIntoView({behavior:'smooth', block:'end'});
}
function exFlag(){ const n=ORDER[EX.cur]; EX.flags.has(n)?EX.flags.delete(n):EX.flags.add(n); renderExQ(); }
function exNav(d){ ttsStop(); bankTime(); EX.cur=Math.min(59,Math.max(0,EX.cur+d)); renderExQ(); window.scrollTo({top:0}); }
function exGoto(i){ ttsStop(); bankTime(); EX.cur=i; renderExQ(); window.scrollTo({top:0}); }
function exSubmit(auto){
  ttsStop();
  const un = 60-Object.keys(EX.answers).length;
  if(!auto && un>0 && !confirm(un+' unanswered question'+(un>1?'s':'')+'. Submit anyway?')) return;
  bankTime(); clearInterval(EX.tick); EX.running=false;
  document.getElementById('exam-run').style.display='none';
  renderResults(auto);
}
function renderResults(auto){
  const res = document.getElementById('exam-results');
  let correct=0; const perSet={};
  for(const n of ORDER){
    const m=QMETA[n]; perSet[m.s]=perSet[m.s]||{c:0,t:0,miss:[],time:0};
    perSet[m.s].t++; perSet[m.s].time+=EX.times[n]||0;
    if(EX.answers[n]===m.w){correct++;perSet[m.s].c++;} else perSet[m.s].miss.push(n);
  }
  const pct=Math.round(correct/60*100);
  const scaled=Math.round(correct/60*1000);
  const used=7200-EX.remaining;
  const ranked=Object.entries(perSet).sort((a,b)=>(a[1].c/a[1].t)-(b[1].c/b[1].t));
  // downfall: verdict types of wrong picks
  let killPicks=0, runnerPicks=0, blanks=0;
  const missAll=[];
  for(const n of ORDER){ if(EX.answers[n]!==QMETA[n].w){ missAll.push(n);
    if(!EX.answers[n]) blanks++;
    else { const v = QuestionCard.byNumber(n).choice(EX.answers[n]).verdict;
      if(v===Verdict.RUNNER) runnerPicks++; else killPicks++; } } }
  const worst=ranked.filter(([k,v])=>v.miss.length>0).slice(0,2);
  let downfall='';
  if(missAll.length===0) downfall='<div class="downfall"><b>Clean sheet.</b> Nothing to diagnose — go book the real thing.</div>';
  else {
    const w0=worst[0]; const wname=SETMETA[w0[0]].name;
    let picktale='';
    if(runnerPicks>killPicks) picktale=`Most wrong picks (${runnerPicks}) were the <b>close 2nd</b> — you see the pattern but stop one step early. Drill the why-lines that separate pick from runner-up.`;
    else if(killPicks>0) picktale=`Most wrong picks (${killPicks}) were <b>outright kills</b> — distractor patterns (bolt-ons, extremes, myths) are still landing. Re-run the cheat codes before the why-lines.`;
    if(blanks>0) picktale+=` ${blanks} left blank — on the real exam, always answer; there's no penalty for guessing.`;
    downfall=`<div class="downfall"><b>Likely downfall: ${wname}</b> — ${w0[1].miss.length} of ${w0[1].t} missed (${Math.round(w0[1].c/w0[1].t*100)}%). ${picktale}<br><br><span class="klab">HOW TO THINK ABOUT THIS SET</span>${SETMETA[w0[0]].rule}</div>`;
  }
  const setRows=ranked.map(([k,v])=>{
    const p=Math.round(v.c/v.t*100);
    return `<div class="setrow ${p<70?'bad':''}"><span class="setpill" style="--sc:${SETMETA[k].c};--scd:${SETMETA[k].cd}">${SETMETA[k].name}</span><div class="bar"><i style="width:${p}%"></i></div><span class="setpct">${p}% (${v.c}/${v.t})</span><span class="restime">avg ${fmt(v.time/v.t)}/q</span></div>`;
  }).join('');
  const qRows=ORDER.map(n=>{
    const m=QMETA[n]; const ok=EX.answers[n]===m.w;
    const yourA=EX.answers[n]||'—';
    return `<div class="resq ${ok?'':'wrong'}" id="resq${n}">
      <button class="resqhead" onclick="resTog(${n})">
        <span class="resmark ${ok?'ok':'no'}">${ok?'✓':'✗'} Q${n}</span>
        <span class="setpill" style="--sc:${SETMETA[m.s].c};--scd:${SETMETA[m.s].cd}">${SETMETA[m.s].name}</span>
        ${EX.flags.has(n)?'<span class="resflag">⚑</span>':''}
        <span>you: <b>${yourA}</b> · correct: <b>${m.w}</b></span>
        <span class="restime">${fmt(EX.times[n]||0)}</span>
      </button>
      <div class="resdetail" data-n="${n}"></div>
    </div>`;
  }).join('');
  res.innerHTML=`
   <h2 class="codeshead">${auto?'Time expired — auto-submitted':'Exam complete'} <span class='exq'>· mode: ${EX.mode}</span></h2>
   <div class="resgrid">
     <div class="rescard"><b>${pct}%</b><span>${correct}/60 correct</span></div>
     <div class="rescard"><b>${scaled}</b><span>scaled /1000 · pass = 720</span></div>
     <div class="rescard"><b>${fmt(used)}</b><span>time used of 120:00</span></div>
     <div class="rescard"><b>${EX.flags.size}</b><span>flagged for review</span></div>
   </div>
   <h2 class="codeshead">Sets ranked — weakest first</h2>
   ${setRows}
   ${downfall}
   <h2 class="codeshead">Question review</h2>
   <p class="hint2">⚑ flags carried in. Expand any row: your pick is tagged, all four choices show their pattern-fit gist + plain words + why, and the correct one carries the In-Practice snippet. Below each: the generic way to think about that set.</p>
   ${qRows}
   <div style="margin-top:14px"><button class="exstart" onclick="exStart(EX.mode)">Retake exam (same mode)</button> <button class="exstart" onclick="document.getElementById('exam-results').style.display='none';document.getElementById('exam-start').style.display=''">Change mode</button></div>`;
  res.style.display='';
  res.scrollIntoView({behavior:'smooth'});
}
function resTog(n){
  const rq=document.getElementById('resq'+n);
  rq.classList.toggle(CardState.OPEN);
  const d=rq.querySelector('.resdetail');
  if(rq.classList.contains(CardState.OPEN) && !d.dataset.built){
    const body=QuestionCard.byNumber(n).el.querySelector('.body').cloneNode(true);
    body.querySelectorAll('.hintrow,.hintbox,.revealrow').forEach(e=>e.remove());
    const wrap=document.createElement('div');
    wrap.className=['card', CardState.OPEN, CardState.REVEALED, CardState.HINTED].join(' ');
    wrap.style.border='none'; wrap.style.background='transparent';
    wrap.appendChild(body);
    const you=EX.answers[n];
    if(you) { const c=new QuestionCard(wrap).choice(you).el.querySelector('.chead'); if(c) c.insertAdjacentHTML('beforeend','<span class="youpick">YOUR PICK</span>'); }
    const m=QMETA[n];
    wrap.insertAdjacentHTML('beforeend',`<div class="setexpl" style="--sc:${SETMETA[m.s].c}"><span class="klab">HOW TO THINK — ${SETMETA[m.s].name.toUpperCase()}</span>${SETMETA[m.s].rule}</div>`);
    d.appendChild(wrap); d.dataset.built='1';
  }
}
const SPOT_STEPS = [
 {sel:'.tabs', t:'The three rooms', p:'Key learn patterns. Drill practice. Exam rehearsal.',
   h:'<ul class="spotul"><li><b>Key</b> — learn the patterns</li><li><b>Drill</b> — practice with help</li><li><b>Exam</b> — the 1:1 rehearsal</li><li><b>? Tour</b> replays this · <b>◐</b> = light/dark</li></ul>',
   prep:()=>{} },
 {sel:'#tg-sets', t:'Sets — pick a topic', p:'6 colored sets, same colors everywhere.',
   h:'<ul class="spotul"><li><b>6 colored sets</b> — tap a pill, study that group</li><li>Same colors everywhere: Key, cards, exam results</li></ul>',
   prep:()=>{ document.querySelector('.tab[data-v="drill"]').click(); resetDrill(); } },
 {sel:'#tg-focus', t:'Narrow — stacks on your set', p:'Flagged and Disputed chips combine with the set.',
   h:'<ul class="spotul"><li><b>+ chips stack</b> on the set above</li><li><b>⚑ Flagged</b> — your flagged questions</li><li><b>⚠ Disputed 8</b> — your team marked these wrong. Drill first</li><li>Tap again = clear</li></ul>',
   prep:()=>{} },
 {sel:'#tg-view', t:'View — layout + actions', p:'All / Single layout, Highlights switch, Hide answers, Reset.',
   h:'<ul class="spotul"><li><b>☰ All / ▭ Single</b> — layout</li><li><b>Highlights switch</b> — giveaway wash on/off</li><li><b>Hide answers · ↺ Reset</b> — one-shot. Flags survive</li></ul>',
   prep:()=>{} },
 {sel:QuestionCard.selector(1, '.cardhead'), t:'A question card', p:'Flag it, see its set, read its confidence badge.',
   h:'<ul class="spotul"><li><b>⚑</b> — flag for later</li><li><b>Colored pill</b> — its set</li><li><b>Badge</b> — confidence: DOCS-VERIFIED &gt; GUIDANCE &gt; DEBATE</li></ul>',
   prep:()=>{ QuestionCard.byNumber(1).el.classList.add(CardState.OPEN); } },
 {sel:QuestionCard.selector(1, '.chips'), t:'Skim first, read later', p:'Bold takeaway + yellow giveaway chips.',
   h:'<ul class="spotul"><li><b>Bold line</b> — the one-sentence takeaway</li><li><b>Yellow chips</b> — the giveaway phrases</li><li>Spot them = skip the wall of text</li></ul>',
   prep:()=>{} },
 {sel:'#dock', t:'The floating help dock', p:'Follows your question. Hint, highlights, gists, in practice, Ask Claude.',
   h:'<ul class="spotul"><li>Follows your question — watch the <b>Q number</b> + card outline</li><li><b>💡 Hint</b> — what is really asked. Never spoils</li><li><b>🖍 HL</b> — highlights · <b>⌁ Gists</b> — choices as code</li><li><b>In practice</b> — winning mechanism + snippet</li><li><b>🤖 Ask</b> — copies the question for Claude</li></ul>',
   prep:()=>{ LASTQ='1'; dockSync(); } },
 {sel:'#dock [data-k="spq"]', t:'Listen instead of read', p:'Question, Choices, Why read aloud. Voice sets voice and speed. Words highlight as it reads. Tap again to stop.',
   h:'<ul class="spotul"><li><b>🔊 Question / Choices</b> — reads it aloud</li><li><b>🔊 Why</b> — the full answer, spoken. Unlocks on Reveal</li><li><b>⚙ Voice</b> — pick voice + speed</li><li>Words <b>highlight</b> as it reads. Tap 🔊 again = stop</li></ul>',
   prep:()=>{ LASTQ='1'; dockSync(); } },
 {sel:QuestionCard.selector(1, AnswerChoice.selector('A') + ' .chead'), t:'Per-choice toggles', p:'plain words or gist per choice.',
   h:'<ul class="spotul"><li><b>◦ plain</b> — simple words</li><li><b>⌁ gist</b> — one-line code</li><li>Toggle just the choice you are stuck on</li></ul>',
   prep:()=>{} },
 {sel:QuestionCard.selector(1, '.reveal'), t:'Reveal — the full answer', p:'Pick, eliminations, and why each loses.',
   h:'<ul class="spotul"><li><b>✓ pick</b> · <b>✕ eliminated</b>, struck through</li><li>Why each choice loses + the in-practice example</li><li>Help toggles gray out — already showing</li></ul>',
   prep:()=>{} },
 {sel:'.tab[data-v="exam"]', t:'When you are ready: Exam', p:'60 questions, 120 minutes. Easy/Medium/Hard sets the help.',
   h:'<ul class="spotul"><li><b>60 Q · 120 min</b> · one per screen</li><li><b>Easy/Medium/Hard</b> — how much help exists</li><li>Results rank your <b>weakest set</b> + how you miss</li><li>That report = your next drill list</li></ul>',
   prep:()=>{} },
];
let spotIdx = 0, spotPrevState = null;
function spotStart(){
 spotPrevState = { view: document.querySelector('.tab.' + ControlState.ON + '[data-v]').dataset.v };
 spotIdx = 0;
 document.getElementById('spot').style.display = 'block';
 spotShow();
}
function spotShow(){
 const s = SPOT_STEPS[spotIdx];
 s.prep();
 const el = document.querySelector(s.sel);
 el.scrollIntoView({behavior:'instant', block:'center'});
 requestAnimationFrame(() => {
   const r = el.getBoundingClientRect();
   const ring = document.getElementById('spotring');
   ring.style.left = (r.left - 6) + 'px';
   ring.style.top = (r.top - 6) + 'px';
   ring.style.width = (r.width + 12) + 'px';
   ring.style.height = (r.height + 12) + 'px';
   const tip = document.getElementById('spottip');
   document.getElementById('spotstep').textContent = 'COMPONENT ' + (spotIdx + 1) + ' / ' + SPOT_STEPS.length;
   document.getElementById('spottitle').textContent = s.t;
   const sp = document.getElementById('spottext');
   if (s.h) sp.innerHTML = s.h; else sp.textContent = s.p;
   document.getElementById('sprev').style.visibility = spotIdx === 0 ? 'hidden' : 'visible';
   document.getElementById('snext').textContent = spotIdx === SPOT_STEPS.length - 1 ? 'Finish ✓' : 'Next →';
   if (window.innerWidth > 560) {
     const below = r.bottom + 16;
     const tipH = tip.offsetHeight || 170;
     tip.style.left = Math.max(10, Math.min(r.left, window.innerWidth - 360)) + 'px';
     tip.style.top = (below + tipH < window.innerHeight ? below : Math.max(10, r.top - tipH - 16)) + 'px';
     tip.style.bottom = 'auto';
   }
 });
}
function spotGo(d){
 if (spotIdx === SPOT_STEPS.length - 1 && d === 1) { spotEnd(true); return; }
 spotIdx = Math.min(SPOT_STEPS.length - 1, Math.max(0, spotIdx + d));
 spotShow();
}
function spotEnd(finished){
 document.getElementById('spot').style.display = 'none';
 // restore what the walkthrough touched
 const c1 = QuestionCard.byNumber(1).el;
 c1.classList.remove(CardState.OPEN,'revealed');
 c1.querySelector('.reveal').textContent = 'Reveal answer';
 if (finished) { document.querySelector('.tab[data-v="key"]').click(); ksecgo(0); }
 else if (spotPrevState) { document.querySelector('.tab[data-v="' + spotPrevState.view + '"]').click(); }
 window.scrollTo({top:0, behavior:'instant'});
}
window.addEventListener('resize', () => { if (document.getElementById('spot').style.display !== 'none') spotShow(); });
const TOUR_STEPS = 4;
let tourStep = 0;
function safeGet(k){ try { return window.localStorage.getItem(k); } catch(e) { return null; } }
function safeSet(k, v){ try { window.localStorage.setItem(k, v); } catch(e) {} }
function tourRender(){
 document.querySelectorAll('.tourstep').forEach(s => s.classList.toggle(ControlState.ON, +s.dataset.s === tourStep));
 document.getElementById('tdots').innerHTML = Array.from({length: TOUR_STEPS}, (_, i) => '<i class="' + (i === tourStep ? 'on' : '') + '"></i>').join('');
 document.getElementById('tprev').style.visibility = tourStep === 0 ? 'hidden' : 'visible';
 document.getElementById('tnext').textContent = tourStep === TOUR_STEPS - 1 ? 'Walk me through the screen →' : 'Next →';
}
function tourGo(d){
 if (tourStep === TOUR_STEPS - 1 && d === 1) {
   tourDone();
   spotStart();
   return;
 }
 tourStep = Math.min(TOUR_STEPS - 1, Math.max(0, tourStep + d));
 tourRender();
}
function tourOpen(){ tourStep = 0; tourRender(); document.getElementById('tour').style.display = 'flex'; }
function tourDone(){ document.getElementById('tour').style.display = 'none'; safeSet(StorageKey.TOUR_DONE, '1'); }
function ksec(i){ document.getElementById('ksec'+i).classList.toggle(CardState.OPEN); }
function ksecgo(i){
 document.querySelectorAll('.ksec.' + CardState.OPEN).forEach(s => s.classList.remove(CardState.OPEN));
 const s = document.getElementById('ksec'+i);
 s.classList.add(CardState.OPEN);
 const nav = document.getElementById('keynav');
 const navSticky = getComputedStyle(nav).position === 'sticky';
 const off = () => navSticky ? nav.getBoundingClientRect().bottom : 0;
 const y = window.scrollY + s.getBoundingClientRect().top - off() - 8;
 window.scrollTo({top: Math.max(0, y), behavior: 'instant'});
 const d = s.getBoundingClientRect().top - (off() + 8);
 if (Math.abs(d) > 2) window.scrollBy({top: d, behavior: 'instant'});
}
function kexp(n){
 const row = document.getElementById('kexprow'+n);
 const open = row.style.display !== 'none';
 row.style.display = open ? 'none' : '';
 if (!open) {
   const d = document.getElementById('kexp'+n);
   if (!d.dataset.built) {
     const body = QuestionCard.byNumber(n).el.querySelector('.body').cloneNode(true);
     body.querySelectorAll('.hintrow,.hintbox,.revealrow').forEach(e=>e.remove());
     const wrap = document.createElement('div');
     wrap.className = ['card', CardState.OPEN, CardState.REVEALED, CardState.HINTED].join(' ');
     wrap.appendChild(body);
     wrap.insertAdjacentHTML('beforeend', '<button class="kexplink qlink" data-jump="'+n+'">Open in Drill ↗</button>');
     d.appendChild(wrap); d.dataset.built = '1';
   }
 }
}
if (!safeGet(StorageKey.TOUR_DONE)) tourOpen();
document.addEventListener('click', function(e){
 const btn = e.target.closest('button');
 if (btn && e.detail > 0) btn.blur(); // pointer clicks only; keyboard activation keeps focus
 const js = e.target.closest('[data-jumpset]');
 if (js) { e.preventDefault(); jumpSet(parseInt(js.dataset.jumpset, 10)); return; }
 const j = e.target.closest('[data-jump]');
 if (j) { e.preventDefault(); jump(parseInt(j.dataset.jump, 10)); }
});

