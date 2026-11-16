# Cards

Users add cards to a lane, edit a card's text in place, and remove cards by deleting or archiving
them. Every change is written back to the board's markdown file as a `- [ ]` list item under the
lane's `##` heading.

## Sub-features

- `card-add` adds a card at the bottom of a lane from the lane's `+ Add a card` button.
- `card-add-blank` ignores a submission that is only whitespace.
- `card-edit` edits a card in place by double-clicking it.
- `card-duplicate-link` duplicates a card without sharing its block ID or copied link.
- `card-delete` removes a card from the card menu.
- `card-archive` moves a card under `## Archive` from the card menu.
- `card-archive-completed` archives every checked card from the board header.

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

## Gotchas

- The fixture hides checkboxes (default setting), so `outline` marks cards with `-` and you can't
  check a card off from the UI without turning on `Show checkboxes` in board settings first.
  Mark completion in the fixture file instead.
- Archived text stays in the file, so `--absent '<title>'` fails after an archive. Assert the
  `## Archive` section.
- Saves are debounced; always use `file --expect` (it polls) rather than a single `file` read.
- The add-card editor stays open after `Enter` for the next card; press `Escape` before clicking
  elsewhere.
