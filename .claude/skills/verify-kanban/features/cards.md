# Cards

Users add cards to a lane, edit a card's text in place, and remove cards by deleting or archiving
them. Every change is written back to the board's markdown file as a `- [ ]` list item under the
lane's `##` heading.

## Sub-features

- `card-link-navigation` reveals and outlines the card reached by a copied block link (#754).
- `card-add` adds a card at the bottom of a lane from the lane's `+ Add a card` button.
- `card-add-blank` ignores a submission that is only whitespace.
- `card-edit` edits a card in place by double-clicking it.
- `card-duplicate-link` duplicates a card without sharing its block ID or copied link.
- `card-html-roundtrip` preserves literal `<br>` in table cells, ordinary text and inline code when
  creating, editing, saving and reopening a card (#1024).
- `card-delete` removes a card from the card menu.
- `card-archive` moves a card under `## Archive` from the card menu.
- `card-archive-completed` archives every checked card from the board header.
- `card-archive-order` adds cards to the end of the archive from every archive action, so
  "Maximum number of archived cards" trims the oldest (#1243).

## How to get to it (user POV)

- `+ Add a card` at the bottom of each lane.
- Double-click a card's text to edit it.
- The `⋯` (`More options`) button on a card opens `Edit card`, `Duplicate card`, `Archive card`,
  `Delete card`, `Move to list` and other actions.
- The board header's `Archive completed cards` button, or the palette command
  `Kanban: Archive completed cards in active board`.

## Driving it with kv.mjs

Preconditions:

- Baseline board showing; `$K doctor` all PASS.

- **Add.** Open the Todo lane's form. `$K click '.kanban-plugin__lane::Todo >> .kanban-plugin__new-item-button'`.
  Focus moves to an editor (`$K eval 'document.activeElement.className'` contains `cm-content`).
  `$K type 'Verify harness card'` then `$K key Enter`, then `$K key Escape` to close the form.
  `$K outline` lists the card last in Todo and
  `$K file --expect '- [ ] Verify harness card'` succeeds.
- **Blank add.** Open the form again, `$K type '   '`, `$K key Enter`. No new card appears
  in `outline` and the Todo count is unchanged.
- **Edit.** `$K click '.kanban-plugin__item::Verify harness card >> .kanban-plugin__item-title' --double`,
  `$K key Mod+a`, `$K type 'Edited by harness'`, `$K key Enter`.
  `$K file --expect '- [ ] Edited by harness' --absent 'Verify harness card'` succeeds.
- **Delete.** `$K click '.kanban-plugin__item::Plan sprint >> a[aria-label="More options"]'`, then
  `$K click '.menu .menu-item::Delete card'`. There's no confirmation dialog.
  `$K file --absent 'Plan sprint'` succeeds.
- **Archive one.** Open `Ship 2.0.52`'s menu the same way and choose `.menu .menu-item::Archive card`.
  The card leaves the Done lane in `outline`; on disk it now sits under `## Archive`
  (`$K file --expect '## Archive'`, then read the section).
- **Archive completed.** `$K click '.workspace-leaf.mod-active .view-action[aria-label="Archive completed cards"]'`.
  Every `[x]` card moves under `## Archive`.
- **Archive order** (`card-archive-order`, `--fixture archive-order`). On `Board.md`: `card a1`'s
  menu → `Archive card`; Beta's lane `More options` → `Archive cards` →
  `.kanban-plugin__confirm-action-button`; the header's `Archive completed cards`; Delta's lane
  menu → `Archive list` → confirm. The archive must read `card a1`, `card b1`, `card b2`,
  `card c1`, `card d1`, top to bottom. Open `Limit.md` (`max-archive-size` 2) with
  `app.workspace.openLinkText("Limit","",false)`, archive `card a1`, then archive list Beta:
  the archive keeps `card b1` and `card b2`. Before the fix the list actions added to the top,
  so the limit kept `card b2` and `card a1` and dropped a card that had just been archived.
  `Dated.md` has `archive-with-date` on: repeat the first three actions and every archived card
  starts with today's date. Read the file with `app.vault.adapter.read`: `app.vault.read` can
  return a cached copy.
- **Duplicate a linked card (#830).** Start a fresh `$K launch --fixture duplicate-card` run and
  `$K doctor`. `$K snap duplicate-before`. Open `Original linked card`'s `More options` menu,
  then choose `Duplicate card`. The copy is inserted before the original. `$K file` must show
  exactly one `^original-card`, on the original; the copy has no block ID. Double-click the first
  matching card's title, `Mod+a`, type `Copied linked card`, and press `Enter`.
  `$K file --expect '- [ ] Copied linked card'` succeeds. Use `Copy link to card` on the original
  and the copy, reading `navigator.clipboard.readText()` through `$K eval` after each action.
  The original link is `[[Board#^original-card]]`; the copy's link has a different ID, which now
  appears only on the copy in `$K file`. Copy its link again: it stays the same. `$K snap duplicate-after`.
  Before the fix, both cards retained `^original-card` and both links were identical.
- **Duplicate an unlinked card.** In the same fixture, duplicate `Unlinked card` and rename the
  first matching card to `Copied unlinked card`. Neither has a block ID yet. Copy a link from
  each through the card menu; their links and newly saved block IDs must differ.
- **Duplicate persistence.** Open as markdown from the header, then return with the palette's
  `Kanban: Toggle between Kanban and markdown mode`. Copy both linked cards' links again;
  each still uses its own saved ID. Finish with `$K errors`.
- **Proof.** `snap` before and after each step, then `$K errors`.

- **HTML round trip.** Launch with `--fixture parser-roundtrip`. On `Board.md`, double-click the
  `Table roundtrip` card's title, then inspect the editor's source: the cell still contains
  `first<br>second` on one line. Append text to the card and submit with Enter. On disk the entire
  row `| Alpha | first<br>second |` remains on one line. Repeat through the card menu's `Edit card`
  entry. Ordinary text `Ordinary first<br>second` and inline code `` Literal `<br>` `` also survive
  an unrelated card edit unchanged.
- **Create a table.** Add a card with `$K type $'New table\n\n| Name | Detail |\n| --- | --- |\n| Alpha | first<br>second |'`,
  Enter, Escape. `$K file --expect '| Alpha | first<br>second |'` succeeds; inspect both table rows
  in the file, then double-click the new card and verify its editor still contains the literal tag.
  Submit, switch to markdown with the header button and back with the Kanban palette command.
  Both tables still render with two cells in their data row, and a line break inside the second cell.

### Archive limit regression (#695)

With a fresh basic fixture, open Obsidian settings (`key Mod+,`), click
`.vertical-tab-nav-item::Kanban`, and enter `1` in
`.setting-item::Maximum number of archived cards >> input`. Wait for the global
settings file to contain `"max-archive-size": 1`, then close settings with Escape.
Open board settings from `.mod-root .view-action[aria-label="Open board settings"]`,
enter `-1` in the same field, and check that the input has no `error` class. Wait
for `file --expect '"max-archive-size":-1'`, then close the modal. Archive
`Write release notes` and `Plan sprint` through their card menus. Both must remain
under `## Archive` on disk despite the global limit of one. Reopen board settings:
`-1` is still displayed. Repeat with a local limit of `1` and a global limit of
`-1`: after archiving two cards only the newest remains. Capture the input and
saved archive with `snap`; finish with `errors`. To replace an existing number, use
`Home`, `Shift+End`, `Backspace`, then `type`.

- **Copied link navigation** (`card-link-navigation`). Launch `--fixture batch3-dates-links`
  and open Wide.md, with eight lanes of forty cards. Scroll horizontally to Lane 8 and vertically
  to card 40 using the scrollbars or real wheel input. Its More options → Copy link to card
  copies `[[Wide#^far-card]]`. Links.md already holds that link: open it and click the link
  (`$K click '.cm-hmd-internal-link::Wide#^far-card'`; a link on the cursor's line shows as
  source and doesn't follow, which is why the note starts with a line of text). The card is
  visible horizontally and vertically and briefly outlined. Inspect the target rectangle and
  both scroll offsets; opening the link must not edit Wide.md. Snap before and after. Before the
  fix, the board opened at scrollLeft 0 with the target at x=2343, y=1701, outside the window.
- **Tall cards, fresh open.** From Links.md follow `[[Tall#^tall-target]]`: card 22 of a lane of
  thirty four-line cards. Its rectangle must be inside the view's content area (it lands
  centered, y 433 to 520 at 1400×900). When the board scrolled before its cards had their
  heights, the lane scrolled but the card ended up below the fold (y 925 to 1012).
- **Collapsed lane.** Follow `[[Tall#^collapsed-target]]`: its card is in Tall 8, which the
  fixture saves collapsed. The board scrolls to the collapsed lane and outlines it; the lane
  stays collapsed and `$K file Tall.md` still ends its `list-collapse` with `true`. In table
  layout the same link reveals the card's row, in list layout the collapsed lane's bar.
- **Existing view and layouts.** In Tall.md, click the link in `Self jump` (Tall 2). The same
  board scrolls to the target without reopening or losing its lanes. Scroll away and follow it
  again; `Collapsed jump` does the same for the collapsed lane, and `Other board` opens Wide.md
  in the same tab at `^far-card`. Follow the links after switching to table and list layouts
  (scroll the card with the link into view first); each layout reveals its target.
- **Once only.** After following a link, scroll away and switch layout (board → table → list),
  then switch to markdown and back with the palette: the board must stay where it is, with no
  scroll and no outline (`getAnimations()` on the target is empty). Before the fix every such
  remount scrolled to the target and outlined it again. A missing block target
  (`[[Wide#^missing-card]]`) leaves the board usable and produces no page error.
- **Rename.** With a board focused, run `Rename file` from the palette (F2): the tab's title
  becomes editable (`document.activeElement` is `.view-header-title`), and typing a name and
  Enter renames the file with the board still showing its lanes. Before the fix nothing happened.
  Run add-card and within/cross-lane drag journeys afterward, checking each saved mutation.
  Finish with clean `errors`.

## Gotchas

- The fixture hides checkboxes (default setting), so `outline` marks cards with `-` and you can't
  check a card off from the UI without turning on `Show checkboxes` in board settings first.
  Mark completion in the fixture file instead.
- Archived text stays in the file, so `--absent '<title>'` fails after an archive. Assert the
  `## Archive` section.
- Saves are debounced; always use `file --expect` (it polls) rather than a single `file` read.
- The add-card editor stays open after `Enter` for the next card; press `Escape` before clicking
  elsewhere.
