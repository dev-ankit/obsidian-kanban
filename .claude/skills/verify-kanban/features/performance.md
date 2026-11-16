# Large-board performance

Typing beside a board should not reparse its unchanged Markdown when the note saves. Linked
metadata must still update, and embed behavior must match the original build. Sidebar file drags need a separate measurement because
browser rendering can cost more than JavaScript hit testing.

## Sub-features

- `perf-typing` measures real keys in a note created from a card beside a 600-card board (#670, #779).
- `perf-sidebar-drag` measures a real file-explorer drag across that board (#1201).
- `metadata-refresh` preserves wikilink, Markdown-link, embed, mixed-link and archive metadata.
- `metadata-settle` leaves the board alone when a vault change doesn't concern its cards, also
  after a linked note lost one of several shown properties.
- `metadata-matches-parse` keeps the refreshed board equal to a from-scratch parse of the file.
- `metadata-error-recovery` clears a board error caused by a linked note once that note is fixed.

## How to get to it (user POV)

- Card menu → New note from card, then type in the note opened to the right.
- Drag Reference.md from the Files sidebar across the board.
- Edit a linked note's properties or content while its board remains visible.

## Driving it with kv.mjs

Preconditions:

- Launch `--fixture performance`; doctor passes. This fixture has ten lanes of sixty cards.
- Run the same journeys on the original and changed builds. Keep CPU rate, viewport and fixture
  identical; distinguish native-speed results from artificial CPU throttling.

1. Open Typing note's card menu and choose New note from card. Confirm the board saves
   `[[Typing note]]`, and focus the note's `.cm-content` editor.
2. Run `node .claude/skills/verify-kanban/bin/measure-performance.mjs typing typing-native`.
   It sends 216 trusted key events, observes key-to-animation-frame latency and long tasks, and
   saves a CPU profile, JSON, before/after screenshots and the note's disk contents in evidence/.
   Confirm all 216 input events occurred and the four sentences reached disk.
3. Select all in the note and press Backspace. Repeat with `typing typing-4x 4` to expose brief
   save-time stalls on a fast machine. Record long-task count/total/max and key median/p95/max.
   On the fixed build, metadata notifications should no longer call `mdToBoard` in the profile.
4. For a control, click the board's Open as markdown button, refocus the right note editor,
   clear it through keys, and repeat at both CPU rates. This distinguishes board cost from
   normal editor cost. Key-to-frame is a scheduling proxy, not physical display latency.
5. Restore the board with the toggle command, close the note split using its tab close button,
   and run `node .claude/skills/verify-kanban/bin/measure-performance.mjs drag sidebar-native`.
   The helper drags Reference.md over the board with trusted mouse events, then releases over
   its source so it creates no card. Check trusted dragstart/dragover/dragend counts and compare
   Board.md before/after. Repeat with `drag sidebar-4x 4` if needed.
6. If the CPU profile attributes drag time to `(program)`, repeat with `TRACE=1` to save a
   DevTools timeline trace. Inspect UpdateLayoutTree, Layerize and Paint before blaming
   `calculateDragIntersect`. Trace overhead makes this a diagnostic run, not the timing baseline.
7. Launch `--fixture performance-metadata`. Split right through the command palette, then open
   Details.md in the right pane. Toggle Source mode and replace it through the editor with
   `---\nstatus: updatedstatus\n---\n\nUpdated embedded content.\n` using actual newlines.
   After the save, Wiki, Markdown and Mixed must show updatedstatus. Self must retain boardstatus
   from its empty-path heading link. Mixed must retain Other's embedded body while taking metadata
   from Details. Compare Embedded's body against the original build; record stale rendering separately. Inspect
   archived card metadata read-only too; the board file itself must remain unchanged.
8. Change Details' status again while board search is open. Search for the current status and
   confirm Wiki, Markdown and Mixed match; the obsolete value must not match. Remove the
   status property and confirm the metadata disappears. Create Missing.md from its card link
   menu. This replaces the board pane: reopen the board, then open Missing.md in the right pane
   and give it a status. Missing must gain that metadata without another board reload.
9. Edit, add and drag a card. Check disk after each action. Switch the board to Markdown and
   back, then repeat a note-property edit. This checks metadata dependencies after reparsing.
   Run the basic card-add and drag journeys as well. Finish every run with errors and stop.

10. `--fixture performance-metadata --open Keys.md` shows `status`, `owner` and `project.status`
    from linked notes. Linked notes are edited from outside here (write the file in the run's
    vault, as sync or another editor would), then wait 2.5 s for the debounced refresh. Observe
    with `$K eval`: the cards' text, `stateManager.state.data.errors`, and whether
    `stateManager.state` is still the object seen at the previous check.
    - Append a line to Unrelated.md twice: the state object stays the same.
    - Rewrite Pair.md without `owner`: both Pair cards lose Owner and keep Status. Append to
      Unrelated.md three more times: the state object stays the same each time. Before the fix
      it was replaced on every vault change from then on.
    - Change only the case of a value (`open` → `OPEN`): the cards follow.
    - Set Nested.md's frontmatter to `project: null`: the Nested card loses Project and the board
      does not error. Restore `project:\n  status: active`: Project returns. Before the fix the
      board showed `Cannot use 'in' operator…` and stayed that way.
    - Give Pair.md `status:\n  - ` (a list with an empty item): the board shows an error (a
      separate, still open defect). Fix the note: the board comes back by itself, with the new
      values.
    - After each step compare the board with a from-scratch parse of the same file: in one
      `eval`, keep `stateManager.state`, set it to `null`, call
      `stateManager.getParsedBoard(view.data)`, and put the state back. For every card in the
      lanes and the archive, `titleSearch`, `metadata.file`, `fileMetadata` and
      `fileMetadataOrder` must be equal (an unresolved link has `file` undefined; archived cards
      have no `file` and an unhydrated `titleSearch`). Repeat on Board.md after rewriting
      Details.md and after creating Missing.md. The board files' bytes must not change.

## Gotchas

- Deleting a linked note sends no metadata notification, so its cards keep their metadata until
  the next change elsewhere in the vault. Existing behavior; don't assert on it.
- Keep the measurement window focused on the intended editor. Each helper run calls doctor and
  rejects typing if `.cm-content` is not focused. `KV_RUN` chooses an explicit scratch instance.
- The helper uses Profiler.start/stop and a long-task PerformanceObserver. A 50 ms sleep follows
  each key pair; CDP round trips add to that interval. It tests paced typing, not a queued burst.
- Native drag events can spend their time in Chromium style/compositing work. Report a failure
  to reproduce sustained severe lag instead of treating any nonzero task as proof of #1201.
- The fixture has no Dataview plugin. Verify Dataview-derived metadata separately when changing
  that integration; keep an untested integration explicit in the report.

- Obsidian 1.10.6 with Kanban 2.0.56 kept embedded note bodies stale after a linked note edit
  on both original and changed builds. Metadata updates passed; live embed-body refresh is a
  separate existing limitation. Native text inputs need Home then Shift+End to replace text;
  Mod+a works in CodeMirror but may be intercepted by the app in search inputs.
