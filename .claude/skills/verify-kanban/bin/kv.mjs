#!/usr/bin/env node
// kv: drive an isolated Obsidian instance running this repo's Kanban build.
// Zero dependencies: Node >= 22 (global fetch + WebSocket) and Chrome DevTools Protocol.
// Run `kv.mjs help` for usage.

import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(SKILL_DIR, '../../..');
const RUNS = path.join(REPO, '.verify-runs');
const OBSIDIAN_BIN = process.env.OBSIDIAN_BIN || '/Applications/Obsidian.app/Contents/MacOS/Obsidian';
const PLUGIN_ID = 'obsidian-kanban';
const BUILD_FILES = ['main.js', 'manifest.json', 'styles.css'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- args ----------

const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) flags[k] = true;
    else flags[k] = rest[++i];
  } else pos.push(a);
}

function die(msg) {
  console.error(`kv: ${msg}`);
  process.exit(1);
}

// ---------- run state ----------

function runDir() {
  const dir = flags.run || process.env.KV_RUN || path.join(RUNS, 'latest');
  if (!fs.existsSync(path.join(dir, 'state.json'))) die(`no run at ${dir}. Start one with: kv.mjs launch`);
  return fs.realpathSync(dir);
}
const readState = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
const writeState = (dir, s) => fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(s, null, 2));
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const sha256 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// ---------- CDP ----------

async function pageWsUrl(port, timeoutMs = 0) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((p) => p.type === 'page' && p.url.startsWith('app://obsidian.md'));
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    if (Date.now() >= end) return null;
    await sleep(300);
  }
}

class Cdp {
  static async connect(wsUrl) {
    const c = new Cdp();
    c.ws = new WebSocket(wsUrl);
    c.nextId = 1;
    c.pending = new Map();
    c.ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      const p = c.pending.get(m.id);
      if (!p) return;
      c.pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    };
    await new Promise((res, rej) => {
      c.ws.onopen = res;
      c.ws.onerror = () => rej(new Error(`cannot connect to ${wsUrl}`));
    });
    return c;
  }
  // Every call times out so a stuck page fails loudly instead of hanging the agent.
  send(method, params = {}, timeoutMs = 15000) {
    const id = this.nextId++;
    if (process.env.KV_TRACE) console.error(`cdp> ${method} ${JSON.stringify(params).slice(0, 160)}`);
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} got no reply in ${timeoutMs}ms (page busy or blocked by a native dialog/menu). Run: kv.mjs doctor`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => (clearTimeout(t), resolve(v)),
        reject: (e) => (clearTimeout(t), reject(e)),
      });
    });
  }
  // Evaluates a JS expression in the page (may use await) and returns its JSON value.
  eval(expr) {
    return this.run(`return (${expr});`);
  }
  // Runs an async function body in the page and returns its JSON value.
  async run(body) {
    const r = await this.send('Runtime.evaluate', {
      expression: `(async () => { ${body} })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  close() {
    this.ws.close();
  }
}

async function attach() {
  const dir = runDir();
  const s = readState(dir);
  if (!alive(s.pid)) die(`Obsidian (pid ${s.pid}) for ${dir} is not running. Run: kv.mjs doctor`);
  const ws = await pageWsUrl(s.port);
  if (!ws) die(`no Obsidian window on port ${s.port}. Was the window closed? Run: kv.mjs doctor`);
  return { dir, s, cdp: await Cdp.connect(ws) };
}

// ---------- locators ----------
// A locator is one or more segments joined by " >> "; each segment searches inside the
// first match of the previous one. A segment is `<css>` or `<css>::<text>`, where the text
// form keeps only matches whose visible text contains <text> (case-sensitive).
// --nth N picks the Nth match of the last segment. Only visible elements match.
// Example: '.kanban-plugin__lane::Todo >> .kanban-plugin__new-item-button'

