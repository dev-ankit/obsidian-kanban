# Cards

Users add cards to a lane, edit a card's text in place, and remove cards by deleting or archiving
them. Every change is written back to the board's markdown file as a `- [ ]` list item under the
lane's `##` heading.

## Sub-features

- `card-add` adds a card at the bottom of a lane from the lane's `+ Add a card` button.
- `card-add-blank` ignores a submission that is only whitespace.
- `card-edit` edits a card in place by double-clicking it.
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
- **Proof.** `snap` before and after each step, then `$K errors`.

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

## Gotchas

- The fixture hides checkboxes (default setting), so `outline` marks cards with `-` and you can't
  check a card off from the UI without turning on `Show checkboxes` in board settings first.
  Mark completion in the fixture file instead.
- Archived text stays in the file, so `--absent '<title>'` fails after an archive. Assert the
  `## Archive` section.
- Saves are debounced; always use `file --expect` (it polls) rather than a single `file` read.
- The add-card editor stays open after `Enter` for the next card; press `Escape` before clicking
  elsewhere.
