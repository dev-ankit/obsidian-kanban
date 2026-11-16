# Daily-note links

Markdown date links preserve folder separators and escape each path segment, so nested daily-note
folders with spaces produce usable Markdown destinations (#516).

## Sub-features

- `daily-link-create` creates a missing daily note with Daily Notes' folder, filename and
  template when the date's link names that note, once even on a double-click (#1066).
- `daily-link-ordinary` treats every other date link as the ordinary link it is: an explicit
  destination elsewhere, in angle brackets or with parentheses, any link while Daily Notes is
  off, and a board date format that differs from Daily Notes'.
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
  Existing-nested.md holds that link ready-made (`Nested existing`) next to one for a missing
  note (`Nested missing`), which opens a new `Personal/Periodic Notes/Daily/2026/01/16.md`: the
  path the link names.
- **Proof.** Finish with `$K errors`.

- **Missing daily notes** (`daily-link-create`). Launch `--fixture batch3-dates-links`.
  Click Linked.md's November 16 date, Markdown.md's November 18 date, and Linked-footer.md's
  November 17 date (in the card footer). Each opens `Daily/YYYY-MM-DD.md` containing the rendered
  daily template exactly once, and back on the board the date's link no longer has the class
  `is-unresolved`. Reopen each link and confirm it opens the same file without appending
  content. In Destinations.md, `Daily missing` (a Markdown link to `Daily/2026-11-25.md`),
  `Wiki missing`, `leading wiki` and `Alias wiki` do the same. Double-click the lone
  November 29 date (`$K click 'a.internal-link[data-href="Daily/2026-11-29.md"]' --double`):
  the note opens, holds the template once, and no notice appears. Before the fix the second
  click raced the first and showed "Unable to create new file."
- **Ordinary links** (`daily-link-ordinary`, Destinations.md). Click each date and read
  `app.workspace.getActiveFile()?.path`, then `$K ls`:
  `Explicit missing` opens a new `Journal/2026-11-20.md` (the link's own path, no template) and
  its link resolves afterwards; `Angle existing`, `Encoded existing` and `Parens existing` open
  the existing notes in `Other Notes/`; `Wiki existing` opens `R&amp;D/2026-11-27.md`. None of
  them adds a file under `Daily/`. Before the fix every one except `Encoded existing` created
  a `Daily/` note: the destination was cut at the first `)`, kept its angle brackets, or was
  written into HTML unescaped, and any unresolved date link was taken for a daily note.
  `Parens existing` → More options → New note from card creates `Parens existing.md` (it was
  `Parens existing .md).md`).
- **Daily Notes off.** Launch `--fixture daily-notes-off` (the core plugin is disabled, its
  settings file is still there). `Wiki missing` opens a new `2026-11-26.md` in the vault's
  default location and `Daily missing` a new, empty `Daily/2026-11-25.md`: what Obsidian does
  for any unresolved link.
- **A different date format.** In `batch3-dates-links`, open Settings → Daily notes and change
  the date format so it no longer matches the board's `YYYY-MM-DD`. Click Linked.md's
  November 17 date: it opens a new `2026-11-17.md` like any unresolved link, and resolves
  afterwards. The link names that note, not the one Daily Notes would create.
- **Proof.** `snap` the board before and after; finish with clean `errors`.

## Gotchas

- Linked dates navigate; they do not open the inline date picker.
- Markdown dates do not populate the card's date metadata, so its menu still offers Add date.
  That parsing limitation is separate from daily-note navigation.
- Obsidian renders the link inside the date chip. A wikilink date carries the display format as
  its alias, so hovering it shows Obsidian's tooltip with the link's target.
- `.kanban-plugin__item >> a` searches only the first card. Locate a date's link by its card
  title (`.kanban-plugin__item::Wiki missing >> a.internal-link`) or its `data-href`.
