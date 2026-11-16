# Board integrity

Every edit rewrites the whole board file from board state. When a file contains blocks the board
doesn't represent, Kanban shows an explanation, the first offending lines, and an
`Open as markdown` button instead of the board, and never saves over the file. Once those lines
are fixed, the board opens again. Kanban's own output always opens as a board.

## Sub-features

- `integrity-block` shows the error view for unrepresented blocks: flattened lane titles, a note
  under a lane heading, a second list under one lane, `[Complete](url)`, a footer that isn't at the
  end, a plain trailing JSON code block.
- `integrity-unchanged` leaves those files byte-for-byte unchanged.
- `integrity-button` opens the file as markdown from the error view.
- `integrity-recover` turns the error view back into a board when the file is fixed from outside
  (split pane, sync), including when a board setting changes in the same write.
- `integrity-roundtrip` reopens Kanban's own saved output (lanes, `**Complete**`, archive, settings)
  as a board.
- `integrity-locale` opens boards saved under another language (`**Fertiggestellt**`, `## Archiv`);
  editing rewrites the markers in the current language.

## How to get to it (user POV)

- Open any board file from the file explorer. The check runs whenever the file is read.

## Driving it with kv.mjs

Preconditions:

- `$K launch --fixture unmodeled`. Files: `Board.md` (healthy, with Complete marker and archive),
  `Flat.md`, `NoteUnderHeading.md`, `TwoLists.md`, `AfterFooter.md`, `CompleteLink.md`,
  `TrailingJson.md` (each should be blocked), `German.md`, `Settings.md` (should open).
- `FX=.claude/skills/verify-kanban/fixtures/unmodeled`, `V=$(readlink .verify-runs/latest)/vault`.

- **Blocked cases.** For each blocked file, `$K click '.nav-file-title[data-path="<file>"]'`. The pane
  shows `.kanban-plugin__board-error` with the explanation, `line N: …` entries naming the offending
  lines (e.g. Flat.md lists `line 5: inbox`), and a button. `cmp "$FX/<file>" "$V/<file>"` reports no
  difference.
- **Button.** In a blocked file, `$K click '.kanban-plugin__board-error button'`. The pane's view type
  becomes `markdown`. Switch back with the palette: `$K key Mod+p`, `$K type 'Kanban: Toggle between'`,
  `$K key Enter`.
- **Recover from outside.** With `TwoLists.md` blocked, rewrite `* Star card` as `- [ ] Star card` in
  `$V/TwoLists.md` with a shell or Python edit. Within ~2 s the pane shows the board with lane `Todo`.
- **Setting change in the same write.** Open `Settings.md` (board). In one outside write, add a
  paragraph under `## Todo` and change `date-format`: the pane switches to the error view. Remove the
  paragraph (changing the setting back in the same write): the board returns, and adding a card saves.
- **Round trip.** Open `Board.md`, add a card, wait for `$K file Board.md --expect '<card>'`, copy
  `$V/Board.md` to `$V/Roundtrip.md`, open it: it's a board with lanes `Todo, Done`.
- **Locale.** Open `German.md`: a board with lane `Erledigt` and one archived card. Add a card; the saved
  file now says `**Complete**` and `## Archive`, and a copy of it still opens as a board.
- **Proof.** `snap` the error view (`--clip '.workspace-leaf.mod-active .view-content'`), plus the
  `cmp` results.

## Gotchas

- `$K errors` shows the logged parse error for each blocked file. That's the error being reported,
  not a crash.
- `AfterFooter.md` lists the footer's own lines (`%% kanban:settings`, the fence, `%%`), because a footer
  that isn't at the end is what would be lost; the heading after it is read as a lane.
- Clicking an already-open file in the explorer makes the sidebar the active pane, so selectors
  scoped to `.workspace-leaf.mod-active` find nothing. Use `.mod-root` for the main area.
- Not covered by design: YAML comments and block IDs on lane headings are still dropped on save, and
  an outside write landing in the same few milliseconds as a local edit can still race.