const LOCATE_FN = `(loc, nth) => {
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const segs = loc.split(' >> ');
  let scope = document;
  let hits = [], all = [];
  for (let s = 0; s < segs.length; s++) {
    const i = segs[s].indexOf('::');
    const css = i < 0 ? segs[s] : segs[s].slice(0, i);
    const text = i < 0 ? null : segs[s].slice(i + 2);
    all = [...scope.querySelectorAll(css)].filter(visible);
    hits = text === null ? all : all.filter((el) => (el.innerText || el.textContent || '').includes(text));
    if (s < segs.length - 1) {
      if (!hits.length) return { el: null, count: 0, texts: all.slice(0, 12).map((el) => (el.innerText || '').trim().slice(0, 40)), failedAt: segs[s] };
      scope = hits[0];
    }
  }
  return { el: hits[nth || 0], count: hits.length, texts: all.slice(0, 12).map((el) => (el.innerText || '').trim().slice(0, 40)) };
}`;

async function locate(cdp, loc, nth = 0) {
  return cdp.run(`
    const f = ${LOCATE_FN};
    const { el, count, texts, failedAt } = f(${JSON.stringify(loc)}, ${nth});
    if (!el) return { found: false, count, texts, failedAt };
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    return { found: true, count, x: r.left + r.width / 2, y: r.top + r.height / 2 };
  `);
}

async function mustLocate(cdp, loc, nth = 0, timeoutMs = 5000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const r = await locate(cdp, loc, nth);
    if (r.found) return r;
    if (Date.now() >= end)
      die(`no visible match for "${loc}" (nth ${nth})${r.failedAt ? ` at segment "${r.failedAt}"` : ''}. Visible elements matching that CSS: ${JSON.stringify(r.texts)}`);
    await sleep(200);
  }
}

// ---------- input (real CDP input events, not DOM .click()) ----------

async function mouse(cdp, type, x, y, button = 'none', clickCount = 0) {
  await cdp.send('Input.dispatchMouseEvent', { type, x, y, button, clickCount });
}

async function clickAt(cdp, x, y, button = 'left', count = 1) {
  await mouse(cdp, 'mouseMoved', x, y);
  for (let c = 1; c <= count; c++) {
    await mouse(cdp, 'mousePressed', x, y, button, c);
    await mouse(cdp, 'mouseReleased', x, y, button, c);
  }
}

const KEYS = {
  Enter: { code: 'Enter', keyCode: 13, text: '\r' },
  Escape: { code: 'Escape', keyCode: 27 },
  Tab: { code: 'Tab', keyCode: 9 },
  Backspace: { code: 'Backspace', keyCode: 8 },
  Delete: { code: 'Delete', keyCode: 46 },
  ArrowUp: { code: 'ArrowUp', keyCode: 38 },
  ArrowDown: { code: 'ArrowDown', keyCode: 40 },
  ArrowLeft: { code: 'ArrowLeft', keyCode: 37 },
  ArrowRight: { code: 'ArrowRight', keyCode: 39 },
  Space: { code: 'Space', keyCode: 32, text: ' ', key: ' ' },
  Home: { code: 'Home', keyCode: 36 },
  End: { code: 'End', keyCode: 35 },
};

async function pressKey(cdp, combo) {
  const parts = combo.split('+');
  const keyName = parts.pop();
  let modifiers = 0;
  for (const m of parts) {
    const k = m.toLowerCase();
    if (k === 'alt') modifiers |= 1;
    else if (k === 'ctrl') modifiers |= 2;
    else if (k === 'meta' || k === 'cmd') modifiers |= 4;
    else if (k === 'shift') modifiers |= 8;
    else if (k === 'mod') modifiers |= process.platform === 'darwin' ? 4 : 2;
    else die(`unknown modifier "${m}" in "${combo}"`);
  }
  let def = KEYS[keyName];
  if (!def) {
    if (keyName.length !== 1) die(`unknown key "${keyName}". Known: ${Object.keys(KEYS).join(', ')} or one character`);
    const up = keyName.toUpperCase();
    def = { code: /[A-Z]/.test(up) ? `Key${up}` : `Digit${keyName}`, keyCode: up.charCodeAt(0), text: keyName };
  }
  const key = def.key || keyName;
  const text = modifiers & 0b0110 ? undefined : def.text; // no text when Ctrl/Meta held
  const base = { key, code: def.code, windowsVirtualKeyCode: def.keyCode, modifiers };
  await cdp.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...base, text });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}

// ---------- evidence ----------

