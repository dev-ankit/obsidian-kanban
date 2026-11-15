# New note from card

From a card's menu, users create a new note named after the card. The note opens in a split, and
the card's text is replaced with a link to the note. Embeds, links, tags and (since upstream PR #1222)
date/time syntax are stripped from the filename. The note goes in the board's configured note folder,
falling back to the global setting and then Obsidian's default location (PR #1228). If creation fails,
a notice explains why (PR #1188).

## Sub-features

- `nnfc-plain` makes a note from a plain title, and the card links to it.
- `nnfc-date-trailing` strips a date at the end of the title from the filename; the card links to it.
- `nnfc-date-middle` strips a date in the middle of the title from the filename; the card links to it.
- `nnfc-date-forms` handles every stored date/time form (`@{…}`, `@[[…]]` daily-note link,
  `@[…](…)` markdown link, `@@{…}` time): none reach the filename, all stay on the card.
- `nnfc-error` shows a notice when the note can't be created (length hint only for over-long names)
  and logs the error.
- `nnfc-folder` puts the note in the board's `new-note-folder`.
- `nnfc-folder-missing` falls back to Obsidian's default location when the board's folder doesn't
  exist, and says so in a notice.
- `nnfc-folder-global` falls back to the plugin's global note folder when the board's is missing.
  Needs the global setting turned on in plugin settings first; not yet driven.

## How to get to it (user POV)

- Card `⋯` (`More options`) → `New note from card`.

## Driving it with kv.mjs

Preconditions:

- `nnfc-plain`, `nnfc-date-*`: baseline `basic` board; `$K ls` shows only `Board.md` and `Notes/Spec.md`.
- `nnfc-folder*`: `$K launch --fixture note-folder`. `Board.md` has `new-note-folder: Notes`
  (folder exists). `Board-missing.md` has `new-note-folder: Gone` (no such folder). The global
  setting is unset and Obsidian's new-file location is the vault root.

- **Plain.** `$K click '.kanban-plugin__item::Write release notes >> a[aria-label="More options"]'`,
  `$K click '.menu .menu-item::New note from card'`. `$K ls` lists `Write release notes.md`;
  `$K eval 'app.workspace.getActiveFile().path'` is that note; and
  `$K file --expect '- [ ] [[Write release notes]]'` succeeds.
- **Close the split.** `$K click '.workspace-tab-header::Write release notes >> .workspace-tab-header-inner-close-button'`,
  then if no board is visible, `$K click '.nav-file-title[data-path="Board.md"]'`.
- **Date in the middle.** Same menu on `.kanban-plugin__item::Buy milk`. `$K ls` lists
  `Buy milk today.md` (no `@{…}` in the name), and
  `$K file --expect '- [ ] [[Buy milk today]] @{2026-01-15}'` succeeds.
- **Every date form** (`review` fixture). Run the same menu on `Pay rent`, `Buy milk`, `Call mom`,
  `Pay taxes` and `Standup`, closing the note split after each. `$K ls` lists `Pay rent.md`,
  `Buy milk today.md`, `Call mom about trip.md`, `Pay taxes.md`, `Standup notes.md`, and the cards read
  `[[Pay rent]] @{2026-02-01}`, `[[Buy milk today]] @{2026-01-15}`, `[[Call mom about trip]] @[[2026-03-01]]`,
  `[[Pay taxes]] @[2026-04-15](2026-04-15)`, `[[Standup notes]] @{2026-05-01} @@{09:30}`.
- **Creation fails** (`review`). Same menu on `.kanban-plugin__item::Long title filler`. A notice says
  `The note could not be created. Try reducing the length…`, no file is created, and `$K errors` shows
  the logged `ENAMETOOLONG` (expected; it's the error being reported, not a crash).
- **Configured folder** (`note-folder`). Same menu on `.kanban-plugin__item::Into notes folder`.
  `$K ls` lists `Notes/Into notes folder.md`, and `$K file --expect '- [ ] [[Into notes folder]]'` succeeds.
- **Missing folder** (`note-folder`). Close the note split, `$K click '.nav-file-title[data-path="Board-missing.md"]'`,
  then the same menu on `.kanban-plugin__item::Folder is missing`. A notice says
  `Note folder "Gone" was not found, so the note was created in "/".`; `$K ls` lists `Folder is missing.md`
  at the vault root; `$K file Board-missing.md --expect '- [ ] [[Folder is missing]]'` succeeds;
  `$K errors` is empty.
- **Proof.** `snap` with the card menu open, again after the note opens (use `--file Board-missing.md`
  for that board), plus the `ls` and file checks above.

## Gotchas

- 2.0.52 failed `nnfc-date-middle` (card never linked) and leaked daily-note dates into filenames;
  fixed in bda0c2f. Keep both journeys in every run; they regress easily.
- The date-form cards (`Pay rent`, `Call mom`, `Pay taxes`, `Standup`) exist only in the `review`
  fixture; `basic` has just `Buy milk`.
- Obsidian writes the shortest unambiguous link, so a note in `Notes/` still links as
  `[[Into notes folder]]`. Check the folder with `ls`, not with the link text.
- The note opens in a split and makes the board narrow; close the note tab before driving more
  cards. Don't use `Mod+w`.
- Running a journey twice in one run collides with the existing note file. Relaunch instead.
