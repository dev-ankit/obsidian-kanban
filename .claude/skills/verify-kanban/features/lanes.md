# Lanes

Lanes are the board's columns, one `##` heading each in the file. Users add new lanes, collapse
them to a narrow strip with a vertical title, and manage them from the lane menu. Collapse state is
saved in the board's settings block. Reordering lanes by dragging is in
[drag-and-drop](./drag-and-drop.md) (`dnd-lane-reorder`).

## Sub-features

- `lane-add` adds a list from the board header.
- `lane-add-blank` ignores a whitespace-only list title (upstream PR #1226).
- `lane-collapse` collapses a lane and saves that state.
- `lane-collapse-cjk` keeps CJK titles in collapsed lanes reading bottom to top with glyphs turned
  sideways like Latin text, never upside down (PR #1244).
- `lane-menu` opens the lane's `More options` menu. Not yet driven.

## How to get to it (user POV)

- The board header's `Add a list` button.
- The chevron at the left of each lane header collapses or expands it.
- The `⋯` button at the right of each lane header opens the lane menu.

## Driving it with kv.mjs

Preconditions:

- `lane-add`, `lane-collapse`: baseline `basic` board; `$K doctor` all PASS.
- `lane-collapse-cjk`: `$K launch --fixture wide` (has lanes `待办事项` and `進行中`).

- **Add.** `$K click '.workspace-leaf.mod-active .view-action[aria-label="Add a list"]'`. Focus lands
  in `.kanban-plugin__lane-input`. `$K type 'Blocked'`, `$K key Enter`, `$K key Escape`.
  `outline` ends with `## Blocked (0)`, and `$K file --expect '## Blocked'` succeeds.
- **Blank add.** Open the form again, `$K type '  '`, `$K key Enter`. No new lane appears in
  `outline`.
- **Collapse.** `$K click '.kanban-plugin__lane::Blocked >> .kanban-plugin__lane-collapse'`.
  `$K count '.kanban-plugin__lane-wrapper.collapse-horizontal'` is `1`, and
  `$K file --expect '"list-collapse":[false,false,false,true]'` succeeds.
- **CJK collapsed** (`wide`). `$K click '.kanban-plugin__lane::待办事项 >> .kanban-plugin__lane-collapse'`
  and the same for `進行中`. Then
  `$K snap cjk-todo --clip '.kanban-plugin__lane::待办事项 >> .kanban-plugin__lane-header-wrapper'`
  and `$K snap cjk-doing --clip '.kanban-plugin__lane::進行中 >> .kanban-plugin__lane-header-wrapper'`.
  Look at both PNGs: the title reads bottom to top and every glyph is turned 90° counter-clockwise,
  the same way Latin titles are. Upside-down glyphs fail. Supporting observation:
  `$K eval` of `getComputedStyle(header).textOrientation` on the collapsed header wrapper is `sideways`.
- **Proof.** `snap` before and after, then `$K errors`.

## Gotchas

- `.kanban-plugin__lane::<title>` matches on the whole lane's text, cards included. Pick lane titles
  that no card contains.
- The collapsed class is on `.kanban-plugin__lane-wrapper`, not `.kanban-plugin__lane`.
- `list-collapse` in the file is ordered by lane position; adding or moving lanes shifts it.
- The CJK check is visual; the computed style alone doesn't prove the glyphs look right. To prove a
  fix (not just the current state), run the same journey on a build without it (e.g. check out
  `2.0.51`, `yarn build`, `$K launch`) and keep both clips.
- Emoji in collapsed titles (also reported in #1098) isn't in the fixture yet.
