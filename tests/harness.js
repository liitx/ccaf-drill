/**
 * Shared test harness for all *.spec.js suites.
 *
 * Exposes:
 *   chromium, devices — playwright re-exports
 *   URL               — file:// path to the built index.html (repo root)
 *   A(cond, msg)      — assert: prints pass/FAIL, flips the process exit code
 *   run(name, fn)     — queue a suite; suites run sequentially, a crash in one
 *                       is reported as FAIL and does not stop the others
 *   withServer(fn)    — spawn `python3 -m http.server 8931` on the repo root
 *                       for suites that need an http origin (localStorage), and
 *                       kill it afterwards
 *
 * Run one file: node tests/<name>.spec.js — or everything: tests/run.sh
 */
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

const A = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('pass:', m); };

let chain = Promise.resolve();
function run(name, fn) {
  chain = chain.then(async () => {
    console.log('── ' + name);
    try { await fn(); } catch (e) { console.log('FAIL (crash):', name, '—', e.message); process.exitCode = 1; }
  });
}

async function withServer(fn) {
  const srv = spawn('python3', ['-m', 'http.server', '8931'], { cwd: ROOT, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  try { await fn(); } finally { srv.kill(); }
}

module.exports = { chromium, devices, A, URL, run, withServer };
