import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const run = fs.realpathSync(process.argv[2] || '.verify-runs/latest');
const label = process.argv[3] || 'settings';
const locator = process.argv[4] || '.mod-root .view-action[aria-label="Open board settings"]';
const { port } = JSON.parse(fs.readFileSync(path.join(run, 'state.json'), 'utf8'));
const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = pages.find((p) => p.type === 'page' && p.url.startsWith('app://obsidian.md'));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => (ws.onopen = resolve));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const message = JSON.parse(e.data);
  if (pending.has(message.id)) {
    pending.get(message.id)(message.result);
    pending.delete(message.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    pending.set(++id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
await send('Profiler.enable');
await send('Profiler.start');
await send('Runtime.evaluate', {
  expression: `document.addEventListener('click', () => {
  window.settingsClickStart = performance.now();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.settingsPaintMs = performance.now() - window.settingsClickStart;
  }));
}, {capture: true, once: true})`,
});
const start = performance.now();
execFileSync(
  process.execPath,
  ['.claude/skills/verify-kanban/bin/kv.mjs', 'click', locator, '--run', run],
  { stdio: 'inherit', timeout: 120000 }
);
const observation = await send('Runtime.evaluate', {
  expression: `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve({
    clickToPaintMs: window.settingsPaintMs,
    files: app.vault.getFiles().length,
    folders: app.vault.getAllLoadedFiles().filter(f => f.children).length,
    dropdowns: document.querySelectorAll('.choices').length,
    options: document.querySelectorAll('.choices__item--choice').length,
    suggestions: document.querySelectorAll('.suggestion-item').length
  }))))`,
  awaitPromise: true,
  returnByValue: true,
});
const result = { ...observation.result.value, commandToResponsiveMs: performance.now() - start };
const { profile } = await send('Profiler.stop');
fs.writeFileSync(path.join(run, 'evidence', `${label}.cpuprofile`), JSON.stringify(profile));
fs.writeFileSync(path.join(run, 'evidence', `${label}.json`), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
ws.close();
