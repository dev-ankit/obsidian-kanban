#!/usr/bin/env node
// Measures real CDP input in the scratch instance selected by KV_RUN.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [mode = 'typing', label = mode, rate = '1'] = process.argv.slice(2);
const run = fs.realpathSync(process.env.KV_RUN || '.verify-runs/latest');
const state = JSON.parse(fs.readFileSync(path.join(run, 'state.json'), 'utf8'));
execFileSync('node', ['.claude/skills/verify-kanban/bin/kv.mjs', 'doctor', '--run', run], {
  stdio: 'inherit',
});
const pages = await (await fetch(`http://127.0.0.1:${state.port}/json/list`)).json();
const page = pages.find((p) => p.type === 'page' && p.url.startsWith('app://obsidian.md'));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
let id = 0;
const trace = [];
let traceDone;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Tracing.dataCollected') trace.push(...m.params.value);
  if (m.method === 'Tracing.tracingComplete') traceDone?.();
  const p = pending.get(m.id);
  if (!p) return;
  pending.delete(m.id);
  clearTimeout(p.timer);
  m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const n = ++id;
    const timer = setTimeout(() => {
      pending.delete(n);
      reject(new Error(`Timeout: ${method}`));
    }, 15000);
    pending.set(n, { resolve, reject, timer });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails)
    throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mouse = (type, x, y, pressed = false) =>
  send('Input.dispatchMouseEvent', {
    type,
    x,
    y,
    button: pressed ? 'left' : 'none',
    buttons: pressed && type !== 'mouseReleased' ? 1 : 0,
    ...(type === 'mousePressed' || type === 'mouseReleased' ? { clickCount: 1 } : {}),
  });
