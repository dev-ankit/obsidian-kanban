# Drag and drop

Users reorder cards by dragging them within a lane and move cards between lanes, including into an
empty lane or one that's off screen. Holding a dragged card at the board's edge scrolls the board.
Lanes can be dragged by their grip. The board file is rewritten in the new order.

## Sub-features

- `dnd-remount` keeps dragging functional across repeated board/markdown view changes.
- `dnd-new-board` initializes dragging on a board created through the command palette, before reopening it (#902).
- `dnd-within-before` moves a card above another card in the same lane.
- `dnd-within-after` moves a card below another card in the same lane.
- `dnd-cross-lane` moves a card next to a card in another lane.
- `dnd-empty-lane` drops a card into a lane with no cards.
- `dnd-autoscroll` scrolls a wide board while a card is held at its edge (upstream PR #1179 changed
  the speed), then drops it in a lane that was off screen.
- `dnd-lane-reorder` moves a whole lane left or right by its grip.
- `dnd-scroll-isolation` scrolls only the board or lane whose edge is active, including when
  moving a card between two boards in a split (#1051).

## How to get to it (user POV)

- Create a board with `Kanban: Create new board`, then add lists and cards before dragging.
- Press on a card and drag it with the mouse; release over the target slot.
- Hold the dragged card near the left or right edge of the board to scroll it.
- Drag a lane by the `⠿` grip at the left of its header.
- `Move to list` in the card's `More options` menu is the non-drag alternative for cross-lane moves.

## Driving it with kv.mjs

Preconditions:

- `dnd-within-*`, `dnd-cross-lane`, `dnd-empty-lane`: baseline `basic` board, nothing open in a
  split; `$K doctor` all PASS.
- `dnd-autoscroll`, `dnd-lane-reorder`: `$K launch --fixture wide` (8 lanes: Backlog, 待办事项,
  Ready, 進行中, Review, QA, Staging, Shipped; wider than the window).

- **New board, without reopening** (`dnd-new-board`). `$K key Mod+p`,
  `$K type 'Kanban: Create new board'`, `$K key Enter`, then
  `$K wait '.kanban-plugin__lane-action-add'`. The new board opens its list form automatically.
  `$K type 'Fresh todo'`, `$K key Enter`, then `$K file 'Untitled Kanban.md' --expect '## Fresh todo'`.
  Add another list with `$K type 'Fresh done'`, `$K key Enter`, then
  `$K file 'Untitled Kanban.md' --expect '## Fresh done'`. Close the form with
  `$K click '.kanban-plugin__lane-action-cancel'`.
  Add `First fresh card` and `Second fresh card` to Fresh todo through its `+ Add a card` button,
  typing each title and pressing Enter. Press Escape, then assert both titles in `Untitled Kanban.md`.
  `$K snap new-board-before-drag`. Without reopening, changing view modes, or reloading,
  `$K drag '.kanban-plugin__item::First fresh card' '.kanban-plugin__lane::Fresh done'`.
  `$K file 'Untitled Kanban.md' --expect $'## Fresh done\n\n- [ ] First fresh card'` must pass.
  `$K snap new-board-after-drag`. Drag it back before `Second fresh card`, then drag it after
  that card. Check the new adjacent card order on disk after each move. Drag the Fresh done
  lane grip before Fresh todo, with `--axis x --before`, and check the saved heading order.
  Use the actual new filename if Obsidian appends a number. `file` defaults to `Board.md`,
  so always pass the new board's filename explicitly.
- **Destroy and remount.** On `basic`, switch to markdown with the header button and back
  with `Kanban: Toggle between` three times. Each time drag `Fix drag scroll` into Done and back
  into Doing; assert the saved lane after each drop. Create a fresh board and run `dnd-new-board`
  too. Finish with `errors`. This covers repeated manager setup and cleanup after
  `EntityManager.destroy()` was corrected to clear its mounted state.
- **Within, after.** `$K drag '.kanban-plugin__item::Buy milk' '.kanban-plugin__lane::Todo >> .kanban-plugin__item::Review PR' --after`.
  `outline` shows Todo as Write release notes, Plan sprint, Review PR, Buy milk; on disk,
  `$K file --expect $'[[Notes/Spec]]\n- [ ] Buy milk'` succeeds.
- **Within, before.** `$K drag '.kanban-plugin__item::Buy milk' '.kanban-plugin__lane::Todo >> .kanban-plugin__item::Review PR' --before`.
  `$K file --expect $'- [ ] Buy milk @{2026-01-15} today\n- [ ] Review PR'` succeeds.
- **Cross-lane.** `$K drag '.kanban-plugin__item::Fix drag scroll' '.kanban-plugin__lane::Done >> .kanban-plugin__item::Ship 2.0.52' --after`.
  Doing shows `(0)`; `$K file --expect $'- [x] Ship 2.0.52\n- [ ] Fix drag scroll'` succeeds.
- **Empty lane.** `$K drag '.kanban-plugin__item::Fix drag scroll' '.kanban-plugin__lane::Doing'`.
  `$K file --expect $'## Doing\n\n- [ ] Fix drag scroll'` succeeds.
- **Autoscroll to an off-screen lane** (`wide`).
  `$K drag '.kanban-plugin__item::Bravo task' '.kanban-plugin__lane::Shipped >> .kanban-plugin__item::Hotel task' --edge right --after`.
  The command prints how far and how fast the board scrolled (e.g. `scrolled 953px in 2.0s (476 px/s;
scrollLeft 1237/1237)`), then drops the card. `outline` shows Shipped with Hotel task, Bravo task;
  `$K file --expect $'- [ ] Hotel task\n- [ ] Bravo task'` succeeds.
- **Autoscroll, look mid-scroll.** `$K drag '.kanban-plugin__item::Alpha task' --edge right --hold`,
  `$K snap autoscroll-held`, `$K release`. The snap shows the board scrolled to the last lanes with
  the card under the pointer.
- **Lane reorder** (`wide`, scrolled so Shipped and QA are both on screen, e.g. after the autoscroll
  step). `$K drag '.kanban-plugin__lane::Shipped >> .kanban-plugin__lane-grip' '.kanban-plugin__lane::QA' --axis x --before`.
  `outline` lane order ends with Review, Shipped, QA, Staging. On disk the Shipped heading now comes
  before QA: `$K file --expect $'- [ ] Hotel task\n- [ ] Bravo task\n\n\n## QA'` (adjust the card lines
  to what Shipped holds).
- **Proof.** `snap` before and after each step, then `$K errors`.

- **Separate boards and lanes** (`dnd-scroll-isolation`). Launch `--fixture split-scroll`,
  right-click `.workspace-tab-header::Board`, click `.menu-item::Split right`, then click
  `.nav-file-title[data-path="Other.md"]`. The two boards each have eight long lanes.
  Capture a snap and the scroll offsets with
  `$K eval '[...document.querySelectorAll(".kanban-plugin__board")].map(b => ({x:b.scrollLeft, lanes:[...b.querySelectorAll(".kanban-plugin__lane-items")].map(l => l.scrollTop)}))'`.
  Drag `Left 1 card 01` toward the left board's right edge and hold there with
  `$K drag '.kanban-plugin__item::Left 1 card 01' --edge right --dwell 800 --hold`.
  Capture offsets again and a snap before `release`: the left board must scroll and the right
  board must stay at zero. Repeat from the right board, verifying the left board stays put.
  After scrolling the right board, hold its card just inside that board's left edge at the split.
  Only the right board may scroll back: the card overlapping the left board must not activate it.
  In a fresh run with the same split, drag `Left 1 card 01` after `Right 1 card 02`.
  Assert the adjacent cards in `Other.md` and the source card's absence from `Board.md`.
  Also hold a card at the bottom edge of its lane using real pointer input. Record every lane's
  `scrollTop` before and during the hold: only that lane may scroll, including lanes outside
  the viewport. Move away from the edge while still holding, then release; scrolling must stop.
  Finish with `errors`. Before the fix, one edge event scrolled every eligible container in
  the same window because EventEmitter's listener context was mistaken for an event filter.
  Scroll hit testing also considered neighboring containers overlapped by the card, regardless
  of which container held the pointer.

## Gotchas

- Release too early and nothing drops: the slot animates in. `drag` waits 1000 ms over the target
  (`--settle`); don't lower it.
- `--before`/`--after` put the dragged entity's center 10 px past the target's edge. `drag` corrects
  for where you grabbed (a lane is grabbed by its grip, far from its center). For lanes add
  `--axis x` so before and after mean left and right.
- Drop zones are re-measured only on pointer movement. After an autoscroll, a release with no
  movement in between drops into whatever lane was under the pointer _before_ the scroll.
  Real hands always jitter, so this isn't a user bug; `drag --edge` moves 1 px before releasing.
  A bare `release` after `--edge --hold` doesn't. Move first if you need a correct drop there.
- Autoscroll speed is time-based since c67f797: the `--edge` report should read about 600 px/s
  whenever the dragged card's edge is past the zone (any normal card at the board edge), on any
  refresh rate. Much faster means stacked scroll loops or unclamped strength have come back
  (2.0.51 measured ~10,200 px/s, 2.0.52 ~4,400 px/s). To see per-frame steps, wrap the board
  scroller's `scrollBy` via `eval` and count calls (one loop = one call per frame).
- `file --expect` with text that's already in the file passes instantly. For reorders, expect a
  string that spans the new boundary (end of one section plus the next heading).
- Source and target must both be on screen unless you use `--edge`. Close any note split first;
  lanes outside the viewport don't render their cards.
- Text matching is substring-based: `::Ship` would also match "Shipped". Use full, distinct titles.
