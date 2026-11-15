# View modes

A board can be shown as a board, a table or a list, and users can flip the file between the Kanban
view and Obsidian's markdown editor and back. The board/table/list choice is saved in the
frontmatter (`kanban-plugin: board|table|list`).

## Sub-features

- `view-table` switches to the table layout and saves it.
- `view-list` switches to the list layout. Not yet driven.
- `view-board` switches back to the board layout.
- `view-markdown` opens the board as markdown.
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
- **Proof.** `snap` after each switch, then `$K errors`.

## Gotchas

- Switching views rewrites the frontmatter without the blank lines the fixture had, so the
  file changes on disk even though no card changed. Don't treat that as an unexpected mutation.
- The markdown view has no button back to Kanban; use the palette command.
- `#662` is intermittent upstream. One clean pass is weak evidence; repeat the markdown → Kanban
  round-trip a few times before calling it fixed.