function stats(values) {
  const a = [...values].sort((a, b) => a - b);
  return {
    n: a.length,
    median: a[Math.floor(a.length * 0.5)] || 0,
    p95: a[Math.floor(a.length * 0.95)] || 0,
    max: a.at(-1) || 0,
    total: a.reduce((a, b) => a + b, 0),
  };
}
let last = { x: 0, y: 0 };
let profiling = false;
try {
  await send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });
  await evaluate(`(() => {
    if (window.__perf) window.__perf.stop();
    const p = window.__perf = { keys:[], longTasks:[], frames:[], events:{}, trusted:{}, start:performance.now() };
    const observer = new PerformanceObserver(list => p.longTasks.push(...list.getEntries().map(e => ({start:e.startTime,duration:e.duration}))));
    observer.observe({type:'longtask'});
    const onKey = e => { if(e.key.length === 1) { const t=e.timeStamp; requestAnimationFrame(() => p.keys.push(performance.now()-t)); } };
    const onEvent = e => { p.events[e.type]=(p.events[e.type]||0)+1; if(e.isTrusted) p.trusted[e.type]=(p.trusted[e.type]||0)+1; };
    document.addEventListener('keydown',onKey,true);
    const types = ['keydown','input','dragstart','dragenter','dragover','drop','dragend','pointermove'];
    types.forEach(t => document.addEventListener(t,onEvent,true));
    let prev=performance.now(); let raf;
    const frame = now => { if(prev >= p.start) p.frames.push(now-prev); prev=now; raf=requestAnimationFrame(frame); }; raf=requestAnimationFrame(frame);
    p.stop=()=>{ observer.disconnect(); cancelAnimationFrame(raf); document.removeEventListener('keydown',onKey,true); types.forEach(t=>document.removeEventListener(t,onEvent,true)); };
    return {active:document.activeElement.className,cards:document.querySelectorAll('.kanban-plugin__item').length};
  })()`);
  const before = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(
    path.join(run, 'evidence', `${label}-before.png`),
    Buffer.from(before.data, 'base64')
  );
  const environment = await evaluate(
    `({vault:app.vault.adapter.basePath, userAgent:navigator.userAgent, active:app.workspace.getActiveFile()?.path, cards:document.querySelectorAll('.kanban-plugin__item').length, viewport:[innerWidth,innerHeight]})`
  );
  await send('Profiler.enable');
  await send('Profiler.setSamplingInterval', { interval: 1000 });
  await send('Profiler.start');
  profiling = true;
  if (process.env.TRACE)
    await send('Tracing.start', {
      categories:
        'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.invalidationTracking',
      options: 'sampling-frequency=1000',
    });
  await evaluate(
    'Object.assign(window.__perf,{keys:[],longTasks:[],frames:[],events:{},trusted:{},start:performance.now()})'
  );
  const timings = [];
  const started = performance.now();
  if (mode === 'typing') {
    const active = await evaluate(`document.activeElement.matches('.cm-content')`);
    if (!active) throw new Error('Focus a note editor through the UI before measuring typing.');
    const text = 'measuring typing latency beside a large kanban board. '.repeat(4);
    for (const ch of text) {
      const base = {
        key: ch,
        code: ch === ' ' ? 'Space' : /^[a-z]$/.test(ch) ? `Key${ch.toUpperCase()}` : 'Period',
        windowsVirtualKeyCode: ch === '.' ? 190 : ch.toUpperCase().charCodeAt(0),
      };
      const t = performance.now();
      await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, text: ch });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
      timings.push(performance.now() - t);
      await sleep(50);
    }
    await sleep(1500);
  } else if (mode === 'drag') {
    const rects = await evaluate(`(() => {
      const rect = sel => { const r=document.querySelector(sel).getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; };
      return {source:rect('.nav-file-title[data-path="Reference.md"]'), board:rect('.kanban-plugin__board')};
    })()`);
    const s = rects.source,
      b = rects.board;
    last = { x: s.x + s.w / 2, y: s.y + s.h / 2 };
    await mouse('mouseMoved', last.x, last.y);
    await mouse('mousePressed', last.x, last.y, true);
    for (let i = 1; i <= 20; i++) {
      await mouse(
        'mouseMoved',
        s.x + s.w / 2 + ((b.x + 100 - s.x - s.w / 2) * i) / 20,
        s.y + s.h / 2 + ((b.y + 150 - s.y - s.h / 2) * i) / 20,
        true
      );
      await sleep(25);
    }
    for (let i = 0; i < 240; i++) {
      last = {
        x: b.x + 80 + (Math.min(b.w, 900) - 160) * (0.5 + 0.5 * Math.sin(i / 20)),
        y: b.y + 100 + 200 * (0.5 + 0.5 * Math.sin(i / 13)),
      };
      const t = performance.now();
      await mouse('mouseMoved', last.x, last.y, true);
      timings.push(performance.now() - t);
      await sleep(25);
    }
    // Release over the file explorer so repeated measurements don't change the board.
    await mouse('mouseMoved', s.x + s.w / 2, s.y + s.h / 2, true);
    await mouse('mouseReleased', s.x + s.w / 2, s.y + s.h / 2, true);
    await sleep(500);
  } else throw new Error('mode must be typing or drag');
  const elapsed = performance.now() - started;
  const data = await evaluate(
    `(() => {window.__perf.stop(); const {stop,...data}=window.__perf; delete window.__perf; return data;})()`
  );
  if (process.env.TRACE) {
    const done = new Promise((r) => {
      traceDone = r;
    });
    await send('Tracing.end');
    await done;
    fs.writeFileSync(
      path.join(run, 'evidence', `${label}.trace.json`),
      JSON.stringify({ traceEvents: trace })
    );
  }
  const { profile } = await send('Profiler.stop');
  profiling = false;
  const after = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(
    path.join(run, 'evidence', `${label}-after.png`),
    Buffer.from(after.data, 'base64')
  );
  if (mode === 'typing') {
    const expected = await evaluate('app.workspace.activeLeaf.view.editor.getValue()');
    const notePath = path.join(state.vault, environment.active);
    const deadline = Date.now() + 5000;
    let note = fs.readFileSync(notePath, 'utf8');
    while (note !== expected && Date.now() < deadline) {
      await sleep(200);
      note = fs.readFileSync(notePath, 'utf8');
    }
    if (note !== expected) throw new Error('Typed text did not reach disk within 5 seconds.');
    fs.writeFileSync(path.join(run, 'evidence', `${label}-note.md`), note);
  }
  const profileFile = path.join(run, 'evidence', `${label}.cpuprofile`);
  fs.writeFileSync(profileFile, JSON.stringify(profile));
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  profile.samples.forEach((id, i) =>
    self.set(id, (self.get(id) || 0) + profile.timeDeltas[i] / 1000)
  );
  const hot = [...self]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([id, ms]) => ({ ms, ...nodes.get(id).callFrame }));
  const result = {
    buildHash: state.mainJsSha256,
    mode,
    label,
    cpuRate: Number(rate),
    elapsed,
    environment,
    cdpRoundTripMs: stats(timings),
    keyToAnimationFrameMs: stats(data.keys),
    frameIntervalMs: stats(data.frames),
    longTasks: { count: data.longTasks.length, ...stats(data.longTasks.map((x) => x.duration)) },
    events: data.events,
    trustedEvents: data.trusted,
    hot,
    raw: data,
    profileFile,
  };
  fs.writeFileSync(path.join(run, 'evidence', `${label}.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, raw: undefined, hot: hot.slice(0, 12) }, null, 2));
} finally {
  if (profiling) await send('Profiler.stop').catch(() => {});
  await mouse('mouseReleased', last.x, last.y, true).catch(() => {});
  await evaluate('window.__perf?.stop()').catch(() => {});
  await send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
  ws.close();
}