const OUTLINE_JS = `
  const board = document.querySelector('.workspace-leaf.mod-active .kanban-plugin__board') || document.querySelector('.kanban-plugin__board');
  if (!board) return 'NO KANBAN BOARD VISIBLE (active view: ' + app.workspace.activeLeaf?.view?.getViewType() + ')';
  const out = ['file: ' + app.workspace.getActiveFile()?.path];
  for (const lane of board.querySelectorAll('.kanban-plugin__lane')) {
    const title = lane.querySelector('.kanban-plugin__lane-title-text')?.innerText.trim() ?? '?';
    const count = lane.querySelector('.kanban-plugin__lane-title-count')?.innerText.trim() ?? '';
    out.push('## ' + title + (count ? ' (' + count + ')' : ''));
    for (const item of lane.querySelectorAll('.kanban-plugin__item')) {
      const cb = item.querySelector('input[type=checkbox]');
      const mark = cb ? (cb.checked ? '[x]' : '[ ]') : '-';
      const text = (item.querySelector('.kanban-plugin__item-title') || item).innerText.trim().replace(/\\n+/g, ' | ');
      out.push('  ' + mark + ' ' + text);
    }
  }
  return out.join('\\n');
`;

// ---------- commands ----------

async function freePort() {
  return new Promise((res) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => res(port));
    });
  });
}

