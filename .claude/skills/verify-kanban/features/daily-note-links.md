# Daily-note links

Markdown date links preserve folder separators and escape each path segment, so nested daily-note
folders with spaces produce usable Markdown destinations (#516).

## Sub-features

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

## Gotchas

- Linked dates navigate; they do not open the inline date picker.
- Kanban currently renders linked dates by resolving their label. A missing note can therefore
  be created at the vault root even with a correct saved destination. Markdown dates also do not
  populate the card's date metadata, so its menu still offers Add date. That separate behavior is
  outside #516's path-encoding fix; use the existing fixture note for navigation verification.
