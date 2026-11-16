# Card Markdown rendering

Cards render Markdown fragments, including code, blockquotes, callouts, task lists and embeds.
Embedded content follows saved changes to its source file without reopening the board (#867).

## Sub-features

- `render-self-embed` refreshes a heading embedded from the same board.
- `render-external-embed` refreshes an embedded note edited in another pane.
- `render-embed-formatting` preserves tag/date colors and search highlights after refreshing,
  applying them once per render.
- `render-board-switch` stops rendering a board's cards once its tab shows another board.
- `render-markdown` checks code blocks, callout folding and task-list layout.

## How to get to it (user POV)

Create a card containing `![[Board#List]]` or a note embed. Check a source task, or edit the
embedded note in another pane. Add Markdown through a lane's Add a card button; double-click a
card or choose Edit card from its menu to edit it.

## Driving it with kv.mjs

Preconditions:

- `$K launch --fixture card-rendering`, then `$K doctor` must pass.
- Board.md has a List lane containing Task and a Nested lane embedding that heading and Source.md.
  Second.md is another board that embeds Source.md.

- **Same-board embed.** Snap before. Click
  `.kanban-plugin__lane::List >> .kanban-plugin__item-prefix-button-wrapper input`.
  `$K file --expect '- [x] Task'` must pass. Without reopening, observe
  `document.querySelector('[src="Board#List"] input').checked` using eval: true. Click again,
  assert the file is unchecked, and the embedded input becomes false. Repeat twice and snap.
- **External note.** Right-click the Board tab and choose Split right, then open Source.md in
  that pane through the file explorer. Edit External task to Updated external task in the editor.
  `$K file Source.md --expect 'Updated external task'` must pass. The board embed updates in the
  other pane. Close the Source tab. Edit the note again through the embed's link or file explorer
  to ensure the refresh survives leaving and returning to the board.
- **Formatting.** On the self-embed card, inspect the `#render` anchor's `--tag-color` and the
  inline date's `--date-color` before and after checking Task. The tag remains red on yellow.
  The date remains green while November 17, 2026 is in the future. Search for `render` through
  the header button, change a source task in a split pane, and verify the highlight remains.
- **One pass per render.** With `render` in the search box, count inserted `<mark>` elements with
  a `MutationObserver` on the view's content (`eval`), then change the card's own text from
  outside (add the word `rerender` to the `#render` card in the vault's Board.md). The card ends
  with two marks and the observer saw three insertions: one for the embed's refresh with the old
  text, two for the new text. Before the fix it saw five, because every render was decorated
  through two channels.
- **Another board in the same tab** (`render-board-switch`). Read
  `app.metadataCache._.changed.length` and the view's renderer children
  (`view._children.filter((c) => c.markdown !== undefined).length`). Click Second.md in the
  file explorer, then Board.md, three times over. The numbers must come back to where they
  started each time (6 listeners and 11 renderers on Board.md, 5 and 3 on Second.md). Before
  the fix each round trip left 3 more listeners and 14 more renderers, all of them re-rendering
  cards of a board that was no longer shown whenever an embedded file changed.
- **Inline task.** Click `.kanban-plugin__item::Some text >> .kanban-plugin__item-markdown .task-list-item-checkbox`.
  Assert `- [x] item 1` on disk. Click again; the saved task is unchecked. Repeat after an embed
  refresh. Both task boxes stay fully inside the card at Appearance font sizes 16 and 26.
- **Callouts.** Click the collapsed callout's arrow to expand and collapse it; its contents appear
  and disappear. Blockquotes retain their border and callouts retain their icons.
- **Code.** Add a card containing a fenced Python block with two print statements on separate
  lines. Submit with Enter, close with Escape, inspect the saved indented lines, and verify both
  statements render inside one pre/code element. Edit through double-click and the card menu,
  then switch to Markdown and back; code still renders inside the block.
- **Basic regressions.** Run the add/edit journeys in cards.md and within-lane, cross-lane and
  empty-lane journeys in drag-and-drop.md on a fresh basic fixture.
- **Proof.** Snap before and after, check every mutation on disk, and finish with `$K errors`.

## Gotchas

- Source saves are debounced. Wait for the disk assertion before judging the embedded checkbox.
- A search collapses the lanes without a match, so List and its Task checkbox are gone while
  `render` is in the search box. Change the source from a split pane or from outside instead.
- The fixture's date rule colors dates after today. From November 17, 2026 on, the inline date
  has no color; set the page clock (date-clock.md) to check the color.
- The first task checkbox in a card is its completion checkbox. Target the item-markdown wrapper
  to click a task in the card's content.
- Typing `---` one character at a time reproduces #1069 in the bundled Obsidian editor. Its
  document-frontmatter input handler adds a closing delimiter. This journey does not claim that
  issue is fixed. `kv type '---'` is parsed as a CLI option; use three `kv type '-'` commands.
