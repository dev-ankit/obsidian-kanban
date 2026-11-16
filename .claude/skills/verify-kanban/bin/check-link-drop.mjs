#!/usr/bin/env node
// Parsing-only check of the running plugin's drop handler. Never dispatches a synthetic drop
// into the drag sorter: CDP external drops do not reliably reach its hitboxes.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const bin = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(bin, '../../../..');
const run = process.env.KV_RUN || path.join(repo, '.verify-runs/latest');
execFileSync(process.execPath, [path.join(bin, 'kv.mjs'), 'doctor', '--run', run], {
  stdio: 'inherit',
});
const state = JSON.parse(fs.readFileSync(path.join(run, 'state.json')));
const pages = await (await fetch(`http://127.0.0.1:${state.port}/json/list`)).json();
const ws = new WebSocket(
  pages.find((p) => p.type === 'page' && p.url.startsWith('app://obsidian.md')).webSocketDebuggerUrl
);
const timeout = setTimeout(() => {
  console.error('Link-drop check timed out');
  process.exit(1);
}, 15000);
await new Promise((resolve) => (ws.onopen = resolve));
let seq = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
const send = async (method, params = {}) => {
  const id = ++seq;
  const p = new Promise((resolve) => pending.set(id, resolve));
  ws.send(JSON.stringify({ id, method, params }));
  const r = await p;
  if (r.error) throw Error(JSON.stringify(r.error));
  return r.result;
};
try {
  // Read the installed handler's closure through CDP to capture exactly what its parser
  // passes to dragEndHTML. No parser code or Obsidian link generator is copied or mocked.
  const fn = await send('Runtime.evaluate', {
    expression: 'document.querySelector(".kanban-plugin").l.dropfalse',
  });
  const props = await send('Runtime.getProperties', { objectId: fn.result.objectId });
  const scopes = await send('Runtime.getProperties', {
    objectId: props.internalProperties.find((p) => p.name === '[[Scopes]]').value.objectId,
    ownProperties: true,
  });
  let manager;
  for (const scope of scopes.result.filter((p) => /^\d+$/.test(p.name))) {
    const vars = await send('Runtime.getProperties', {
      objectId: scope.value.objectId,
      ownProperties: true,
    });
    for (const v of vars.result.filter((p) => p.value?.type === 'object' && p.value.objectId)) {
      const found = await send('Runtime.callFunctionOn', {
        objectId: v.value.objectId,
        functionDeclaration: 'function(){return !!(this?.dragManager?.dragEndHTML)}',
        returnByValue: true,
      });
      if (found.result.value) {
        manager = v.value.objectId;
        break;
      }
    }
    if (manager) break;
  }
  if (!manager) throw Error('drop handler DndManager not found');
  await send('Runtime.callFunctionOn', {
    objectId: manager,
    functionDeclaration: 'function(){window.__linkDropManager=this.dragManager;}',
    returnByValue: true,
  });
  const result = await send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async()=>{
    const dm=window.__linkDropManager;
    const original=dm.dragEndHTML;
    const originalDrag=app.dragManager.draggable;
    const originalLinks=app.vault.getConfig('useMarkdownLinks');
    const output=[];
    try {
      let parsed;
      dm.dragEndHTML=(event,view,content)=>{parsed=content;};
      for (const markdown of [false,true]) {
        app.vault.setConfig('useMarkdownLinks',markdown);
        for (const [name,html,file] of [
          ['empty','<a class="internal-link" data-href="Notes/Spec" href="Notes/Spec"></a>',true],
          ['missing','',true],
          ['alias','<a class="internal-link" data-href="Notes/Spec" href="Notes/Spec">Visible label</a>',true],
          ['unresolved','<a class="internal-link" href="Missing note"></a>',false]
        ]) {
          const path=file?'Notes/Spec':'Missing note';
          app.dragManager.draggable={type:'link',file:file?app.vault.getAbstractFileByPath('Notes/Spec.md'):null,linktext:path};
          const transfer=new DataTransfer();
          transfer.setData('text/plain',path);
          if(html)transfer.setData('text/html',html);
          const event=new DragEvent('drop',{view:window,dataTransfer:transfer,bubbles:true,cancelable:true});
          await document.querySelector('.kanban-plugin').l.dropfalse(event);
          output.push({markdown,name,html,parsed});
        }
      }
      return output;
    } finally {
      dm.dragEndHTML=original;
      app.dragManager.draggable=originalDrag;
      app.vault.setConfig('useMarkdownLinks',originalLinks);
      delete window.__linkDropManager;
    }
  })()`,
  });
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  const cases = result.result.value;
  const evidence = path.join(run, 'evidence', 'link-drop-parsing.json');
  fs.writeFileSync(evidence, JSON.stringify(cases, null, 2) + '\n');
  console.log(evidence);
  if (!process.argv.includes('--report-only')) {
    for (const test of cases) {
      const expected =
        test.name === 'unresolved'
          ? '[[Missing note]]'
          : test.name === 'alias'
            ? test.markdown
              ? '[Visible label](Spec.md)'
              : '[[Spec|Visible label]]'
            : test.markdown
              ? '[Spec](Spec.md)'
              : '[[Spec]]';
      assert.deepEqual(
        test.parsed,
        [expected],
        `${test.markdown ? 'Markdown' : 'wikilink'} ${test.name}`
      );
    }
    console.log(
      'PASS: empty HTML, absent HTML, visible alias, and unresolved link in both link formats'
    );
  }
} finally {
  ws.close();
  clearTimeout(timeout);
}