async function launch() {
  if (!fs.existsSync(OBSIDIAN_BIN)) die(`Obsidian not found at ${OBSIDIAN_BIN} (set OBSIDIAN_BIN)`);
  const fixture = flags.fixture || 'basic';
  const fixtureDir = path.join(SKILL_DIR, 'fixtures', fixture);
  if (!fs.existsSync(fixtureDir)) die(`no fixture "${fixture}" in ${path.join(SKILL_DIR, 'fixtures')}`);

  // The checkout to build and run: this repo by default, or another worktree (e.g. an older
  // release) to compare behavior before and after a change.
  const buildDir = flags['build-dir'] ? path.resolve(flags['build-dir']) : REPO;
  if (!flags['no-build']) {
    if (!fs.existsSync(path.join(buildDir, 'node_modules')))
      die(`node_modules missing in ${buildDir}. Run there: yarn install --registry https://registry.npmjs.org/ (or symlink this repo's node_modules)`);
    console.log(`building plugin in ${buildDir} (yarn build)...`);
    execFileSync('yarn', ['-s', 'build'], { cwd: buildDir, stdio: 'inherit' });
  }
  for (const f of BUILD_FILES) if (!fs.existsSync(path.join(buildDir, f))) die(`build output ${f} missing in ${buildDir}`);

  // A build folder that isn't a git checkout (e.g. downloaded release assets) is labelled by name.
  const git = (...a) => {
    try {
      return execFileSync('git', a, { cwd: buildDir, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      return null;
    }
  };
  const commit = git('rev-parse', '--short', 'HEAD') ?? path.basename(buildDir);
  const dirty = (git('status', '--porcelain', '--untracked-files=no', '--', 'src') ?? '').length > 0;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const dir = path.join(RUNS, `${stamp}-${commit}${dirty ? '-dirty' : ''}`);
  const profile = path.join(dir, 'profile');
  const vault = path.join(dir, 'vault');
  const pluginDir = path.join(vault, '.obsidian', 'plugins', PLUGIN_ID);
  fs.mkdirSync(path.join(dir, 'evidence'), { recursive: true });
  fs.mkdirSync(profile, { recursive: true });
  fs.cpSync(fixtureDir, vault, { recursive: true });
  // Fixtures may say {{today}}, {{today+3}} or {{today-20}} (days) for dates relative to the run.
  const fill = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) fill(f);
      else if (e.name.endsWith('.md')) {
        const text = fs.readFileSync(f, 'utf8');
        const out = text.replace(/\{\{today([+-]\d+)?\}\}/g, (_, n) => {
          const d = new Date();
          d.setDate(d.getDate() + Number(n || 0));
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        });
        if (out !== text) fs.writeFileSync(f, out);
      }
    }
  };
  fill(vault);
  fs.mkdirSync(pluginDir, { recursive: true });
  for (const f of BUILD_FILES) fs.copyFileSync(path.join(buildDir, f), path.join(pluginDir, f));
  fs.writeFileSync(path.join(vault, '.obsidian', 'community-plugins.json'), JSON.stringify([PLUGIN_ID]));
  // macOS defaults to native OS menus, which CDP cannot see or click. Use DOM menus.
  const appJson = path.join(vault, '.obsidian', 'app.json');
  const appCfg = fs.existsSync(appJson) ? JSON.parse(fs.readFileSync(appJson, 'utf8')) : {};
  fs.writeFileSync(appJson, JSON.stringify({ ...appCfg, nativeMenus: false }, null, 2));
  const vaultId = randomBytes(8).toString('hex');
  fs.writeFileSync(
    path.join(profile, 'obsidian.json'),
    JSON.stringify({ vaults: { [vaultId]: { path: vault, ts: Date.now(), open: true } }, updateDisabled: true })
  );

  const port = flags.port ? Number(flags.port) : await freePort();
  const log = fs.openSync(path.join(dir, 'obsidian.stdout.log'), 'a');
  const child = spawn(OBSIDIAN_BIN, [
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    // A window behind other windows gets throttled and every CDP input event then waits
    // seconds for a frame. Keep it rendering at full speed.
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-background-timer-throttling',
  ], {
    detached: true,
    stdio: ['ignore', log, log],
  });
  child.unref();
  const state = {
    pid: child.pid,
    port,
    profile,
    vault,
    commit,
    dirty,
    fixture,
    buildDir,
    mainJsSha256: sha256(path.join(pluginDir, 'main.js')),
    snaps: 0,
    startedAt: new Date().toISOString(),
  };
  writeState(dir, state);
  fs.rmSync(path.join(RUNS, 'latest'), { force: true });
  fs.symlinkSync(dir, path.join(RUNS, 'latest'));
  console.log(`run dir: ${dir}\npid ${child.pid}, CDP port ${port}`);

  const ws = await pageWsUrl(port, 30000);
  if (!ws) die(`Obsidian window never appeared on port ${port}; see ${dir}/obsidian.stdout.log. Clean up: kv.mjs stop --run ${dir}`);
  const cdp = await Cdp.connect(ws);

  // Record page errors from here on; `kv.mjs errors` reads them.
  await cdp.run(`
    window.__kvErrors = [];
    document.addEventListener('pointermove', (e) => { window.__kvLastX = e.clientX; window.__kvLastY = e.clientY; }, true);
    const orig = console.error.bind(console);
    console.error = (...a) => { window.__kvErrors.push(a.map(String).join(' ').slice(0, 2000)); orig(...a); };
    window.addEventListener('error', (e) => window.__kvErrors.push('uncaught: ' + e.message));
    window.addEventListener('unhandledrejection', (e) => window.__kvErrors.push('unhandled rejection: ' + (e.reason?.stack || e.reason)));
    return true;
  `);

  // Fixed window size keeps screenshots comparable across runs.
  await cdp.run(`
    const w = window.require('electron').remote.getCurrentWindow();
    w.setSize(1400, 900);
    w.webContents.setBackgroundThrottling(false);
    return true;
  `);

  // First open of a vault with plugins asks whether to trust it. Accept like a user would.
  // (If someone already clicked it in the window, the plugin is loaded and we skip ahead.)
  const pluginLoaded = `!!app.plugins.plugins[${JSON.stringify(PLUGIN_ID)}]?._loaded`;
  const trustLoc = '.modal-container button::Trust author and enable plugins';
  await waitFor(cdp, `${pluginLoaded} || (${LOCATE_FN})(${JSON.stringify(trustLoc)}, 0).count > 0`, 20000, 'trust prompt');
  if (!(await cdp.eval(pluginLoaded))) {
    const trust = await mustLocate(cdp, trustLoc);
    await clickAt(cdp, trust.x, trust.y);
  }
  await waitFor(cdp, pluginLoaded, 15000, 'plugin to load');
  // Accepting trust opens Settings > Community plugins; close it (twice covers a nested modal).
  await sleep(500);
  for (let i = 0; i < 2 && (await cdp.eval(`!!document.querySelector('.modal-container')`)); i++) {
    await pressKey(cdp, 'Escape');
    await sleep(300);
  }
  await waitFor(cdp, `!document.querySelector('.modal-container')`, 5000, 'modals to close');

  // Open the board from the file explorer, as a user would.
  const entry = await mustLocate(cdp, `.nav-file-title[data-path="${flags.open || 'Board.md'}"]`, 0, 10000);
  await clickAt(cdp, entry.x, entry.y);
  await waitFor(cdp, `!!document.querySelector('.workspace-leaf.mod-active .kanban-plugin__board .kanban-plugin__lane')`, 10000, 'board to render');

  const version = await cdp.eval(`app.plugins.plugins[${JSON.stringify(PLUGIN_ID)}].manifest.version`);
  cdp.close();
  console.log(`READY: Kanban ${version} (${commit}${dirty ? ', dirty' : ''}) showing ${flags.open || 'Board.md'}`);
}

