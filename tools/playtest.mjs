// Ember Valley — scripted end-to-end playtest via CDP (Node stdlib only).
// Usage: node tools/playtest.mjs --url=file:///abs/game/index.html
// Only --name=value form is accepted.
import { spawn, execSync } from 'node:child_process';

const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9335;

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
}
const url = arg('url');
if (!url) {
  console.error('usage: node tools/playtest.mjs --url=<file://...>');
  process.exit(2);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} ${detail}`); }
}

async function waitForPort(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return true;
    } catch (e) { /* not up yet */ }
    await sleep(250);
  }
  return false;
}

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--hatch-webgl-allowed-domains-file=/home/hatch/workspace/makefun/webgl-domains.txt',
    '--hatch-webgl-allowed-domains-sha256=8097045f0459c96c4cdc76e3a1af4e0f43f640b4b59c43d6db35e3641c0264c6',
    `--remote-debugging-port=${PORT}`, '--window-size=1280,720',
    '--user-data-dir=/tmp/ember-valley-chrome-pt', 'about:blank',
  ], { stdio: 'ignore' });
  try {
    if (!(await waitForPort())) throw new Error('chrome devtools port never came up');
    let target = null;
    for (const method of ['PUT', 'POST']) {
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method });
        if (res.ok) { target = await res.json(); break; }
      } catch (e) { /* try next */ }
    }
    if (!target || !target.webSocketDebuggerUrl) throw new Error('could not create CDP target');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0;
    const pending = new Map();
    const errors = [];
    const send = (method, params = {}) => new Promise((res, rej) => {
      const mid = ++id;
      pending.set(mid, { res, rej });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        errors.push('exception: ' + (msg.params?.exceptionDetails?.text || '') + ' ' + (msg.params?.exceptionDetails?.exception?.description || ''));
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        errors.push('console.error: ' + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
      }
    };
    const evalJs = async (expr) => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result?.value;
    };
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url });
    await sleep(1500);
    await send('Runtime.evaluate', { expression: 'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))', awaitPromise: true });

    const state = () => evalJs('window.EV.state()');
    const clickPanel = async (panel, sx, sy) => {
      const rect = await evalJs(`(() => { const r = document.getElementById(${panel === 'left' ? "'panelLeft'" : "'panelRight'"}).getBoundingClientRect(); return {left: r.left, top: r.top, width: r.width, height: r.height}; })()`);
      const x = Math.round(rect.left + (sx / 1000) * rect.width);
      const y = Math.round(rect.top + (sy / 600) * rect.height);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      await sleep(120);
    };
    const diffPos = async (i) => evalJs(`(() => { const d = window.EV.game.scene().differences[${i}]; return {x: d.x, y: d.y}; })()`);

    // 1. boot
    check('boot: EV present', await evalJs('!!window.EV'));
    let st = await state();
    check('boot: title screen', st.screen === 'title', JSON.stringify(st));
    check('title: preview canvases painted', await evalJs(`(() => { const a = document.getElementById('titlePrevL').toDataURL().length; const b = document.getElementById('titlePrevR').toDataURL().length; return a > 5000 && b > 5000; })()`));
    check('no page errors at boot', errors.length === 0, errors.join(' | '));

    // 2. start scene 1
    await evalJs('window.EV.start(0)');
    await sleep(300);
    st = await state();
    check('start scene 1: playing', st.screen === 'playing' && st.scene === 1 && st.found === 0 && st.strikes === 0 && st.hintsLeft === 3, JSON.stringify(st));

    // 3. real mouse click on a difference (left panel, diff 0 = sun)
    const p0 = await diffPos(0);
    await clickPanel('left', p0.x, p0.y);
    st = await state();
    check('click diff (real mouse): found 1', st.found === 1, JSON.stringify(st));

    // 4. click the same found ring again -> no-op, no strike
    await clickPanel('left', p0.x, p0.y);
    st = await state();
    check('re-click found ring: no strike', st.found === 1 && st.strikes === 0, JSON.stringify(st));

    // 5. wrong click in empty sky (500,200 has no difference in scene 1)
    await clickPanel('right', 500, 200);
    st = await state();
    check('wrong click: strike 1', st.strikes === 1 && st.found === 1, JSON.stringify(st));

    // 6. hint works
    await evalJs('window.EV.hint()');
    st = await state();
    check('hint: hintsLeft 2', st.hintsLeft === 2, JSON.stringify(st));

    // 7. finish scene 1 by clicking the rest (right panel, alternate sides)
    for (let i = 1; i < 7; i++) {
      const p = await diffPos(i);
      await clickPanel(i % 2 ? 'right' : 'left', p.x, p.y);
    }
    await sleep(200);
    st = await state();
    check('scene 1 complete: 7/7 + modal', st.screen === 'sceneComplete' && st.found === 7, JSON.stringify(st));
    check('scene 1 stars: 2 (1 strike)', st.stars[0] === 2, JSON.stringify(st.stars));

    // 8. next scene -> scene 2
    await evalJs('window.EV.game.nextAction()');
    await sleep(200);
    st = await state();
    check('next: scene 2 playing', st.screen === 'playing' && st.scene === 2 && st.found === 0, JSON.stringify(st));

    // 9. complete scene 2 (all 7, left panel)
    for (let i = 0; i < 7; i++) {
      const p = await diffPos(i);
      await clickPanel('left', p.x, p.y);
    }
    await sleep(200);
    st = await state();
    check('scene 2 complete', st.screen === 'sceneComplete' && st.found === 7, JSON.stringify(st));
    await evalJs('window.EV.game.nextAction()');
    await sleep(200);
    st = await state();
    check('next: scene 3 playing', st.screen === 'playing' && st.scene === 3, JSON.stringify(st));

    // 10. complete scene 3 -> game complete + best saved
    for (let i = 0; i < 7; i++) {
      const p = await diffPos(i);
      await clickPanel('right', p.x, p.y);
    }
    await sleep(200);
    await evalJs('window.EV.game.nextAction()');
    await sleep(200);
    st = await state();
    check('game complete modal', st.screen === 'gameComplete', JSON.stringify(st));
    check('best score saved', await evalJs(`(() => { const b = JSON.parse(localStorage.getItem('ember-valley-best') || 'null'); return !!(b && b.score > 0); })()`));

    // 11. fail path: 3 strikes ends the scene
    await evalJs('window.EV.start(0)');
    await sleep(200);
    await clickPanel('left', 500, 200);
    await clickPanel('left', 500, 250);
    await clickPanel('left', 500, 300);
    await sleep(200);
    st = await state();
    check('3 strikes: scene failed', st.screen === 'sceneFailed' && st.strikes === 3, JSON.stringify(st));

    // 12. pause / resume
    await evalJs('window.EV.start(0)');
    await sleep(200);
    await evalJs('window.EV.game.togglePause()');
    st = await state();
    check('pause works', st.screen === 'paused', JSON.stringify(st));
    await evalJs('window.EV.game.resume()');
    st = await state();
    check('resume works', st.screen === 'playing', JSON.stringify(st));

    // 13. no page errors overall
    check('no page errors overall', errors.length === 0, errors.join(' | '));

    console.log(`\nPLAYTEST: ${pass} passed, ${fail} failed`);
    ws.close();
    process.exit(fail ? 1 : 0);
  } finally {
    try { chrome.kill('SIGKILL'); } catch (e) { /* already gone */ }
    try { execSync('rm -rf /tmp/ember-valley-chrome-pt'); } catch (e) { /* ignore */ }
  }
}

main().catch((e) => { console.error('playtest failed:', e.message); process.exit(1); });
