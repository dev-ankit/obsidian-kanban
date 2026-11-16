#!/usr/bin/env node
// Measures what one clock tick costs the board shown in the scratch instance selected by KV_RUN.
// Usage: measure-clock.mjs [label] [cpuRate] [ticks]
// A tick here is: move the page's clock one minute ahead, then focus the window (the same refresh
// the minute timer runs). Main-thread time comes from Chromium's own task accounting, so it
// includes rendering, effects, style and layout, and is compared with idle windows of equal length.
import fs from 'node:fs';
import path from 'node:path';

const [label = 'clock', rate = '1', ticks = '10'] = process.argv.slice(2);
const run = fs.realpathSync(process.env.KV_RUN || '.verify-runs/latest');
const state = JSON.parse(fs.readFileSync(path.join(run, 'state.json'), 'utf8'));
const pages = await (await fetch(`http://127.0.0.1:${state.port}/json/list`)).json();
const page = pages.find((p) => p.type === 'page' && p.url.startsWith('app://obsidian.md'));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  const p = pending.get(m.id);
  if (!p) return;
  pending.delete(m.id);
  m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails)
    throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const busy = async () => {
  const { metrics } = await send('Performance.getMetrics');
  const get = (name) => metrics.find((m) => m.name === name).value * 1000;
  return { task: get('TaskDuration'), script: get('ScriptDuration') };
};
const windowMs = 400;
async function measure(action) {
  const before = await busy();
  if (action) await evaluate(action);
  await sleep(windowMs);
  const after = await busy();
  return { task: after.task - before.task, script: after.script - before.script };
}
const summary = (rows, key) => {
  const a = rows.map((r) => r[key]).sort((x, y) => x - y);
  const round = (n) => Math.round(n * 10) / 10;
  return { median: round(a[Math.floor(a.length / 2)]), min: round(a[0]), max: round(a.at(-1)) };
};

try {
  await send('Performance.enable');
  await send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });
  const environment = await evaluate(`(() => {
    window.RealDate ||= Date;
    window.clockOffset ??= 0;
    if (Date === RealDate) window.Date = class extends RealDate {
      constructor(...args) { if (args.length) super(...args); else super(RealDate.now() + window.clockOffset); }
      static now() { return RealDate.now() + window.clockOffset; }
    };
    return { active: app.workspace.getActiveFile()?.path, cards: document.querySelectorAll('.kanban-plugin__item').length,
      relativeDates: document.querySelectorAll('.kanban-plugin__item-metadata-date-relative').length,
      coloredDates: [...document.querySelectorAll('.kanban-plugin__date')].filter((d) => d.style.getPropertyValue('--date-color')).length };
  })()`);
  await sleep(1000);
  const rows = { idle: [], sameMinuteFocus: [], minuteTick: [] };
  for (let i = 0; i < Number(ticks); i++) {
    rows.idle.push(await measure());
    rows.sameMinuteFocus.push(await measure(`window.dispatchEvent(new Event('focus'))`));
    rows.minuteTick.push(
      await measure(`window.clockOffset += 60000; window.dispatchEvent(new Event('focus'))`)
    );
  }
  const result = {
    buildHash: state.mainJsSha256,
    label,
    cpuRate: Number(rate),
    windowMs,
    environment,
    mainThreadMsPerWindow: Object.fromEntries(
      Object.entries(rows).map(([k, v]) => [k, { task: summary(v, 'task'), script: summary(v, 'script') }])
    ),
    raw: rows,
  };
  fs.writeFileSync(path.join(run, 'evidence', `${label}.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, raw: undefined }, null, 2));
} finally {
  await send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
  ws.close();
}