async function waitFor(cdp, expr, timeoutMs, what) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    try {
      if (await cdp.eval(expr)) return;
    } catch {}
    if (Date.now() >= end) throw new Error(`timed out after ${timeoutMs}ms waiting for ${what}`);
    await sleep(200);
  }
}

async function doctor() {
  const dir = runDir();
  const s = readState(dir);
  const checks = [];
  const check = (name, ok, detail = '') => checks.push({ name, ok, detail });

  check('process alive', alive(s.pid), `pid ${s.pid}`);
  let owner = '';
  try {
    owner = execFileSync('lsof', ['-nP', `-iTCP:${s.port}`, '-sTCP:LISTEN', '-t']).toString().trim();
  } catch {}
  check('CDP port owned by our process', owner.split('\n').includes(String(s.pid)), `port ${s.port} -> ${owner || 'nobody'}`);
  const ws = alive(s.pid) ? await pageWsUrl(s.port, 2000) : null;
  check('Obsidian window open', !!ws, ws ? '' : 'window closed or app still starting');
  const builtNow = path.join(s.buildDir || REPO, 'main.js');
  if (fs.existsSync(builtNow))
    check('build on disk matches running build', sha256(builtNow) === s.mainJsSha256, `${s.buildDir || REPO}; rebuild + relaunch if you changed src/`);
  if (ws) {
    const cdp = await Cdp.connect(ws);
    const info = await cdp.eval(`({
      profile: app.vault.adapter.basePath,
      loaded: !!app.plugins.plugins['${PLUGIN_ID}']?._loaded,
      version: app.plugins.plugins['${PLUGIN_ID}']?.manifest.version,
      modal: [...document.querySelectorAll('.modal-container')].map((m) => m.innerText.slice(0, 80)),
      view: app.workspace.activeLeaf?.view?.getViewType(),
      file: app.workspace.getActiveFile()?.path,
      errors: (window.__kvErrors || []).length,
    })`);
    cdp.close();
    check('window is our scratch vault', info.profile === s.vault, info.profile);
    check('Kanban plugin loaded', info.loaded, `version ${info.version}`);
    check('no modal blocking input', info.modal.length === 0, info.modal.join(' / '));
    check('active view', true, `${info.view} ${info.file || ''}`);
    check('no page errors recorded', info.errors === 0, `${info.errors} (see: kv.mjs errors)`);
  }
  for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  (${c.detail})` : ''}`);
  console.log(`run: ${dir}`);
  if (checks.some((c) => !c.ok)) process.exit(1);
}

async function snap() {
  const name = pos[0] || 'snap';
  const { dir, s, cdp } = await attach();
  s.snaps += 1;
  writeState(dir, s);
  const base = path.join(dir, 'evidence', `${String(s.snaps).padStart(2, '0')}-${name}`);
  let clip;
  if (typeof flags.clip === 'string') {
    await mustLocate(cdp, flags.clip);
    clip = await cdp.run(`
      const { el } = (${LOCATE_FN})(${JSON.stringify(flags.clip)}, 0);
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height, scale: devicePixelRatio };
    `);
  }
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', ...(clip && { clip }) });
  fs.writeFileSync(`${base}.png`, Buffer.from(shot.data, 'base64'));
  fs.writeFileSync(`${base}.outline.txt`, (await cdp.run(OUTLINE_JS)) + '\n');
  const file = flags.file || (await cdp.eval('app.workspace.getActiveFile()?.path')) || 'Board.md';
  const src = path.join(s.vault, file);
  if (fs.existsSync(src)) fs.copyFileSync(src, `${base}.${path.basename(file)}`);
  cdp.close();
  console.log(`${base}.png\n${base}.outline.txt\n${base}.${path.basename(file)}`);
}

