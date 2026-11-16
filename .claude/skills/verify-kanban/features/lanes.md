# Lanes

Lanes are the board's columns, one `##` heading each in the file. Users add new lanes, collapse
them to a narrow strip with a vertical title, and manage them from the lane menu. Collapse state is
saved in the board's settings block. Reordering lanes by dragging is in
[drag-and-drop](./drag-and-drop.md) (`dnd-lane-reorder`).

## Sub-features

- `lane-add` adds a list from the board header.
- `lane-add-complete` honors the new-list completion toggle for both button and keyboard submission (#984).
- `lane-add-blank` ignores a whitespace-only list title (upstream PR #1226).
- `lane-collapse` collapses a lane and saves that state.
- `lane-reopen` adds and collapses lanes after the open board is re-opened, with or without saved collapse state.
- `lane-collapse-cjk` keeps CJK titles in collapsed lanes reading bottom to top with glyphs turned
  sideways like Latin text, never upside down (PR #1244).
- `lane-move-complete` applies completion when moving through the card menu as well as dragging (#1070).
- `lane-move-unsorts` treats a list as no longer sorted after a card is moved into it, by menu
  as by drag.
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
- **Completion toggle (#984).** On a fresh `basic` board, open `Add a list`, type
  `Completed button`, then click `.kanban-plugin__lane-form-wrapper .checkbox-container`.
  Capture `snap` with the toggle enabled. Click `.kanban-plugin__lane-action-add` and assert
  `$K file --expect $'## Completed button\n\n**Complete**'`. The form stays open and its toggle
  resets to off. Click `.kanban-plugin__lane-input .cm-content`, type `Ordinary reset`, and press
  Enter. Its saved heading must have no `**Complete**` marker. Without closing the form, type
  `Completed enter`, enable the toggle again, click the editor, and press Enter. Assert
  `$K file --expect $'## Completed enter\n\n**Complete**'`. Toggle on and back off before creating
  another list; it must have no completion marker. These submissions must reuse the same form
  so the journey catches callbacks retaining old toggle state.
  Close with `.kanban-plugin__lane-action-cancel`. Open the new completed list's menu and choose
  `Edit list`: `.kanban-plugin__lane-setting-wrapper .checkbox-container` has `is-enabled`.
  Press Enter to finish editing the title. Add a card to that list through `+ Add a card` and
  drag an unchecked card into it. Both must persist as `[x]` beneath its completion marker.
  Switch to markdown and back through `Kanban: Toggle between Kanban and markdown mode`;
  reopen `Edit list` and confirm the setting remains enabled. Capture the final board and run
  `$K errors`.
- **Move into a sorted list** (`lane-move-unsorts`). On `basic`, Todo's list menu → Sort by →
  Sort by card text: Buy milk, Plan sprint, Review PR, Write release notes. Move
  `Fix drag scroll` there with its card menu → Move to list → Todo; it lands on top. Sort by
  card text again: the list must come out ascending, with `Fix drag scroll` second. Before the
  fix it came out descending (Write, Review, Plan, Fix, Buy): the menu left the list marked as
  sorted, so the next sort reversed it, while a drag into the list cleared the mark. Repeat
  with a drag instead of the menu; the result is the same.
- **Move to a completed list (#1070).** On `basic`, open the Done lane menu, choose
  `Edit list`, enable `Mark cards in this list as complete`, focus the title editor,
  and press Enter. Assert `file --expect '**Complete**'`. Capture `snap` before moving.
  Drag `Plan sprint` into Done and assert `file --expect '- [x] Plan sprint'`. Open
  `Review PR`'s card menu, choose `Move to list`, wait for the submenu, and click `Done`.
  Assert `file --expect '- [x] Review PR'`. Move it back to Todo with the same menu;
  it must save as `[ ]`. Move it between Todo and Doing; its unchecked state must stay
  unchanged. Enable `Display card checkbox` in board settings, manually check it,
  then move between those ordinary lanes again; it must remain checked. Choosing the current list must leave the file unchanged.
  Add a card directly to Done and confirm it saves checked. Switch to markdown and
  back, then repeat the menu move into Done and capture the persisted result.
  Repeat using phone emulation with a phone-width window. Confirm the body has
  `is-phone`; at desktop width emulation instead uses tablet mode. In phone mode,
  destination lists appear directly in the card menu. Finish with `errors`.

- **Collapse.** `$K click '.kanban-plugin__lane::Blocked >> .kanban-plugin__lane-collapse'`.
  `$K count '.kanban-plugin__lane-wrapper.collapse-horizontal'` is `1`, and
  `$K file --expect '"list-collapse":[false,false,false,true]'` succeeds.
- **After re-opening the board.** Re-opening an open board through the quick switcher resets
  the view's own settings. On a fresh `basic` board, drag `Fix drag scroll` after `Ship 2.0.52`
  and back into `Doing`, then `$K key Mod+o`, `$K type 'Board'`, `$K key Enter`. Add a list with
  the completion toggle on and collapse `Doing`: both save, and `$K errors` is empty. Repeat on
  a board written without a settings footer (`---\nkanban-plugin: board\n---\n\n## A\n\n## B\n`):
  after re-open, collapsing `B` saves `"list-collapse":[…,true]` and adding a list saves. Before
  the fix, both threw `is not iterable` and replaced the board with the error view.
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
