# Daily-note links

Markdown date links preserve folder separators and escape each path segment, so nested daily-note
folders with spaces produce usable Markdown destinations (#516).

## Sub-features

- `daily-link-create` creates missing daily notes with the configured folder, filename and template (#1066).
- `daily-link-menu` inserts a Markdown link through Add date.
- `daily-link-editor` inserts the same path through the editor's `@` picker.
- `daily-link-date-folders` keeps the separators of a date format that has folders in it
  (`YYYY/MM/DD`).

## How to get to it (user POV)

Disable Obsidian's "Use [[Wikilinks]]", configure a nested daily-note folder, and enable Kanban's
"Link dates to daily notes". Use the card menu or type `@` while adding a card.

## Driving it with kv.mjs

Preconditions:

- `$K launch --fixture date-regressions`; `$K doctor` all PASS.
- `Board.md` enables linked dates. The fixture configures Markdown links and the daily-note folder
  `Personal/Periodic Notes/Daily` and contains an existing note for January 15, 2026.

- **Menu insertion.** Snap before. Open `Link target`'s More options, choose Add date, and select
  January 15, 2026. Use the calendar month controls to reach January.
  `$K file --expect '@[2026-01-15](Personal/Periodic%20Notes/Daily/2026-01-15.md)' --absent '%2F'`.
  Snap after. The original build writes `Personal%2FPeriodic%20Notes%2FDaily/`.
- **Existing note.** Click the date's internal link. Inspect `app.workspace.getActiveFile()?.path`:
  it must be `Personal/Periodic Notes/Daily/2026-01-15.md`. Snap the opened note.
- **Editor insertion.** Return to Board.md, add a card, type `Editor date @`, select a date with
  the arrow keys, and press Enter to choose it, then Enter to save the card. Check its Markdown
  destination has `/` between folders and `%20` for the space. Escape closes the add form.
- **Folders in the date format** (`daily-link-date-folders`). Open Board-nested-format.md (date
  format `YYYY/MM/DD`). Add January 15, 2026 to `Nested target` through More options → Add date.
  `$K file Board-nested-format.md --expect '@[2026/01/15](Personal/Periodic%20Notes/Daily/2026/01/15.md)' --absent '%2F'`.
  Click the date's link: `app.workspace.getActiveFile()?.path` is
  `Personal/Periodic Notes/Daily/2026/01/15.md`, the fixture's existing note. Before the fix the
  link ended in `2026%2F01%2F15.md`.
- **Proof.** Finish with `$K errors`.

- **Missing daily notes** (`daily-link-create`). Launch `--fixture batch3-dates-links`.
  Click Linked.md's November 16 date, Markdown.md's November 18 date, and Linked-footer.md's
  November 17 date. Each opens `Daily/YYYY-MM-DD.md` containing the rendered daily template
  exactly once. Reopen each link and confirm it opens the same file without appending content.
  Change Daily Notes' date format in settings to `YYYY/[day-]MM-DD`, then click an unresolved
  date. The file must be `Daily/2026/day-MM-DD.md` even though the board uses `YYYY-MM-DD`.
  Reopen the link to check that the custom filename is reused. Existing Markdown destinations
  must still open the explicitly linked note, including encoded spaces and nested date folders.
  Capture the note path, content and `snap`; finish with clean `errors`.

## Gotchas

- Linked dates navigate; they do not open the inline date picker.
- Markdown dates do not populate the card's date metadata, so its menu still offers Add date.
  That parsing limitation is separate from daily-note navigation.