async function stop() {
  const dir = runDir();
  const s = readState(dir);
  if (alive(s.pid)) {
    process.kill(s.pid, 'SIGTERM');
    for (let i = 0; i < 50 && alive(s.pid); i++) await sleep(100);
    if (alive(s.pid)) process.kill(s.pid, 'SIGKILL');
  }
  await sleep(500);
  // Helpers carry our unique profile path in argv; anything left is ours.
  let left = '';
  try {
    left = execFileSync('pgrep', ['-f', '--', `--user-data-dir=${s.profile}`]).toString().trim();
  } catch {}
  for (const pid of left.split('\n').filter(Boolean)) {
    try {
      process.kill(Number(pid), 'SIGKILL');
    } catch {}
  }
  fs.rmSync(s.profile, { recursive: true, force: true });
  s.stoppedAt = new Date().toISOString();
  writeState(dir, s);
  console.log(`stopped pid ${s.pid}; removed profile. Kept: ${dir}/evidence and ${dir}/vault`);
}

const HELP = `kv.mjs - drive an isolated Obsidian running this repo's Kanban build

  launch [--fixture basic] [--open Board.md] [--no-build] [--build-dir DIR] [--port N]
                      build, create .verify-runs/<id>/, start Obsidian, accept trust, open board.
                      --build-dir runs another checkout's build (e.g. a worktree of an older tag)
  doctor              read-only health check of the current run (exit 1 on any FAIL)
  outline             print the visible board: lanes, card titles, checkbox state
  file [path] [--expect T] [--absent T] [--timeout ms]
                      print a vault file (default Board.md) from disk; with --expect/--absent,
                      poll until it holds (saves are debounced) and exit 1 if it never does
  ls                  list vault files (excluding .obsidian/)
  snap <name> [--file path] [--clip loc]
                      evidence: screenshot (of just <loc> with --clip) + outline + copy of the board file
  click <loc> [--right] [--double] [--nth N]
  drag <fromLoc> <toLoc> [--before|--after] [--axis x] [--nth N] [--to-nth N] [--settle ms] [--hold]
                      drag with real pointer events. Target a card with --before/--after to land
                      next to it; target a lane (or its card area) to drop into it. Lanes: grab
                      the lane's grip and use --axis x so before/after mean left/right.
  drag <fromLoc> [<toLoc>] --edge left|right [--dwell ms] [--inset px] [--before|--after] [--hold]
                      hold the dragged item at the board's edge and report how far/fast it
                      scrolled; then drop on <toLoc> (now on screen), or where the pointer is
                      --hold stops before releasing so you can snap mid-drag
  release             release the mouse button (ends a drag --hold)
  type <text>         insert text at the focused element (like typing / IME commit)
  key <combo>         e.g. Enter, Escape, Home, End, Mod+P, Shift+Enter, Mod+Enter, a
  wait <loc> [--gone] [--timeout ms]
  count <loc>         number of visible matches
  eval <expr>         evaluate a JS expression in the page (await allowed), print JSON.
                      For statements pass an IIFE: '(() => { ...; return x })()'. Observation only.
  errors              console errors / uncaught exceptions recorded since launch
  stop                kill the instance this run started, delete its profile, keep evidence + vault

  <loc> is "<css>" or "<css>::<text>" (visible text contains <text>); chain with " >> " to
  search inside the previous match, e.g. ".kanban-plugin__lane::Todo >> .kanban-plugin__new-item-button".
  Target a run with --run DIR or KV_RUN=DIR; default is .verify-runs/latest.`;

