# Daily-note links

Markdown date links preserve folder separators and escape each path segment, so nested daily-note
folders with spaces produce usable Markdown destinations (#516).

## Sub-features

- `daily-link-menu` inserts a Markdown link through Add date.
- `daily-link-editor` inserts the same path through the editor's `@` picker.

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
- **Proof.** Finish with `$K errors`.

## Gotchas

- Linked dates navigate; they do not open the inline date picker.
- Kanban currently renders linked dates by resolving their label. A missing note can therefore
  be created at the vault root even with a correct saved destination. Markdown dates also do not
  populate the card's date metadata, so its menu still offers Add date. That separate behavior is
  outside #516's path-encoding fix; use the existing fixture note for navigation verification.
