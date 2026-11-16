# View modes

A board can be shown as a board, a table or a list, and users can flip the file between the Kanban
view and Obsidian's markdown editor and back. The board/table/list choice is saved in the
frontmatter (`kanban-plugin: board|table|list`).

## Sub-features

- `view-rename-deferred` renames a board while another restored Kanban tab is still deferred (#1096).
- `view-title-bar` follows Obsidian's Show tab title bar preference (#680).
- `view-table` switches to the table layout and saves it.
- `view-list` switches to the list layout. Not yet driven.
- `view-board` switches back to the board layout.
- `view-markdown` opens the board as markdown.
- `view-mode-memory` returns a note to the mode (editing or reading) it had before it was shown as a
  board; a board opened in a pane that showed another note uses Obsidian's default.
- `view-reopen-same-file` keeps the board when the open board is opened again (quick switcher, a
  card's link to its own board).
- `view-kanban-again` returns from markdown to Kanban. This is where upstream reports of a black or
  blank board live (#662, PR #1221).

## How to get to it (user POV)

- The board header's `Board view` button → `View as board` / `View as table` / `View as list`.
- The board header's `Open as markdown` button.
- From markdown back to Kanban: palette command `Kanban: Toggle between Kanban and markdown mode`.

## Driving it with kv.mjs

Preconditions:

- Baseline board showing; `$K doctor` all PASS.

- **Table.** `$K click '.workspace-leaf.mod-active .view-action[aria-label="Board view"]'`, then
  `$K click '.menu .menu-item::View as table'`. `$K count '.kanban-plugin__table-wrapper'` is `1`,
  and `$K file --expect 'kanban-plugin: table'` succeeds.
- **Board.** Same button, `.menu .menu-item::View as board`; `$K wait '.kanban-plugin__lane'`;
  `$K file --expect 'kanban-plugin: board'`.
- **Markdown.** `$K click '.workspace-leaf.mod-active .view-action[aria-label="Open as markdown"]'`.
  `$K eval 'app.workspace.activeLeaf.view.getViewType()'` is `markdown`.
- **Back to Kanban.** `$K key Mod+p`, `$K type 'Kanban: Toggle between'`, `$K key Enter`.
  The view type is `kanban` again and `outline` lists every lane with its cards (a blank board here
  is the #662 bug).
- **Reading mode survives a round trip.** In markdown view run
  `$K eval '(() => { app.commands.executeCommandById("markdown:toggle-preview"); return 1 })()'`, toggle to
  Kanban and back with the palette command; `$K eval 'app.workspace.activeLeaf.view.getMode()'` is `preview`
  (2.0.54 and earlier: `source`). Same through the pane menu's `Open as kanban board` and the header's
  `Open as markdown`.
- **Re-open the open board.** `$K key Mod+o`, `$K type 'Board'`, `$K key Enter`: the board still has its
  lanes (2.0.54 and earlier: blank, 0 lanes). Same for a card whose text links `[[Board]]` when you click
  that link, and for `$K eval '(async () => { await app.workspace.openLinkText("Board", "", false) })()'`.
- **Proof.** `snap` after each switch, then `$K errors`.

- **Rename with a deferred tab.** Launch `--fixture settings-windows`. The first tab opens
  `Board.md`; the second Kanban tab has not been selected. Observe
  `app.workspace.getLeavesOfType("kanban").map(l => ({ deferred: l.isDeferred, rename: typeof l.view.handleRename }))`:
  one view has no rename method. Right-click `.mod-root .workspace-tab-header::Board`, choose
  `.menu-item::Rename...`, type `Renamed`, and press Enter. Assert `Renamed.md` contains all
  cards, `Board.md` no longer exists, and `errors` is clean. Click the second tab with
  `click '.mod-root .workspace-tab-header' --nth 1`; `outline` must show `Other.md` with all
  six cards. Capture both states. Before the fix the rename raised `handleRename is not a function`.

- **Tab title bar.** In Settings → Appearance disable Show tab title bar, close settings, and
  verify the active board's `.view-header` has computed `display: none`. Its lanes stay visible.
  Repeat with a markdown note. Re-enable the preference and verify the board header and actions
  return. Before the fix Kanban forced `display: flex !important` regardless of this preference.

## Gotchas

- Switching views rewrites the frontmatter without the blank lines the fixture had, so the
  file changes on disk even though no card changed. Don't treat that as an unexpected mutation.
- The markdown view has no button back to Kanban; use the palette command.
- `#662` is intermittent upstream. One clean pass is weak evidence; repeat the markdown → Kanban
  round-trip a few times before calling it fixed.
