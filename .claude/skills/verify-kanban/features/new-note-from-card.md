# New note from card

From a card's menu, users create a new note named after the card. The note opens in a split, and
the card's title becomes a link to the note. First-line tags, inline fields, dates/times, links and
embeds stay outside that link with their original syntax. Filenames use the existing first-line
sanitization: dates/times are removed, links and embeds contribute their text, tags lose their
hash, illegal characters become spaces, and whitespace is condensed. Inline fields stay on the
card when Dataview is enabled, matching board parsing. The note goes in the board's configured
note folder,
falling back to the global setting and then Obsidian's default location (PR #1228). If creation fails,
a notice explains why (PR #1188).

## Sub-features

- `nnfc-links` retains first-line URLs and link targets when creating a note (#632).
- `nnfc-inline-fields` preserves wrapped inline metadata when Dataview is enabled (#848).
- `nnfc-tags` keeps first-line tags on the card and preserves their de-hashed filename text (#1016).
- `nnfc-code-url` does not preserve a URL inside inline code as a separate link.
- `nnfc-multiline` keeps the original newline or legacy `<br>` and the rest of the card intact.
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
  Needs the global setting turned on in plugin settings first.

## How to get to it (user POV)

- Card `⋯` (`More options`) → `New note from card`.

## Driving it with kv.mjs

Preconditions:

- `nnfc-plain`, `nnfc-date-*`: baseline `basic` board; `$K ls` shows only `Board.md` and `Notes/Spec.md`.
- `nnfc-folder*`: `$K launch --fixture note-folder`. `Board.md` has `new-note-folder: Notes`
  (folder exists). `Board-missing.md` has `new-note-folder: Gone` (no such folder). The global
  setting is unset and Obsidian's new-file location is the vault root.

- **Dataview precondition.** For the inline-field expectations below, install and enable the real
  Dataview plugin in the scratch vault only. Copy its release files into the fixture's temporary
  `.obsidian/plugins/dataview` directory before launch, remove that temporary directory after
  launch, then enable Dataview from Obsidian Settings → Community plugins. Verify it appears
  in `app.plugins.enabledPlugins` before creating notes. Also run without Dataview: filenames
  are identical, while field wrappers are treated as ordinary text, as on the board.
- **Links and combined content** (`note-content`). Create notes from `Hello`, `Mixed`, `Nested`,
  `Bare`, and `Local`, closing the split after each. Expect `[[Hello world]] [world](https://hello.world)`;
  `[[Mixed work nested [owner Alice] site]] #work/nested [owner:: [[Alice]]] @{2026-05-01} @@{09:30} [site](https://example.com/#part)`
  with the original second line unchanged; `[[Nested reference ) research]] [reference](<https://example.com/a_(b)>) #research`;
  `[[Bare https example.com section]] https://example.com/#section`; and
  `[[Local Notes Spec image]] [[Notes/Spec]] ![[image.png]]`. Check the actual filenames with `ls`.
  Also create a note from `Parenthesized (owner:: Alice) #work` and expect
  `[[Parenthesized (owner Alice) work]] (owner:: Alice) #work`. A tag-only card must become
  `[[onlytag]] #onlytag`. No duplicate fragments should appear for nested fields,
  links containing URL fragments, or dates that link to daily notes.
- **Inline fields** (`note-content`). Create notes from `my description #mytag [created:: 2023-10-22]`
  and `other description [created:: 2023-10-22] #mytag`, closing each note split. Expect notes
  `my description mytag [created 2023-10-22].md` and
  `other description [created 2023-10-22] mytag.md`, and cards
  `[[my description mytag [created 2023-10-22]]] #mytag [created:: 2023-10-22]` and
  `[[other description [created 2023-10-22] mytag]] [created:: 2023-10-22] #mytag`. Keep both field/tag orderings.
- **Tags** (`note-content`). Use the card menu on `Task 1 #Tag1`. The note is `Task 1 Tag1.md`
  and `$K file --expect '- [ ] [[Task 1 Tag1]] #Tag1'` succeeds. The tag still renders on the card.
- **Code URL and image** (`note-content`). Create a note from `Code URL`. Expect
  ``[[Code URL `https example.com code` code]] #code``; the URL inside code is not appended.
  Create one from `Image`: expect `[[Image logo media]] ![logo](https://example.com/logo.png) #media`.
  The image syntax stays intact.
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