async function main() {
  switch (cmd) {
    case 'launch':
      return launch();
    case 'doctor':
      return doctor();
    case 'stop':
      return stop();
    case 'snap':
      return snap();
    case 'file': {
      // Board saves are debounced (~1-2s); --expect/--absent poll the disk until true.
      const s = readState(runDir());
      const file = path.join(s.vault, pos[0] || 'Board.md');
      const end = Date.now() + Number(flags.timeout || 5000);
      const ok = (t) =>
        (typeof flags.expect !== 'string' || t.includes(flags.expect)) &&
        (typeof flags.absent !== 'string' || !t.includes(flags.absent));
      let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
      while ((text === null || !ok(text)) && Date.now() < end) {
        await sleep(200);
        text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
      }
      if (text === null) die(`${file} does not exist`);
      process.stdout.write(text);
      if (!ok(text)) die(`${pos[0] || 'Board.md'}: expectation not met (expect ${JSON.stringify(flags.expect)}, absent ${JSON.stringify(flags.absent)})`);
      return;
    }
    case 'ls': {
      const s = readState(runDir());
      const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.name === '.obsidian' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.relative(s.vault, path.join(d, e.name))]);
      return console.log(walk(s.vault).sort().join('\n'));
    }
    case 'outline': {
      const { cdp } = await attach();
      console.log(await cdp.run(OUTLINE_JS));
      return cdp.close();
    }
    case 'eval': {
      const { cdp } = await attach();
      console.log(JSON.stringify(await cdp.eval(pos[0]), null, 2));
      return cdp.close();
    }
    case 'errors': {
      const { cdp } = await attach();
      const errs = await cdp.eval('window.__kvErrors || []');
      console.log(errs.length ? errs.join('\n---\n') : 'no errors recorded');
      return cdp.close();
    }
    case 'click': {
      const { cdp } = await attach();
      const r = await mustLocate(cdp, pos[0], Number(flags.nth || 0));
      await clickAt(cdp, r.x, r.y, flags.right ? 'right' : 'left', flags.double ? 2 : 1);
      console.log(`${cmd}ed ${pos[0]} at (${Math.round(r.x)}, ${Math.round(r.y)}); ${r.count} match(es)`);
      return cdp.close();
    }
    case 'drag': {
      const { cdp } = await attach();
      const edge = typeof flags.edge === 'string' ? flags.edge : null;
      if (edge && !['left', 'right'].includes(edge)) die('--edge must be left or right');
      if (!edge && !pos[1]) die('drag needs a target locator, or --edge left|right');
      // With --edge, mustLocate on the target would scroll the board; resolve it after scrolling.
      const axis = flags.axis === 'x' ? 'x' : 'y';
      const toNth = Number(flags['to-nth'] || 0);
      const measure = () =>
        cdp.run(`
          const { el } = (${LOCATE_FN})(${JSON.stringify(pos[1])}, ${toNth});
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom,
            onScreen: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };
        `);
      // The board's horizontal scroller: the nearest ancestor of the lanes that overflows sideways.
      const scroller = () =>
        cdp.run(`
          let el = document.querySelector('.workspace-leaf.mod-active .kanban-plugin__lane');
          while (el && !(el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible')) el = el.parentElement;
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, scrollLeft: el.scrollLeft, max: el.scrollWidth - el.clientWidth };
        `);

      // Resolve both ends before pressing so a bad locator never leaves the button held.
      if (!edge) await mustLocate(cdp, pos[1], toNth);
      const a = await mustLocate(cdp, pos[0], Number(flags.nth || 0));
      // Kanban places the dragged entity (a card, or a whole lane when you grab its grip) by its
      // center. Remember where that center sits relative to the grab point.
      const off = await cdp.run(`
        const { el } = (${LOCATE_FN})(${JSON.stringify(pos[0])}, ${Number(flags.nth || 0)});
        const ent = el.closest('.kanban-plugin__item') || el.closest('.kanban-plugin__lane-wrapper') || el;
        const r = ent.getBoundingClientRect();
        return { dx: r.left + r.width / 2 - ${a.x}, dy: r.top + r.height / 2 - ${a.y} };
      `);
      let t = edge ? null : await measure();
      if (!edge && !t?.onScreen) die('source and target are not on screen together; drag toward the edge with --edge to scroll first');
      // Pointer position that puts the entity's center just past the target's edge (or on its center).
      const dropAt = (r) => {
        const cx = (r.left + r.right) / 2;
        const cy = (r.top + r.bottom) / 2;
        let ex = cx;
        let ey = cy;
        if (axis === 'y') ey = flags.before ? r.top - 10 : flags.after ? r.bottom + 10 : cy;
        else ex = flags.before ? r.left - 10 : flags.after ? r.right + 10 : cx;
        return [ex - off.dx, ey - off.dy];
      };
      let x = a.x;
      let y = a.y;
      const moveTo = async (tx, ty, steps) => {
        const [sx, sy] = [x, y];
        for (let i = 1; i <= steps; i++) {
          [x, y] = [sx + ((tx - sx) * i) / steps, sy + ((ty - sy) * i) / steps];
          await mouse(cdp, 'mouseMoved', x, y, 'left');
          await sleep(25);
        }
      };
      let report = '';
      try {
        await mouse(cdp, 'mouseMoved', x, y);
        await mouse(cdp, 'mousePressed', x, y, 'left', 1);
        await moveTo(x + 8, y + 8, 4); // start the drag; the source leaves the layout here
        await sleep(300);
        if (edge) {
          // Hold the pointer inside the scroll zone at the board's edge and measure the scroll.
          const sc = await scroller();
          if (!sc) throw new Error('board does not scroll horizontally; use a wider fixture (e.g. --fixture wide)');
          const inset = Number(flags.inset ?? 5); // px from the edge; closer = faster
          await moveTo(edge === 'right' ? sc.right - inset : sc.left + inset, y, 15);
          const before = (await scroller()).scrollLeft;
          const started = Date.now();
          await sleep(Number(flags.dwell || 2000));
          const after = (await scroller()).scrollLeft;
          const secs = (Date.now() - started) / 1000;
          report = ` scrolled ${Math.round(after - before)}px in ${secs.toFixed(1)}s (${Math.round((after - before) / secs)} px/s; scrollLeft ${Math.round(after)}/${Math.round(sc.max)})`;
          if (pos[1]) {
            // Now that the target is on screen, move onto it like a user would and drop there.
            await mustLocate(cdp, pos[1], toNth, 3000);
            t = await measure();
            await moveTo(...dropAt(t), 20);
            await sleep(Number(flags.settle || 1000));
            t = (await measure()) || t;
            await moveTo(...dropAt(t), 4);
            await sleep(300);
          } else {
            await sleep(Number(flags.settle || 1000));
            // Drop zones are re-measured on pointer movement. A real hand always jitters; without a
            // move after the scroll, the drop would use pre-scroll positions and pick the wrong lane.
            await moveTo(x - 1, y, 1);
            await sleep(300);
          }
        } else {
          t = (await measure()) || t; // neighbours shift once the source is lifted
          await moveTo(...dropAt(t), 20);
          await sleep(Number(flags.settle || 1000)); // the drop slot animates in; releasing early drops nothing
          t = (await measure()) || t;
          await moveTo(...dropAt(t), 4);
          await sleep(300);
        }
      } catch (e) {
        await mouse(cdp, 'mouseReleased', x, y, 'left', 1);
        throw e;
      }
      const where = edge ? `via the ${edge} edge${pos[1] ? ` ${flags.before ? 'before' : flags.after ? 'after' : 'onto'} ${pos[1]}` : ''}` : `${flags.before ? 'before' : flags.after ? 'after' : 'onto'} ${pos[1]}`;
      if (flags.hold) {
        console.log(`holding ${pos[0]} ${where}${report}; inspect with snap/outline, then run: kv.mjs release`);
        return cdp.close();
      }
      await mouse(cdp, 'mouseReleased', x, y, 'left', 1);
      await sleep(400);
      console.log(`dragged ${pos[0]} ${where}${report}`);
      return cdp.close();
    }
    case 'release': {
      const { cdp } = await attach();
      const p = await cdp.eval('({ x: window.__kvLastX ?? 0, y: window.__kvLastY ?? 0 })');
      await mouse(cdp, 'mouseReleased', p.x, p.y, 'left', 1);
      console.log('released mouse');
      return cdp.close();
    }
    case 'type': {
      const { cdp } = await attach();
      await cdp.send('Input.insertText', { text: pos[0] });
      return cdp.close();
    }
    case 'key': {
      const { cdp } = await attach();
      await pressKey(cdp, pos[0]);
      return cdp.close();
    }
    case 'wait': {
      const { cdp } = await attach();
      const timeout = Number(flags.timeout || 5000);
      const expr = `(${LOCATE_FN})(${JSON.stringify(pos[0])}, 0).count ${flags.gone ? '=== 0' : '> 0'}`;
      await waitFor(cdp, expr, timeout, `${pos[0]}${flags.gone ? ' to disappear' : ''}`).catch((e) => die(e.message));
      return cdp.close();
    }
    case 'count': {
      const { cdp } = await attach();
      console.log(await cdp.eval(`(${LOCATE_FN})(${JSON.stringify(pos[0])}, 0).count`));
      return cdp.close();
    }
    default:
      console.log(HELP);
      if (cmd && cmd !== 'help') process.exit(1);
  }
}

main().then(
  () => process.exit(0),
  (e) => die(e.message)
);
