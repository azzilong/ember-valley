// Ember Valley — CDP screenshot tool (written fresh, Node stdlib only).
// Usage: node tools/capture.mjs --url=file:///abs/game/index.html?stage=play --out=screenshots/2-play.jpg [--width=1280] [--height=720] [--wait=1200] [--quality=82]
// Only --name=value form is accepted (the space form is ignored by design).
import { spawn, execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9334;

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
}
const url = arg('url');
const out = arg('out');
const width = Number(arg('width', '1280'));
const height = Number(arg('height', '720'));
const waitMs = Number(arg('wait', '1200'));
const quality = Number(arg('quality', '82'));
if (!url || !out) {
  console.error('usage: node tools/capture.mjs --url=<file://...> --out=<path> [--width=1280] [--height=720] [--wait=1200] [--quality=82]');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    `--remote-debugging-port=${PORT}`, `--window-size=${width},${height}`,
    '--user-data-dir=/tmp/ember-valley-chrome', 'about:blank',
  ], { stdio: 'ignore' });
  try {
    if (!(await waitForPort())) throw new Error('chrome devtools port never came up');
    // create a tab (PUT on newer Chrome, POST as fallback)
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
      } else if (msg.method === 'Log.entryAdded' && msg.params?.entry?.level === 'error') {
        errors.push('log: ' + msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
      }
    };
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Log.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url });
    await sleep(waitMs);
    // let the staged scene paint twice
    await send('Runtime.evaluate', { expression: 'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))', awaitPromise: true });
    await sleep(300);
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality });
    const buf = Buffer.from(shot.data, 'base64');
    writeFileSync(out, buf);
    console.log(`wrote ${out} (${buf.length} bytes, ${width}x${height})`);
    if (errors.length) {
      console.log('PAGE ERRORS:');
      for (const e of errors) console.log('  - ' + e);
    } else {
      console.log('no page errors');
    }
    ws.close();
  } finally {
    try { chrome.kill('SIGKILL'); } catch (e) { /* already gone */ }
    try { execSync('rm -rf /tmp/ember-valley-chrome'); } catch (e) { /* ignore */ }
  }
}

main().catch((e) => { console.error('capture failed:', e.message); process.exit(1); });
